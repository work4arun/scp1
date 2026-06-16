#!/bin/sh
# Entrypoint for the SCP app container.
# 1. Create the application database if it doesn't exist (Postgres doesn't auto-create from DATABASE_URL).
# 2. Wait until the database is reachable.
# 3. Apply Prisma schema.
# 4. Optionally run the seed (controlled by SCP_SEED=1).
# 5. exec the CMD (npm start).

set -e

# ── Parse DATABASE_URL to extract host, port, user, password, dbname ──
# DATABASE_URL format: postgresql://user:pass@host:port/dbname?params
DB_HOST=$(echo "${DATABASE_URL}" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "${DATABASE_URL}" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_PORT="${DB_PORT:-5432}"
DB_USER=$(echo "${DATABASE_URL}" | sed -n 's|.*://\([^:]*\).*|\1|p')
DB_PASS=$(echo "${DATABASE_URL}" | sed -n 's|.*://[^:]*:\([^@]*\).*|\1|p')
DB_NAME=$(echo "${DATABASE_URL}" | sed -n 's|.*/\([^?]*\).*|\1|p')

export PGPASSWORD="${DB_PASS}"
PSQL_CMD="psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres"

# ── Create database if it doesn't exist ──
echo "[scp] Ensuring database '${DB_NAME}' exists ..."
until ${PSQL_CMD} -c "SELECT 1" > /dev/null 2>&1; do
  echo "[scp] Waiting for Postgres to be reachable ..."
  sleep 2
done
${PSQL_CMD} -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || echo "[scp] Database '${DB_NAME}' already exists."

# ── Wait for the app database specifically ──
echo "[scp] Waiting for database '${DB_NAME}' ..."
i=0
until echo 'SELECT 1' | npx --no-install prisma db execute --stdin >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -gt 30 ]; then
    echo "[scp] Database did not become reachable in time. Checking connection details..."
    echo "[scp] Host: ${DB_HOST} Port: ${DB_PORT} User: ${DB_USER} DB: ${DB_NAME}"
    echo "[scp] Continuing anyway..."
    break
  fi
  sleep 2
done

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