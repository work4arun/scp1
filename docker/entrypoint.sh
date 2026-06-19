#!/bin/sh
# ── SCP Entrypoint (Bun runtime) ──
# 1. Wait for database readiness
# 2. Ensure scp_db exists
# 3. Apply Prisma schema (SAFE — rejects destructive changes)
# 4. Optionally seed
# 5. exec the CMD (bun run server.js)
set -e

echo "[scp] Waiting for database..."
i=0
until echo 'SELECT 1' | bunx --bun prisma db execute --stdin >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -gt 60 ]; then
    echo "[scp] Database did not become reachable after 2 min. Continuing anyway..."
    break
  fi
  sleep 2
done
echo "[scp] Database is reachable."

echo "[scp] Ensuring 'scp_db' database exists..."
bunx --bun prisma db execute --stdin >/dev/null 2>&1 <<'SQL' || true
CREATE DATABASE scp_db;
SQL

echo "[scp] Applying Prisma schema..."
bunx --bun prisma db push

if [ "${SCP_SEED:-0}" = "1" ]; then
  echo "[scp] Checking if database is already seeded..."
  SEEDED=$(echo "SELECT COUNT(*) FROM \"User\";" | bunx --bun prisma db execute --stdin 2>/dev/null | tail -1 | tr -d ' ')
  if [ "${SEEDED:-0}" = "0" ]; then
    echo "[scp] Database is empty — running seed..."
    bun run /app/prisma/seed.ts || echo "[scp] Seed step finished with non-zero exit; continuing."
  else
    echo "[scp] Database already has ${SEEDED} user(s) — skipping seed to preserve data."
  fi
else
  echo "[scp] SCP_SEED=0 -> skipping seed."
fi

echo "[scp] Starting Next.js (Bun)..."
exec "$@"