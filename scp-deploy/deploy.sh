#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Strategic Control Portal — one-shot deploy script
# ─────────────────────────────────────────────────────────────────────────────
#  Run this on the production server (Amazon Linux 2023 / EC2) to bring the
#  app up to the latest commit. Safe to re-run any time. Handles:
#
#    1. cd into the app directory ( /opt/scp/app  by default )
#    2. git pull the latest source
#    3. Copy / refresh the deploy files (Dockerfile, docker-compose.yml,
#       .dockerignore, docker/entrypoint.sh) from scp-deploy/ into the app
#       root — they must sit next to the source for Docker's COPY . . step.
#    4. Verify the .env file exists (creating it from .env.example on first
#       boot would be unsafe — secrets must be filled in by hand).
#    5. docker compose build  (uses BuildKit cache, fast on rebuilds)
#    6. docker compose up -d  (the entrypoint inside the container then runs
#       prisma migrate deploy / db push, optionally seeds, and starts Next.js)
#    7. Wait for /api/health to return 200 — a quick smoke test that the DB
#       is reachable and the app is serving traffic.
#    8. Print the last 30 log lines for both containers so any failure is
#       visible immediately.
#
#  Usage:
#    ./deploy.sh              # full pull + build + up
#    ./deploy.sh --no-pull    # skip git pull (use already-checked-out code)
#    ./deploy.sh --no-build   # skip docker build (only restart containers)
#    ./deploy.sh --restart    # just restart the stack, no pull/build
#    ./deploy.sh --logs       # tail logs continuously after deploy
#    SCP_APP_DIR=/opt/scp/app ./deploy.sh        # override the path
#    SCP_HEALTH_URL=http://1.2.3.4/api/health ./deploy.sh  # override health URL
#
#  This script is intentionally chatty — every step is announced with a
#  prefixed [deploy] line so you can scroll back and see exactly what happened.
# ─────────────────────────────────────────────────────────────────────────────

set -Eeuo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
# Override any of these via environment variables before invoking the script.
APP_DIR="${SCP_APP_DIR:-/opt/scp/app}"
DEPLOY_SUBDIR_NAME="scp-deploy"          # folder inside the repo holding deploy files
HEALTH_URL="${SCP_HEALTH_URL:-http://localhost/api/health}"
HEALTH_TIMEOUT_S="${SCP_HEALTH_TIMEOUT_S:-90}"   # how long to wait for /api/health
COMPOSE_PROJECT="${SCP_COMPOSE_PROJECT:-scp}"

# ── Flag parsing ─────────────────────────────────────────────────────────────
DO_PULL=1
DO_BUILD=1
DO_UP=1
TAIL_LOGS=0
RESTART_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --no-pull)   DO_PULL=0 ;;
    --no-build)  DO_BUILD=0 ;;
    --restart)   DO_PULL=0; DO_BUILD=0; RESTART_ONLY=1 ;;
    --logs)      TAIL_LOGS=1 ;;
    -h|--help)
      sed -n '2,40p' "$0"
      exit 0 ;;
    *)
      echo "[deploy] Unknown argument: $arg" >&2
      echo "         See ./deploy.sh --help" >&2
      exit 2 ;;
  esac
done

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy][ERROR] %s\n' "$*" >&2; exit 1; }

trap 'fail "deploy aborted on line $LINENO (exit $?)"' ERR

# ── Pre-flight ───────────────────────────────────────────────────────────────
log "Strategic Control Portal — deploy starting at $(date -Iseconds)"
log "Target app directory: $APP_DIR"

# Resolve docker compose command (newer: "docker compose", older: "docker-compose")
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  fail "Neither 'docker compose' nor 'docker-compose' is available on this server."
fi
log "Using compose command: $DC"

[ -d "$APP_DIR" ] || fail "App directory $APP_DIR does not exist. Did you run the first-time setup from DEPLOY.md?"
cd "$APP_DIR"
log "Changed working directory to $(pwd)"

# ── 1. Git pull ──────────────────────────────────────────────────────────────
if [ "$DO_PULL" = "1" ]; then
  if [ -d .git ]; then
    log "Pulling latest source ..."
    git fetch --all --prune
    BRANCH="$(git rev-parse --abbrev-ref HEAD)"
    log "Current branch: $BRANCH"
    # If there are local uncommitted changes, refuse to clobber them.
    if ! git diff --quiet || ! git diff --cached --quiet; then
      fail "Uncommitted changes detected in $APP_DIR. Commit or stash them, or re-run with --no-pull."
    fi
    git pull --ff-only origin "$BRANCH"
    log "Now at commit: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"
  else
    log "Not a git working tree — skipping pull."
  fi
else
  log "Skipping git pull (--no-pull / --restart)."
fi

