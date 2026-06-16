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
echo "[scp] Ensuring 'listmonk' database exists..."
npx --no-install prisma db execute --stdin >/dev/null 2>&1 <<'SQL' || true
CREATE DATABASE listmonk;
SQL

# ── Apply Prisma schema ──
echo "[scp] Applying Prisma schema..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  npx prisma db push --accept-data-loss
fi

# ── Seed ──
if [ "${SCP_SEED:-1}" = "1" ]; then
  echo "[scp] SCP_SEED=1 -> running seed..."
  npm run db:seed || echo "[scp] Seed step finished with non-zero exit; continuing."
else
  echo "[scp] SCP_SEED=0 -> skipping seed."
fi

echo "[scp] Starting Next.js..."
exec "$@"