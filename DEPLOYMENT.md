# Strategic Control Portal — Deployment Procedure (Fresh Install)

**Target URL:** `https://rathinamtechnicalcampus.com/scp`
**Server OS:** AlmaLinux 9.7 (KVM, shared with other applications)
**Application:** `strategic-control-portal` (Next.js 14 + Prisma + PostgreSQL + NextAuth v5)
**DB:** PostgreSQL 17 from PGDG, isolated database for this app
**Web:** Nginx reverse proxy on `/scp`, Let's Encrypt HTTPS

> Run blocks **top to bottom, in order**. Each section ends with a verification step — don't move on until it passes. Replace placeholders (`PLACEHOLDER`) wherever they appear.

---

## Step 0 — Reset PostgreSQL (clean slate)

You have PG 16 (broken) and PG 17 (running) both installed. Wipe both and start fresh on PG 17 alone.

```bash
# Stop everything Postgres-related
sudo systemctl stop postgresql-16 postgresql-17 2>/dev/null
sudo systemctl disable postgresql-16 postgresql-17 2>/dev/null
sudo systemctl reset-failed postgresql-16 postgresql-17 2>/dev/null

# Remove both versions
sudo dnf -y remove 'postgresql16*' 'postgresql17*'

# Remove data directories (THIS DELETES ALL DB DATA — fine here since you're starting fresh)
sudo rm -rf /var/lib/pgsql/16 /var/lib/pgsql/17

# Make sure nothing is on port 5432
sudo ss -tlnp | grep 5432    # expect: no output
```

---

## Step 1 — Install Postgres 17 only

```bash
# PGDG repo (already installed, but harmless to re-run)
sudo dnf -y install https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
sudo dnf -qy module disable postgresql

# Install PG 17 server + client + contrib
sudo dnf -y install postgresql17 postgresql17-server postgresql17-contrib

# Initialize the cluster
sudo /usr/pgsql-17/bin/postgresql-17-setup initdb

# Start and enable
sudo systemctl enable --now postgresql-17

# Verify
sudo systemctl status postgresql-17        # expect: active (running)
sudo ss -tlnp | grep 5432                  # expect: 127.0.0.1:5432 LISTEN
```

If status is not `active (running)`, stop here and run `sudo journalctl -u postgresql-17 -e --no-pager | tail -40` and share the output.

---

## Step 2 — Create the app's isolated database

This block creates a URL-safe password, the `scp_user` role, the `scp` database, and walls them off from everything else on the cluster.

```bash
# Generate a URL-safe password (no @ : / | ! etc) and save it
NEWPASS=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
echo "DB password: $NEWPASS"
echo "DB password: $NEWPASS" | sudo tee /root/scp-db-password.txt
sudo chmod 600 /root/scp-db-password.txt

# Create user, DB, and lock down isolation
sudo -u postgres /usr/pgsql-17/bin/psql <<SQL
CREATE USER scp_user WITH PASSWORD '$NEWPASS' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE DATABASE scp OWNER scp_user;
ALTER DATABASE scp OWNER TO scp_user;
ALTER USER scp_user CONNECTION LIMIT 30;
ALTER DATABASE scp CONNECTION LIMIT 50;
REVOKE CONNECT ON DATABASE scp FROM PUBLIC;
GRANT  CONNECT ON DATABASE scp TO scp_user;
SQL

# Lock down public schema inside scp
sudo -u postgres /usr/pgsql-17/bin/psql -d scp <<'SQL'
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT  ALL ON SCHEMA public TO scp_user;
ALTER  SCHEMA public OWNER TO scp_user;
SQL

# Lock scp_user out of every other DB on this shared cluster
sudo -u postgres /usr/pgsql-17/bin/psql <<'SQL'
DO $$
DECLARE db record;
BEGIN
  FOR db IN SELECT datname FROM pg_database
            WHERE datname NOT IN ('scp','template0','template1')
  LOOP
    EXECUTE format('REVOKE ALL ON DATABASE %I FROM scp_user', db.datname);
    EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM scp_user', db.datname);
  END LOOP;
END $$;
SQL

# Verify scp_user can connect to scp
psql "postgresql://scp_user:$NEWPASS@127.0.0.1:5432/scp" -c '\conninfo'
```

The last command should print:

```
You are connected to database "scp" as user "scp_user" on host "127.0.0.1" at port "5432".
```