# ── 2. Refresh the deploy files into the app root ────────────────────────────
# The Dockerfile lives in scp-deploy/ in the repo but Docker's COPY . . expects
# it next to the source. We copy on every deploy so a change to the Dockerfile
# or compose file actually takes effect.
if [ -d "$DEPLOY_SUBDIR_NAME" ]; then
  log "Syncing deploy files from $DEPLOY_SUBDIR_NAME/ into $(pwd) ..."
  cp -f  "$DEPLOY_SUBDIR_NAME/Dockerfile"          ./Dockerfile
  cp -f  "$DEPLOY_SUBDIR_NAME/docker-compose.yml"  ./docker-compose.yml
  cp -f  "$DEPLOY_SUBDIR_NAME/.dockerignore"       ./.dockerignore
  mkdir -p docker
  cp -f  "$DEPLOY_SUBDIR_NAME/docker/entrypoint.sh" ./docker/entrypoint.sh
  chmod +x ./docker/entrypoint.sh
else
  log "No $DEPLOY_SUBDIR_NAME/ folder in repo — assuming deploy files are already in place."
fi

# ── 3. Verify .env exists ────────────────────────────────────────────────────
if [ ! -f .env ]; then
  if [ -f "$DEPLOY_SUBDIR_NAME/.env.example" ]; then
    log "No .env found; copying .env.example -> .env. EDIT IT before continuing."
    cp -n "$DEPLOY_SUBDIR_NAME/.env.example" .env
  fi
  fail ".env is missing or freshly seeded from .env.example. Fill in POSTGRES_PASSWORD, AUTH_SECRET, NEXTAUTH_URL, etc., then re-run."
fi
# Soft check for placeholders left in .env
if grep -Eq '^(POSTGRES_PASSWORD|AUTH_SECRET)=("?(REPLACE_ME|changeme|change-me|replace-with-a-long-random-string)?"?)?$' .env; then
  fail ".env still contains placeholder values for POSTGRES_PASSWORD or AUTH_SECRET. Replace them with real secrets and re-run."
fi
log ".env present and not obviously placeholder. OK."

# ── 4. Build ─────────────────────────────────────────────────────────────────
if [ "$DO_BUILD" = "1" ]; then
  log "Building the app image (this may take a minute on first run, ~seconds on rebuilds) ..."
  $DC -p "$COMPOSE_PROJECT" build app
  log "Build complete."
else
  log "Skipping docker build (--no-build / --restart)."
fi

# ── 5. Up / restart ──────────────────────────────────────────────────────────
if [ "$RESTART_ONLY" = "1" ]; then
  log "Restarting the stack ..."
  $DC -p "$COMPOSE_PROJECT" restart
else
  log "Starting (or restarting) the stack in the background ..."
  $DC -p "$COMPOSE_PROJECT" up -d
fi

# ── 6. Health check ──────────────────────────────────────────────────────────
log "Waiting up to ${HEALTH_TIMEOUT_S}s for $HEALTH_URL to return 200 ..."
deadline=$(( $(date +%s) + HEALTH_TIMEOUT_S ))
health_ok=0
last_status=""
while [ "$(date +%s)" -lt "$deadline" ]; do
  if status=$(curl -fsS -o /tmp/scp-health.json -w '%{http_code}' --max-time 5 "$HEALTH_URL" 2>/dev/null) && [ "$status" = "200" ]; then
    health_ok=1
    break
  fi
  last_status="${status:-unreachable}"
  sleep 3
done

if [ "$health_ok" = "1" ]; then
  log "Health check OK (200). Response:"
  # Pretty-print if jq is available, otherwise dump raw.
  if command -v jq >/dev/null 2>&1; then jq . /tmp/scp-health.json; else cat /tmp/scp-health.json; fi
else
  log "Health check did not pass within ${HEALTH_TIMEOUT_S}s (last status: $last_status). Showing last 60 log lines from both containers:"
  $DC -p "$COMPOSE_PROJECT" logs --no-color --tail 60 db  || true
  $DC -p "$COMPOSE_PROJECT" logs --no-color --tail 60 app || true
  fail "Deploy completed but the app is not responding. Investigate the logs above."
fi

# ── 7. Final summary ─────────────────────────────────────────────────────────
log "Container status:"
$DC -p "$COMPOSE_PROJECT" ps

log "Deploy finished successfully at $(date -Iseconds)."
log "Quick links:"
log "  • Tail app logs:    $DC -p $COMPOSE_PROJECT logs -f app"
log "  • Tail db logs:     $DC -p $COMPOSE_PROJECT logs -f db"
log "  • psql shell:       $DC -p $COMPOSE_PROJECT exec db psql -U scp -d scp"
log "  • Health endpoint:  $HEALTH_URL"

if [ "$TAIL_LOGS" = "1" ]; then
  log "Tailing app logs (Ctrl-C to stop — the app keeps running):"
  exec $DC -p "$COMPOSE_PROJECT" logs -f app
fi
