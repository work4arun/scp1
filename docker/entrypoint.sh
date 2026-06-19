#!/bin/sh
# Entrypoint for the SCP app container.
# 1. Wait for database readiness (using Prisma, which reads DATABASE_URL directly).
# 2. Create databases if they don't exist.
# 3. Apply Prisma schema, optionally seed.
# 4. exec the CMD (npm start).

set -e

echo "[scp] Waiting for database..."
i=0
until echo 'SELECT 1' | npx --no-install prisma db execute --stdin >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -gt 60 ]; then
    echo "[scp] Database did not become reachable after 2 min. Continuing anyway..."
    break
  fi
  sleep 2
done
echo "[scp] Database is reachable."

# ── Create databases (idempotent — harmless if they exist) ──
echo "[scp] Ensuring 'scp_db' database exists..."
npx --no-install prisma db execute --stdin >/dev/null 2>&1 <<'SQL' || true
CREATE DATABASE scp_db;
SQL

# ── Apply Prisma schema (SAFE — never drop data) ──
echo "[scp] Applying Prisma schema..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  # Use plain db push WITHOUT --accept-data-loss.
  # If the schema drifted too far, Prisma will ERROR (not silently drop tables).
  # Fix the schema mismatch manually rather than nuking production data.
  npx prisma db push
fi

# ── Seed (only if database is empty) ──
if [ "${SCP_SEED:-0}" = "1" ]; then
  echo "[scp] Checking if database is already seeded..."
  SEEDED=$(echo "SELECT COUNT(*) FROM \"User\";" | npx --no-install prisma db execute --stdin 2>/dev/null | tail -1 | tr -d ' ')
  if [ "${SEEDED:-0}" = "0" ]; then
    echo "[scp] Database is empty — running seed..."
    npm run db:seed || echo "[scp] Seed step finished with non-zero exit; continuing."
  else
    echo "[scp] Database already has ${SEEDED} user(s) — skipping seed to preserve data."
  fi
else
  echo "[scp] SCP_SEED=0 -> skipping seed."
fi

echo "[scp] Starting Next.js..."
exec "$@"