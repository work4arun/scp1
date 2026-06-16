#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  Strategic Control Portal — All-in-One Deploy Script
# ════════════════════════════════════════════════════════════════════════════
#  Run this single script on a fresh Ubuntu / Debian / Amazon Linux VPS.
#  It will:
#    1. Install Docker + Git (if missing)
#    2. Clone the repo
#    3. Generate secrets and create .env
#    4. Build & start ALL containers (db, app, listmonk)
#    5. Create the listmonk database inside the Postgres container
#    6. Seed the app database
#    7. Verify everything is healthy
#
#  Usage:
#    chmod +x deploy-all.sh
#    ./deploy-all.sh
#
#  Environment variables you can set beforehand:
#    PUBLIC_IP         — Your VPS public IP (auto-detected if not set)
#    APP_DIR           — Where to clone the repo  (default: /opt/scp/app)
#    GIT_REPO          — Git repository URL        (default: https://github.com/work4arun/scp1.git)
#    GIT_BRANCH        — Git branch to checkout    (default: main)
# ════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { printf "${GREEN}[setup]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[setup]${NC} %s\n" "$*"; }
fail() { printf "${RED}[setup][ERROR]${NC} %s\n" "$*" >&2; exit 1; }

# ── Configuration ────────────────────────────────────────────────────────────
PUBLIC_IP="${PUBLIC_IP:-}"
APP_DIR="${APP_DIR:-/opt/scp/app}"
GIT_REPO="${GIT_REPO:-https://github.com/work4arun/scp1.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
HEALTH_TIMEOUT_S=120

# ── Detect OS ────────────────────────────────────────────────────────────────
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_ID="${ID}"
else
  OS_ID="unknown"
fi

