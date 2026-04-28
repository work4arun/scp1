#!/bin/sh
# Entrypoint for the SCP app container.
# 1. Wait briefly for the DB (compose healthcheck already gates this, this is a belt-and-suspenders retry).
# 2. Apply Prisma migrations (or fall back to `db push` for first-time bring-up).
# 3. Optionally run the seed once (controlled by SCP_SEED=1).
# 4. exec the CMD (npm start).

set -e

echo "[scp] Waiting for database..."
i=0
until echo 'SELECT 1' | npx --no-install prisma db execute --stdin >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -gt 30 ]; then
    echo "[scp] Database did not become reachable in time, continuing anyway." >&2
    break
  fi
  sleep 2
done

echo "[scp] Applying Prisma migrations..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  # No migrations folder yet — sync schema directly. Safe for first bring-up.
  npx prisma db push
fi

if [ "${SCP_SEED:-0}" = "1" ]; then
  echo "[scp] SCP_SEED=1 -> running seed (idempotent)..."
  npm run db:seed || echo "[scp] Seed step finished with non-zero exit; continuing."
else
  echo "[scp] SCP_SEED is not set to 1; skipping seed."
fi

echo "[scp] Starting Next.js..."
exec "$@"