Keep `$NEWPASS` available in your shell for Step 6, or read it back later from `/root/scp-db-password.txt`.

---

## Step 3 — Install Node.js 20 LTS and PM2

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf -y install nodejs gcc-c++ make
node -v && npm -v        # node v20.x.x

sudo npm install -g pm2
pm2 -v
```

---

## Step 4 — Install Nginx and open the firewall

```bash
sudo dnf -y install nginx
sudo systemctl enable --now nginx
sudo systemctl status nginx           # active (running)

# Firewall (firewalld is default on AlmaLinux)
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
sudo firewall-cmd --list-services     # expect: http https + whatever else
```

---

## Step 5 — SELinux booleans (required for Nginx → Node proxy)

```bash
getenforce                                       # expect: Enforcing
sudo dnf -y install policycoreutils-python-utils
sudo setsebool -P httpd_can_network_connect 1
sudo setsebool -P httpd_can_network_connect_db 1
```

Without this, Nginx will return `502 Bad Gateway` and `/var/log/nginx/error.log` will show `(13: Permission denied) while connecting to upstream`.

---

## Step 6 — Deploy the application code

### 6.1 Place the code

```bash
sudo mkdir -p /var/www/scp
sudo chown -R $USER:$USER /var/www/scp
cd /var/www/scp

# Option A: clone from Git
git clone <your-git-url> .

# Option B: upload from your laptop
#   scp -r ./strategic-control-portal user@server:/var/www/scp/
```

After this, `package.json` should be at `/var/www/scp/strategic-control-portal/package.json`.

### 6.2 Create production `.env`

```bash
cd /var/www/scp/strategic-control-portal
cp .env.example .env
```

Open `.env` and set these values (the password is in `/root/scp-db-password.txt` if you need to recover it):

```env
DATABASE_URL="postgresql://scp_user:THE_PASSWORD_FROM_STEP_2@127.0.0.1:5432/scp?schema=public"

AUTH_SECRET="GENERATE_WITH_openssl_rand_base64_32"
NEXTAUTH_URL="https://rathinamtechnicalcampus.com/scp"

BASE_PATH="/scp"

SEED_SUPERADMIN_EMAIL="sadmin@rathinam.in"
SEED_SUPERADMIN_PASSWORD="ChangeMe@123"
SEED_CBO_EMAIL="cbo@rathinam.in"
SEED_CBO_PASSWORD="ChangeMe@123"
SEED_SM_EMAIL="sm@rathinam.in"
SEED_SM_PASSWORD="ChangeMe@123"
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Lock the file:

```bash
chmod 600 .env
```

### 6.3 Build

```bash
cd /var/www/scp/strategic-control-portal
npm ci
npx prisma generate
npx prisma db push           # creates tables in the scp database
npm run db:seed              # creates Super Admin / CBO / SM accounts
npm run build                # builds Next.js with basePath=/scp baked in
```

If `npm run build` runs out of memory:

```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

### 6.4 Run under PM2

```bash
cat > /var/www/scp/strategic-control-portal/ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: "scp",
    cwd: "/var/www/scp/strategic-control-portal",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3001 -H 127.0.0.1",
    instances: 1,
    exec_mode: "fork",
    env: { NODE_ENV: "production" },
    max_memory_restart: "512M",
  }],
};
EOF

cd /var/www/scp/strategic-control-portal
pm2 start ecosystem.config.js
pm2 save

# Boot persistence — run this, then run the EXACT command pm2 prints back
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
pm2 save
```

Verify locally:

```bash
curl -I http://127.0.0.1:3001/scp
# Expect: HTTP/1.1 200 or 307 (redirect to /scp/login)
pm2 status
pm2 logs scp --lines 30
```

---

## Step 7 — Nginx reverse proxy on `/scp`

Create the server block (AlmaLinux uses `/etc/nginx/conf.d/`, no sites-available/sites-enabled):

```bash
sudo tee /etc/nginx/conf.d/rathinamtechnicalcampus.com.conf > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name rathinamtechnicalcampus.com www.rathinamtechnicalcampus.com;

    # Existing site (leave default if no other site is here yet)
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ =404;
    }

    # Strategic Control Portal — proxied to Next.js on /scp
    location /scp {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Host  $host;

        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";

        proxy_read_timeout 60s;
        client_max_body_size 10m;
    }
}
EOF

