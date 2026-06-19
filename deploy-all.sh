#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  Strategic Control Portal — All-in-One Deploy Script
# ════════════════════════════════════════════════════════════════════════════
#  Run from ~/scp_project/scp1 on the VPS.
#  It will:
#    1. Install Docker + Git (if missing)
#    2. Pull latest code
#    3. Setup Let's Encrypt SSL for ALL domains (skips if certs exist)
#    4. Create .env with fixed credentials + domain URLs
#    5. Build & start ALL containers (db, app, listmonk, stalwart, nginx)
#    6. Create databases (scp_db, listmonk, stalwart)
#    7. Health check
#
#  Usage:  ./deploy-all.sh
# ════════════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { printf "${GREEN}[setup]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[setup]${NC} %s\n" "$*"; }
fail() { printf "${RED}[setup][ERROR]${NC} %s\n" "$*" >&2; exit 1; }

# ── FIXED CREDENTIALS ───────────────────────────────────────────────────────
DB_USER="scp_user1"
DB_PASS="scp_pass_db123"
DB_NAME="scp_db"
AUTH_SECRET="super-secret-key-change-in-production-2025"
APP_DOMAIN="rtc.systitsoft.in"
LISTMONK_DOMAIN="listmonk.systitsoft.in"
MAIL_DOMAIN="mailserver.systitsoft.in"
# ─────────────────────────────────────────────────────────────────────────────

PUBLIC_IP="${PUBLIC_IP:-}"
GIT_BRANCH="${GIT_BRANCH:-main}"
HEALTH_TIMEOUT_S=120

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
log "Script running from: ${SCRIPT_DIR}"

if [ -f /etc/os-release ]; then . /etc/os-release; OS_ID="${ID}"; else OS_ID="unknown"; fi
log "Detected OS: ${OS_ID}"

# ──────────────────────────────────────────────────────────────────────────────
install_deps() {
  if command -v docker >/dev/null 2>&1 && command -v git >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker, Docker Compose, and Git already installed."
    return
  fi
  log "Installing Docker + Git..."
  case "$OS_ID" in
    ubuntu|debian)
      sudo apt-get update -y; sudo apt-get install -y ca-certificates curl git
      sudo install -m 0755 -d /etc/apt/keyrings
      sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc; sudo chmod a+r /etc/apt/keyrings/docker.asc
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
      sudo apt-get update -y; sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      ;;
    amzn|rhel|centos|fedora)
      sudo dnf update -y; sudo dnf install -y docker git; sudo systemctl enable --now docker
      sudo mkdir -p /usr/local/lib/docker/cli-plugins/
      sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
      sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
      ;;
    *) warn "Unknown OS, trying apt-get..."; sudo apt-get update -y && sudo apt-get install -y docker.io docker-compose-v2 git || fail "Install Docker and Git manually." ;;
  esac
  if ! systemctl is-active --quiet docker; then sudo systemctl enable --now docker; fi
  if ! groups "$USER" | grep -q docker; then sudo usermod -aG docker "$USER" || true; warn "Added $USER to docker group. Re-login may be needed."; fi
  log "Docker + Git installed."
}

# ──────────────────────────────────────────────────────────────────────────────
pull_code() {
  cd "${SCRIPT_DIR}"
  log "Pulling latest code (force-resetting any local changes)..."
  git fetch --all --prune
  git checkout "${GIT_BRANCH}"
  git reset --hard "origin/${GIT_BRANCH}"
  log "Now at commit: $(git rev-parse --short HEAD)"
}

# ──────────────────────────────────────────────────────────────────────────────
# Obtain a Let's Encrypt certificate for a domain if not already present.
obtain_cert() {
  local domain="$1"
  local cert_path="/etc/letsencrypt/live/${domain}/fullchain.pem"
  if sudo test -f "${cert_path}"; then
    log "SSL certificate already exists for ${domain}. Skipping."
    return 0
  fi

  log "Obtaining SSL certificate for ${domain}..."

  # Stop containers so port 80 is free for standalone verification
  docker compose down 2>/dev/null || true

  if ! command -v certbot >/dev/null 2>&1; then
    case "$OS_ID" in
      ubuntu|debian) sudo apt-get install -y certbot ;;
      amzn|rhel|centos|fedora) sudo dnf install -y certbot ;;
    esac
  fi

  sudo certbot certonly --standalone -d "${domain}" -d "www.${domain}" \
    --non-interactive --agree-tos --email "admin@${domain}" 2>&1 || {
    warn "Certbot could not obtain a certificate for ${domain}."
    warn "Ensure port 80 is open and the domain points to this server."
    return 1
  }

  if sudo test -f "${cert_path}"; then
    log "SSL certificate obtained for ${domain}."
  fi
}

setup_ssl() {
  obtain_cert "${APP_DOMAIN}"
  obtain_cert "${LISTMONK_DOMAIN}"
  obtain_cert "${MAIL_DOMAIN}"
}

