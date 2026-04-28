#!/usr/bin/env bash
# One-shot setup for the Strategic Control Portal.
# Usage:  ./setup.sh

set -e

cd "$(dirname "$0")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

say() { echo -e "${GREEN}▸${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
fail() { echo -e "${RED}✖${NC} $1"; exit 1; }

# ─── 1. Check prerequisites ─────────────────────────────────────
say "Checking Node.js…"
if ! command -v node >/dev/null; then fail "Node.js not found. Install Node 18.18+ from https://nodejs.org"; fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then fail "Node $NODE_MAJOR is too old. Need 18.18+"; fi
echo "  Node $(node -v) ✓"

say "Checking npm…"
if ! command -v npm >/dev/null; then fail "npm not found"; fi
echo "  npm $(npm -v) ✓"

say "Checking PostgreSQL…"
if ! command -v psql >/dev/null; then
  warn "psql command not found. Make sure Postgres is installed and running."
  warn "On macOS:  brew install postgresql@16 && brew services start postgresql@16"
fi

# ─── 2. .env file ────────────────────────────────────────────────
if [ ! -f .env ]; then
  say "Creating .env from .env.example…"
  cp .env.example .env
fi

# Replace placeholder AUTH_SECRET if still present
if grep -q "replace-with-a-long-random-string" .env; then
  say "Generating a real AUTH_SECRET…"
  SECRET=$(openssl rand -base64 32)
  # Use sed compatibly between mac/linux
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|replace-with-a-long-random-string|$SECRET|g" .env
  else
    sed -i "s|replace-with-a-long-random-string|$SECRET|g" .env
  fi
fi

# Sanity: warn if AUTH_SECRET appears more than once
DUP_COUNT=$(grep -c "^AUTH_SECRET=" .env || true)
if [ "$DUP_COUNT" -gt 1 ]; then
  fail ".env has $DUP_COUNT AUTH_SECRET lines — keep only one."
fi
echo "  .env ✓"

# ─── 3. npm install ──────────────────────────────────────────────
if [ ! -d node_modules ]; then
  say "Installing dependencies (this can take a couple of minutes)…"
  npm install --no-audit --no-fund
fi
echo "  node_modules ✓"

# ─── 4. Prisma client ────────────────────────────────────────────
say "Generating Prisma client…"
npx prisma generate >/dev/null
echo "  Prisma client ✓"

# ─── 5. Database setup ───────────────────────────────────────────
say "Reading DATABASE_URL from .env…"
DB_URL=$(grep -E "^DATABASE_URL=" .env | head -1 | sed -E 's/^DATABASE_URL=//;s/^"//;s/"$//')
if [ -z "$DB_URL" ]; then fail "DATABASE_URL not found in .env"; fi

DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^/?]+)(\?.*)?$|\1|')
DB_USER=$(echo "$DB_URL" | sed -E 's|^postgresql://([^:]+):.*|\1|')

# Try to create DB if it doesn't exist (skip if can't connect to postgres at all)
if command -v psql >/dev/null; then
  say "Ensuring database '$DB_NAME' exists…"
  PG_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  PG_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  if ! PGPASSWORD=$(echo "$DB_URL" | sed -E 's|^postgresql://[^:]+:([^@]+)@.*|\1|') \
      psql -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1; then
    say "Creating database '$DB_NAME'…"
    PGPASSWORD=$(echo "$DB_URL" | sed -E 's|^postgresql://[^:]+:([^@]+)@.*|\1|') \
      psql -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null \
      || warn "Could not auto-create DB. Create it manually: createdb $DB_NAME"
  fi
fi

say "Pushing Prisma schema to database…"
npx prisma db push --skip-generate
echo "  Schema ✓"

say "Seeding database…"
npm run db:seed
echo "  Seed ✓"

# ─── 6. Done ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Start the app:"
echo "    npm run dev"
echo ""
echo "Then open http://localhost:3000 and log in:"
echo "    Super Admin → sadmin@rathinam.in / SuperAdmin@123"
echo "    CBO         → cbo@rathinam.in    / Cbo@123"
echo "    SM          → sm@rathinam.in     / Sm@123"
echo ""
