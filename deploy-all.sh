#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  Strategic Control Portal — All-in-One Deploy Script
# ════════════════════════════════════════════════════════════════════════════
#  Run from ~/scp_project/scp1 on the VPS.
#  It will:
#    1. Install Docker + Git (if missing)
#    2. Pull latest code
#    3. Setup Let's Encrypt SSL (skips if already exists)
#    4. Create .env with fixed credentials + domain URLs
#    5. Build & start ALL containers (db, app, listmonk, nginx)
#    6. Create databases
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
DOMAIN="rtc.systitsoft.in"
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
setup_ssl() {
  local cert_path="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
  if [ -f "${cert_path}" ]; then
    log "SSL certificate already exists for ${DOMAIN}. Skipping certbot."
    return
  fi

  log "Setting up Let's Encrypt SSL for ${DOMAIN}..."
  
  # Stop any containers using port 80 (certbot needs it for standalone verification)
  docker compose down 2>/dev/null || true

  # Install certbot if needed
  if ! command -v certbot >/dev/null 2>&1; then
    case "$OS_ID" in
      ubuntu|debian) sudo apt-get install -y certbot ;;
      amzn|rhel|centos|fedora) sudo dnf install -y certbot ;;
    esac
  fi

  log "Running certbot standalone (this may take a minute)..."
  sudo certbot certonly --standalone -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --non-interactive --agree-tos --email "admin@${DOMAIN}" 2>&1 || {
    warn "Certbot could not obtain a certificate. Ensure port 80 is open and ${DOMAIN} points to this server."
    warn "Skipping SSL. The app will still start without HTTPS."
  }

  if [ -f "${cert_path}" ]; then
    log "SSL certificate obtained successfully for ${DOMAIN}."
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
setup_env() {
  cd "${SCRIPT_DIR}"
  chmod +x docker/entrypoint.sh 2>/dev/null || true

  local cert_exists=false
  [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && cert_exists=true

  local base_url="http://${DOMAIN}"
  if [ "$cert_exists" = true ]; then
    base_url="https://${DOMAIN}"
  fi

  log "Writing .env (base URL: ${base_url})..."
  cat > .env << ENVEOF
# Generated by deploy-all.sh for ${DOMAIN}
POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}

# Connection String
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}?schema=public"

AUTH_SECRET=${AUTH_SECRET}
AUTH_TRUST_HOST=true
NEXTAUTH_URL=${base_url}
SCP_SEED=1
LISTMONK_URL=${base_url}/listmonk
LISTMONK_API_USER=admin
LISTMONK_API_PASSWORD=listmonk
LISTMONK_ADMIN_USER=admin
LISTMONK_ADMIN_PASSWORD=listmonk
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
NEXT_PUBLIC_APP_URL=${base_url}
ENVEOF
  log ".env created successfully. URL: ${base_url}"
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

  log "Starting all containers (app, listmonk, nginx)..."
  docker compose up -d
  sleep 5
}

# ──────────────────────────────────────────────────────────────────────────────
health_check() {
  cd "${SCRIPT_DIR}"

  local check_url="http://localhost/api/health"
  # If SSL cert exists, also try HTTPS (Nginx will serve it)
  if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    check_url="http://localhost/api/health"
  fi

  log "Waiting up to ${HEALTH_TIMEOUT_S}s for app at ${check_url}..."
  local deadline=$(( $(date +%s) + HEALTH_TIMEOUT_S )) ok=0
  while [ "$(date +%s)" -lt "$deadline" ]; do
    if status=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "${check_url}" 2>/dev/null) && [ "$status" = "200" ]; then ok=1; break; fi
    sleep 5
    log "Waiting (HTTP: ${status:-unreachable})..."
  done
  if [ "$ok" = "1" ]; then log "App healthy (200)."; else warn "Health check timed out. Check: docker compose logs -f app"; fi
  sed -i 's/^SCP_SEED=1/SCP_SEED=0/' .env 2>/dev/null || true
}

summary() {
  local url="http://${DOMAIN}"
  if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    url="https://${DOMAIN}"
  fi

  log ""; log "═══ Deployment Complete ═══"
  log "  App:        ${url}"
  log "  Listmonk:   ${url}/listmonk/"
  log "  Logins (seed): superadmin@scp.cloud / cbo@rtc.cloud / sm@scp.cloud (pw: admin123)"
  log "  Logs:       docker compose logs -f app"
  log "  Stop:       docker compose stop"
  log "  Reset:      docker compose down -v && git pull && ./deploy-all.sh"
  log "  SSL renew:  certbot renew is handled automatically. Test: sudo certbot renew --dry-run"
  log ""
}

main() { install_deps; pull_code; setup_ssl; setup_env; build_and_start; health_check; summary; }
main "$@"