log "Detected OS: ${OS_ID}"
log "Target directory: ${APP_DIR}"
log "Git repo: ${GIT_REPO} (branch: ${GIT_BRANCH})"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 1 — Install Docker + Git
# ──────────────────────────────────────────────────────────────────────────────
install_deps() {
  if command -v docker >/dev/null 2>&1 && command -v git >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker, Docker Compose, and Git are already installed. Skipping."
    return
  fi

  log "Installing Docker + Git ..."

  case "$OS_ID" in
    ubuntu|debian)
      sudo apt-get update -y
      sudo apt-get install -y ca-certificates curl git
      # Docker
      sudo install -m 0755 -d /etc/apt/keyrings
      sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
      sudo chmod a+r /etc/apt/keyrings/docker.asc
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
      sudo apt-get update -y
      sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      ;;
    amzn|rhel|centos|fedora)
      sudo dnf update -y
      sudo dnf install -y docker git
      sudo systemctl enable --now docker
      # Docker Compose plugin
      sudo mkdir -p /usr/local/lib/docker/cli-plugins/
      sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
      sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
      ;;
    *)
      warn "Unknown OS. Attempting apt-get..."
      sudo apt-get update -y && sudo apt-get install -y docker.io docker-compose-v2 git || fail "Could not install dependencies. Install Docker and Git manually and re-run."
      ;;
  esac

  # Start Docker
  if ! systemctl is-active --quiet docker; then
    sudo systemctl enable --now docker
  fi

  # Add current user to docker group
  if ! groups "$USER" | grep -q docker; then
    sudo usermod -aG docker "$USER" || true
    warn "Added $USER to docker group. You may need to log out and back in for this to take effect."
    warn "If docker commands fail, run: newgrp docker"
  fi

  log "Docker + Git installed."
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 2 — Clone the repo
# ──────────────────────────────────────────────────────────────────────────────
clone_repo() {
  if [ -d "${APP_DIR}/.git" ]; then
    log "Repository already exists at ${APP_DIR}. Pulling latest ..."
    cd "${APP_DIR}"
    git fetch --all --prune
    git checkout "${GIT_BRANCH}"
    git pull --ff-only origin "${GIT_BRANCH}"
    log "Updated to commit: $(git rev-parse --short HEAD)"
  else
    log "Cloning repository ..."
    sudo mkdir -p "$(dirname "${APP_DIR}")"
    sudo chown "$USER":"$USER" "$(dirname "${APP_DIR}")"
    git clone --branch "${GIT_BRANCH}" "${GIT_REPO}" "${APP_DIR}"
    cd "${APP_DIR}"
    log "Cloned to ${APP_DIR}"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 3 — Generate .env
# ──────────────────────────────────────────────────────────────────────────────
setup_env() {
  cd "${APP_DIR}"

  # Copy the deploy docker-compose + Dockerfile into the app root
  if [ -d "scp-deploy" ]; then
    log "Syncing deploy files from scp-deploy/ ..."
    cp -f scp-deploy/Dockerfile          ./Dockerfile
    cp -f scp-deploy/docker-compose.yml  ./docker-compose.yml
    cp -f scp-deploy/.dockerignore       ./.dockerignore
    mkdir -p docker
    cp -f scp-deploy/docker/entrypoint.sh ./docker/entrypoint.sh
    chmod +x ./docker/entrypoint.sh
  else
    fail "scp-deploy/ directory not found in the repo. Cannot continue."
  fi

  # Detect public IP if not set
  if [ -z "${PUBLIC_IP}" ]; then
    PUBLIC_IP=$(curl -s --max-time 5 http://checkip.amazonaws.com 2>/dev/null || curl -s --max-time 5 https://ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    log "Auto-detected public IP: ${PUBLIC_IP}"
  fi

  # Generate secrets
  DB_PASSWORD=$(openssl rand -base64 24 2>/dev/null || head -c 24 /dev/urandom | base64 | tr -d '\n')
  AUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -d '\n')

  log "Creating .env from scp-deploy/.env.example ..."
  cp scp-deploy/.env.example .env

  # Replace placeholders
  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${DB_PASSWORD}|" .env
  sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=${AUTH_SECRET}|" .env
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://${PUBLIC_IP}|" .env
  sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=http://${PUBLIC_IP}|" .env
  sed -i "s|LISTMONK_URL=.*|LISTMONK_URL=http://${PUBLIC_IP}:9000|" .env
  sed -i "s|SCP_SEED=0|SCP_SEED=1|" .env    # Enable seed on first boot

  log ".env created with generated secrets."
  log "App URL: http://${PUBLIC_IP}"
  log "Listmonk URL: http://${PUBLIC_IP}:9000"
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 4 — Build & Start
# ──────────────────────────────────────────────────────────────────────────────
build_and_start() {
  cd "${APP_DIR}"

  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1

  log "Building Docker images (this may take a few minutes on first run) ..."
  docker compose build app 2>&1 | tail -5

  log "Starting all containers (db, app, listmonk) ..."
  docker compose up -d

  log "Containers started. Waiting for Postgres to be healthy ..."
  sleep 5
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 5 — Create listmonk database
# ──────────────────────────────────────────────────────────────────────────────
setup_listmonk_db() {
  cd "${APP_DIR}"
  log "Creating 'listmonk' database inside the Postgres container ..."
  # Try to create; ignore error if already exists
  docker compose exec -T db psql -U scp -d scp -c "CREATE DATABASE listmonk;" 2>/dev/null || log "listmonk database already exists (or will be created by listmonk auto-install)."
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 6 — Wait for health
# ──────────────────────────────────────────────────────────────────────────────
health_check() {
  cd "${APP_DIR}"

  log "Waiting up to ${HEALTH_TIMEOUT_S}s for the app to become healthy ..."
  deadline=$(( $(date +%s) + HEALTH_TIMEOUT_S ))
  health_ok=0

  while [ "$(date +%s)" -lt "$deadline" ]; do
    if status=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost/api/health" 2>/dev/null) && [ "$status" = "200" ]; then
      health_ok=1
      break
    fi
    sleep 5
    log "Waiting ... (HTTP status: ${status:-unreachable})"
  done

  if [ "$health_ok" = "1" ]; then
    log "App is healthy (200 OK)."
  else
    warn "Health check timed out. The app may still be starting."
    warn "Check logs: docker compose logs -f app"
  fi

  # Disable seed after first boot so it doesn't re-run on restart
  sed -i 's/^SCP_SEED=1/SCP_SEED=0/' .env 2>/dev/null || true
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 7 — Summary
# ──────────────────────────────────────────────────────────────────────────────
summary() {
  cd "${APP_DIR}"

  log ""
  log "═══ Deployment Complete ═══"
  log ""
  log "  App:        http://${PUBLIC_IP}"
  log "  Listmonk:   http://${PUBLIC_IP}:9000"
  log ""
  log "  Default logins (from seed):"
  log "    Super Admin:  superadmin@scp.local  / admin123"
  log "    CBO:          cbo@scp.local         / admin123"
  log "    SM:           sm@scp.local          / admin123"
  log ""
  log "  Quick commands (run from ${APP_DIR}):"
  log "    • View logs:      docker compose logs -f app"
  log "    • Restart:        docker compose restart"
  log "    • Stop:           docker compose stop"
  log "    • Full removal:   docker compose down -v && sudo rm -rf $(dirname "${APP_DIR}")"
  log ""
  log "  IMPORTANT: Change default passwords after first login!"
  log "  IMPORTANT: Make sure ports 80 and 9000 are open in your firewall/security group."
  log ""
}

# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────
main() {
  install_deps
  clone_repo
  setup_env
  build_and_start
  setup_listmonk_db
  health_check
  summary
}

main "$@"