sudo nginx -t                          # syntax is ok / test is successful
sudo systemctl reload nginx
```

> **Important:** the `location` is `/scp` (no trailing slash) and `proxy_pass` is `http://127.0.0.1:3001` (no trailing slash, no path). Don't change either — the app was built with `basePath=/scp` and expects to receive the full `/scp/...` path.

> **If another site is already configured for this domain:** don't create this whole file. Open the existing config under `/etc/nginx/conf.d/`, and add **only the `location /scp { ... }` block** inside the existing `server { ... }` block.

Smoke test:

```bash
curl -I http://rathinamtechnicalcampus.com/scp
# Expect 200 or 307. If 502, see Step 5 (SELinux) and Step 6.4 (PM2 status).
```

---

## Step 8 — HTTPS via Let's Encrypt

```bash
sudo dnf -y install certbot python3-certbot-nginx
sudo certbot --nginx -d rathinamtechnicalcampus.com -d www.rathinamtechnicalcampus.com
```

Choose **Redirect HTTP to HTTPS** when prompted.

Auto-renewal:

```bash
sudo systemctl enable --now certbot-renew.timer
sudo certbot renew --dry-run
```

---

## Step 9 — End-to-end verification

From your laptop:

1. Visit `https://rathinamtechnicalcampus.com/scp` — should redirect to `/scp/login`.
2. Log in with `sadmin@rathinam.in` / `ChangeMe@123`.
3. Open DevTools → Network. Static assets should load from `/scp/_next/...`. If they're at `/_next/...` (no prefix), the build was done without `BASE_PATH=/scp`.
4. Try a server action (create a sub-vertical or priority under `/scp/admin/...`).
5. Log out — should land back on `/scp/login`.
6. Change every seeded password from **Admin → Users** before sharing the URL.

---

## Step 10 — Daily backups

```bash
sudo mkdir -p /var/backups/scp
sudo tee /etc/cron.daily/scp-db-backup > /dev/null <<EOF
#!/bin/bash
set -e
TS=\$(date +%F)
PGPASSWORD='THE_PASSWORD_FROM_STEP_2' /usr/pgsql-17/bin/pg_dump \\
  -U scp_user -h 127.0.0.1 scp | gzip > /var/backups/scp/scp-\$TS.sql.gz
find /var/backups/scp -name 'scp-*.sql.gz' -mtime +14 -delete
EOF
sudo chmod +x /etc/cron.daily/scp-db-backup

# Test it
sudo /etc/cron.daily/scp-db-backup
ls -lh /var/backups/scp
```

Restore:

```bash
gunzip -c /var/backups/scp/scp-YYYY-MM-DD.sql.gz | psql -U scp_user -h 127.0.0.1 scp
```

---

## Updating the app later

```bash
cd /var/www/scp/strategic-control-portal
git pull
npm ci
npx prisma migrate deploy   # or: npx prisma db push
npm run build
pm2 reload scp
pm2 logs scp --lines 100
```

Roll back:

```bash
git reset --hard <previous-commit>
npm ci && npm run build
pm2 reload scp
```

---

## Troubleshooting cheatsheet

| Symptom | Cause | Fix |
|---|---|---|
| `502 Bad Gateway`, error log shows `(13: Permission denied)` | SELinux | `sudo setsebool -P httpd_can_network_connect 1` |
| `502 Bad Gateway`, no SELinux denial | Node not running on `127.0.0.1:3001` | `pm2 status`, `pm2 logs scp` |
| CSS/JS 404 under `/scp/_next/...` | App built without `BASE_PATH=/scp` | Check `.env`, `npm run build && pm2 reload scp` |
| Login redirects to `localhost:3000` | `NEXTAUTH_URL` wrong | Set to `https://rathinamtechnicalcampus.com/scp`, rebuild, reload |
| `password authentication failed for user "scp_user"` | Wrong password in `DATABASE_URL` | Reset: `ALTER USER scp_user WITH PASSWORD '...'` |
| `database "scp" does not exist` | Step 2 skipped/failed | Re-run Step 2 |
| Prisma errors `Can't reach database server` | Postgres not running | `sudo systemctl status postgresql-17` |

Useful commands:

```bash
pm2 logs scp --lines 200
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u postgresql-17 -e
sudo journalctl -u nginx -e
sudo ausearch -m AVC -ts recent      # recent SELinux denials
sudo nginx -t && sudo systemctl reload nginx
```
