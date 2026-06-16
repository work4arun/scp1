#!/bin/sh
# Entrypoint for the SCP app container.
# 1. Parse DATABASE_URL to extract host, port, user, password, dbname.
# 2. Create the DB user/role if it doesn't exist (needed when reusing a Docker volume).
# 3. Create the application database if it doesn't exist.
# 4. Wait for database readiness, apply Prisma schema, optionally seed.
# 5. exec the CMD (npm start).

set -e

# ── Parse DATABASE_URL ───────────────────────────────────────────────────────
# DATABASE_URL format: postgresql://user:pass@host:port/dbname?params
DB_HOST=$(echo "${DATABASE_URL}" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "${DATABASE_URL}" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_PORT="${DB_PORT:-5432}"
DB_USER=$(echo "${DATABASE_URL}" | sed -n 's|.*://\([^:]*\).*|\1|p')
DB_PASS=$(echo "${DATABASE_URL}" | sed -n 's|.*://[^:]*:\([^@]*\).*|\1|p')
DB_NAME=$(echo "${DATABASE_URL}" | sed -n 's|.*/\([^?]*\).*|\1|p')

export PGPASSWORD="${DB_PASS}"
PSQL="psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres"

echo "[scp] DB target: host=${DB_HOST} port=${DB_PORT} user=${DB_USER} db=${DB_NAME}"

# ── Wait for Postgres to be reachable ────────────────────────────────────────
echo "[scp] Waiting for Postgres to be reachable ..."
until ${PSQL} -c "SELECT 1" > /dev/null 2>&1; do
  echo "[scp]   still waiting ..."
  sleep 2
done
echo "[scp] Postgres is reachable."

# ── Create user/role if it doesn't exist ─────────────────────────────────────
echo "[scp] Ensuring database '${DB_NAME}' exists ..."
${PSQL} -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || echo "[scp] Database '${DB_NAME}' already exists."
echo "[scp] Ensuring database 'listmonk' exists ..."
${PSQL} -c "CREATE DATABASE listmonk;" 2>/dev/null || echo "[scp] Database 'listmonk' already exists."

# ── Wait for the app database specifically ───────────────────────────────────
echo "[scp] Verifying app database '${DB_NAME}' is accessible ..."
i=0
until echo 'SELECT 1' | npx --no-install prisma db execute --stdin >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -gt 30 ]; then
    echo "[scp] Database did not become reachable in time. Continuing anyway..."
    break
  fi
  sleep 2
done

# ── Apply Prisma schema ──────────────────────────────────────────────────────
echo "[scp] Applying Prisma schema..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  npx prisma db push --accept-data-loss
fi

# ── Seed ─────────────────────────────────────────────────────────────────────
if [ "${SCP_SEED:-1}" = "1" ]; then
  echo "[scp] SCP_SEED=1 -> running seed..."
  npm run db:seed || echo "[scp] Seed step finished with non-zero exit; continuing."
else
  echo "[scp] SCP_SEED=0 -> skipping seed."
fi

echo "[scp] Starting Next.js..."
exec "$@"