# ──────────────────────────────────────────────────────────────────────────────
setup_env() {
  cd "${SCRIPT_DIR}"
  chmod +x docker/entrypoint.sh 2>/dev/null || true

  # Detect certs (use sudo — letsencrypt/live is root-only)
  local app_cert_exists=false lm_cert_exists=false mail_cert_exists=false
  sudo test -f "/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem" && app_cert_exists=true
  sudo test -f "/etc/letsencrypt/live/${LISTMONK_DOMAIN}/fullchain.pem" && lm_cert_exists=true
  sudo test -f "/etc/letsencrypt/live/${MAIL_DOMAIN}/fullchain.pem" && mail_cert_exists=true

  local base_url="https://${APP_DOMAIN}"
  local lm_url="https://${LISTMONK_DOMAIN}"
  local mail_url="https://${MAIL_DOMAIN}"
  if [ "$app_cert_exists" = false ]; then base_url="http://${APP_DOMAIN}"; fi
  if [ "$lm_cert_exists" = false ]; then lm_url="http://${LISTMONK_DOMAIN}"; fi
  if [ "$mail_cert_exists" = false ]; then mail_url="http://${MAIL_DOMAIN}"; fi

  # Preserve existing SCP_SEED and AUTH_SECRET if .env already exists
  local scp_seed="1"
  local existing_auth_secret="${AUTH_SECRET}"
  if [ -f .env ]; then
    scp_seed=$(grep -oP '^SCP_SEED=\K.*' .env 2>/dev/null || echo "1")
    existing_auth_secret=$(grep -oP '^AUTH_SECRET=\K.*' .env 2>/dev/null || echo "${AUTH_SECRET}")
    log "Existing .env found. Preserving SCP_SEED=${scp_seed} and AUTH_SECRET."
  fi

  log "Writing .env..."
  log "  App URL:         ${base_url}"
  log "  Listmonk URL:    ${lm_url}"
  log "  Mail Server URL: ${mail_url}"

  cat > .env << ENVEOF
# Generated by deploy-all.sh
# App:          ${base_url}
# Listmonk:     ${lm_url}
# Mail Server:  ${mail_url}

POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}?schema=public"

AUTH_SECRET=${existing_auth_secret}
AUTH_TRUST_HOST=true
NEXTAUTH_URL=${base_url}
SCP_SEED=${scp_seed}
LISTMONK_URL=${lm_url}
LISTMONK_API_USER=admin
LISTMONK_API_PASSWORD=listmonk
LISTMONK_ADMIN_USER=admin
LISTMONK_ADMIN_PASSWORD=listmonk
MAIL_SERVER_URL=${mail_url}
SMTP_HOST=stalwart
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
NEXT_PUBLIC_APP_URL=${base_url}
ENVEOF
  log ".env created successfully."
}

# ──────────────────────────────────────────────────────────────────────────────
build_and_start() {
  cd "${SCRIPT_DIR}"
  export DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1

  log "Building Docker images..."
  docker compose build

  log "Starting Postgres first..."
  docker compose up -d db
  log "Waiting for Postgres to be healthy..."
  until docker compose exec -T db psql -U "${DB_USER}" -d postgres -c "SELECT 1" >/dev/null 2>&1; do sleep 2; done

  log "Creating databases..."
  docker compose exec -T db psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true
  docker compose exec -T db psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE listmonk;" 2>/dev/null || true
  docker compose exec -T db psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE stalwart;" 2>/dev/null || true

  log "Starting all containers (app, listmonk, stalwart, nginx)..."
  docker compose up -d --remove-orphans
  sleep 5
}

# ──────────────────────────────────────────────────────────────────────────────
health_check() {
  cd "${SCRIPT_DIR}"
  log "Waiting up to ${HEALTH_TIMEOUT_S}s for app..."
  local deadline=$(( $(date +%s) + HEALTH_TIMEOUT_S )) ok=0
  while [ "$(date +%s)" -lt "$deadline" ]; do
    if status=$(curl -fsS -L -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:3000/api/health" 2>/dev/null) && [ "$status" = "200" ]; then ok=1; break; fi
    sleep 5
    log "Waiting (HTTP: ${status:-unreachable})..."
  done
  if [ "$ok" = "1" ]; then log "App healthy (200)."; else warn "Health check timed out. Check: docker compose logs -f app"; fi
  sed -i 's/^SCP_SEED=1/SCP_SEED=0/' .env 2>/dev/null || true
}

summary() {
  local url="http://${APP_DOMAIN}"
  local lm_url="http://${LISTMONK_DOMAIN}"
  local mail_url="http://${MAIL_DOMAIN}"
  if sudo test -f "/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem"; then
    url="https://${APP_DOMAIN}"
    lm_url="https://${LISTMONK_DOMAIN}"
    mail_url="https://${MAIL_DOMAIN}"
  fi

  log ""; log "═══ Deployment Complete ═══"
  log "  App:          ${url}"
  log "  Listmonk:     ${lm_url}"
  log "  Mail Server:  ${mail_url}"
  log "  Logins (seed): superadmin@scp.cloud / cbo@rtc.cloud / sm@scp.cloud (pw: admin123)"
  log "  Logs:         docker compose logs -f app"
  log "  Stop:         docker compose stop"
  log "  Reset:        docker compose down && docker compose up -d --build  # (keeps data)"
  log "  Full wipe:    docker compose down -v   # ⚠️ DELETES ALL DATA — only for fresh start"
  log "  SSL renew:    certbot renew --dry-run (auto-renews via cron/systemd timer)"
  log "  ⚠️  SCP_SEED auto-disabled after first deploy. Run 'SCP_SEED=1 docker compose up -d app' to reseed."
  log ""
}

main() { install_deps; pull_code; setup_ssl; setup_env; build_and_start; health_check; summary; }
main "$@"