# Strategic Control Portal — VPS Deployment Guide

**Target:** AlmaLinux 9.7 KVM VPS, Docker-based, served at `https://rathinamtechnicalcampus.com/scp`
**Repo:** https://github.com/work4arun/scp1.git
**Stack detected:** Next.js 14.2.15 (App Router) + TypeScript + PostgreSQL + Prisma + NextAuth v5 + Tailwind/Radix UI

---

## 0. Architecture overview

```
Internet ──► Nginx (host, ports 80/443, SSL via Let's Encrypt)
                │
                └─ location /scp/  ──► reverse_proxy ──► Next.js container (127.0.0.1:3000)
                                                             │
                                                             └─► PostgreSQL container (internal Docker network)
```

Two containers via `docker compose`:
1. `web` — Next.js production server
2. `db` — PostgreSQL 16

Nginx runs **on the host** (not in a container) so it can also serve other sites on the same domain. The app is reverse-proxied with a `/scp` path prefix.

---

## 1. VPS prerequisites (AlmaLinux 9.7)

SSH into the VPS as root or a sudo user.

```bash
# Update the system
sudo dnf update -y

# Essentials
sudo dnf install -y git curl wget vim firewalld policycoreutils-python-utils

# Make sure firewalld is running
sudo systemctl enable --now firewalld

# Open HTTP/HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# Set hostname (optional but recommended)
sudo hostnamectl set-hostname scp.rathinamtechnicalcampus.com
```

### SELinux note
AlmaLinux ships with SELinux enforcing. For Nginx → localhost reverse-proxying you must allow it:

```bash
sudo setsebool -P httpd_can_network_connect 1
```

---

## 2. Install Docker Engine + Compose plugin

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker

# Run docker without sudo (replace 'youruser' with your login)
sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
```

---

## 3. DNS — point the domain at the VPS

In your DNS provider (registrar / Cloudflare / wherever `rathinamtechnicalcampus.com` is hosted) add an **A record**:

| Type | Host                              | Value          | TTL  |
|------|-----------------------------------|----------------|------|
| A    | rathinamtechnicalcampus.com (or @) | <VPS public IP> | 3600 |
| A    | www                               | <VPS public IP> | 3600 |

Wait for propagation, then verify:

```bash
dig +short rathinamtechnicalcampus.com
```

If you're using Cloudflare, set the proxy to **DNS-only (grey cloud)** initially so Let's Encrypt can validate. You can re-enable the proxy afterward.

---

## 4. Clone the repo

```bash
sudo mkdir -p /opt/scp
sudo chown $USER:$USER /opt/scp
cd /opt/scp
git clone https://github.com/work4arun/scp1.git app
cd app
```

All subsequent commands assume you are in `/opt/scp/app`.

---

## 5. Configure Next.js for the `/scp` subpath — REQUIRED

Next.js needs to know it lives under `/scp`, otherwise links, `_next/static` assets, and NextAuth callback URLs will all 404.

Create **`next.config.js`** at the project root:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",        // produces a small self-contained server for Docker
  basePath: "/scp",            // every route is prefixed with /scp
  assetPrefix: "/scp",         // _next/static and other assets prefixed with /scp
  reactStrictMode: true,
  poweredByHeader: false,
};
module.exports = nextConfig;
```

### Code changes also required
Search the codebase for hardcoded paths and update them to the basePath:

```bash
grep -rn 'href="/' src/ --include="*.tsx" --include="*.ts"
grep -rn "router.push('/" src/ --include="*.tsx" --include="*.ts"
```

Two safe patterns:

- **Best:** keep using `<Link href="/login">` etc. — Next.js's `<Link>` component automatically adds `basePath`. Same for `router.push()` from `next/navigation`.
- **Watch out for:** raw `<a href>` tags, fetch calls to `/api/...`, image `src="/..."`. These need the `/scp` prefix manually, OR use `process.env.NEXT_PUBLIC_BASE_PATH` consistently.

The middleware matcher in `src/middleware.ts` is already path-relative, so it should work as-is.

---

## 6. Create the Dockerfile

Save as **`Dockerfile`** in the project root:

```dockerfile
# syntax=docker/dockerfile:1.7

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---------- build ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL only needs to be valid format at build for prisma generate
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
RUN npx prisma generate
RUN npm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001

# standalone output bundles only what's needed
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma engine + schema (needed at runtime for migrations/seed)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Also create **`.dockerignore`**:

```
node_modules
.next
.git
.gitignore
.env
.env.local
.dockerignore
Dockerfile
docker-compose.yml
README.md
DEPLOYMENT_GUIDE.md
**/*.log
```

---

## 7. docker-compose for app + database

Create **`docker-compose.yml`**:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: scp-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: scp
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: scp
    volumes:
      - scp-db-data:/var/lib/postgresql/data
    networks: [scpnet]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U scp -d scp"]
      interval: 5s
      timeout: 5s
      retries: 10

  web:
    build: .
    container_name: scp-web
    restart: unless-stopped
    environment:
      DATABASE_URL: "postgresql://scp:${POSTGRES_PASSWORD}@db:5432/scp?schema=public"
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: "https://rathinamtechnicalcampus.com/scp"
      AUTH_TRUST_HOST: "true"
      NODE_ENV: production
    ports:
      - "127.0.0.1:3000:3000"   # bind to localhost — Nginx on host proxies in
    depends_on:
      db:
        condition: service_healthy
    networks: [scpnet]

volumes:
  scp-db-data:

networks:
  scpnet:
```

Create **`.env`** beside the compose file (NEVER commit this):

```bash
cd /opt/scp/app
cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
NEXTAUTH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
EOF
chmod 600 .env
```

---

## 8. First build & database init

```bash
cd /opt/scp/app

# Build and start
docker compose up -d --build

# Wait until both containers are healthy
docker compose ps

# Push the Prisma schema to the DB (creates tables)
docker compose exec web npx prisma db push

# Seed initial data (creates the SUPER_ADMIN, roles, etc.)
docker compose exec web npx tsx prisma/seed.ts

# Tail logs
docker compose logs -f web
```

If the seed script needs `tsx` at runtime, you may need to add it to runtime deps. If `tsx` is missing in the runner image, alternatively run the seed from the builder stage:

```bash
docker compose run --rm --entrypoint "" web sh -c "cd /app && node -r prisma/seed.js"
# or run it from a one-off node:20 container that mounts the repo
```

Quick smoke test (still bypassing Nginx):

```bash
curl -I http://127.0.0.1:3000/scp
# Should respond 200 / 307 (redirect to /scp/login)
```

---

## 9. Install & configure Nginx on the host

```bash
sudo dnf install -y nginx
sudo systemctl enable --now nginx
```

Create **`/etc/nginx/conf.d/rathinamtechnicalcampus.conf`**:

```nginx
# HTTP — Let's Encrypt webroot + redirect
server {
    listen 80;
    listen [::]:80;
    server_name rathinamtechnicalcampus.com www.rathinamtechnicalcampus.com;

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name rathinamtechnicalcampus.com www.rathinamtechnicalcampus.com;

    # Filled in by certbot in step 10
    # ssl_certificate     /etc/letsencrypt/live/rathinamtechnicalcampus.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/rathinamtechnicalcampus.com/privkey.pem;

    # If you serve other content at the root, put it here. Example placeholder:
    root /var/www/html;
    index index.html;

    # ── Strategic Control Portal at /scp ──
    location /scp {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Host  $host;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 60s;
        proxy_buffering    off;
    }

    client_max_body_size 25m;
}
```

> **Why no rewrite/strip?** Because `next.config.js` has `basePath: "/scp"`, Next.js *expects* `/scp` in the URL. Do **not** strip the prefix.

```bash
sudo mkdir -p /var/www/letsencrypt
sudo nginx -t
sudo systemctl reload nginx
```

---

## 10. SSL with Let's Encrypt (certbot)

```bash
sudo dnf install -y epel-release
sudo dnf install -y certbot python3-certbot-nginx

# Issue certificate using webroot (works while Nginx is running)
sudo certbot --nginx \
  -d rathinamtechnicalcampus.com \
  -d www.rathinamtechnicalcampus.com \
  --agree-tos -m tx2arun@gmail.com --no-eff-email --redirect
```

Certbot will edit your Nginx config to enable the SSL block. Verify:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Auto-renew is already wired via `systemctl status certbot-renew.timer`.

---

## 11. Final verification

From your laptop:

```bash
curl -I https://rathinamtechnicalcampus.com/scp
# Expect: HTTP/2 200  (or 307 → /scp/login)
```

Then visit **https://rathinamtechnicalcampus.com/scp** in a browser. Log in with the seeded super-admin credentials (check `prisma/seed.ts` for the email/password).

---

## 12. Day-2 operations

```bash
# View logs
docker compose logs -f web
docker compose logs -f db

# Update to latest code
cd /opt/scp/app
git pull
docker compose up -d --build

# Run a Prisma migration after pulling new schema
docker compose exec web npx prisma migrate deploy

# Backup the database
docker compose exec -T db pg_dump -U scp scp | gzip > /opt/scp/backups/scp-$(date +%F).sql.gz

# Restore
gunzip -c backup.sql.gz | docker compose exec -T db psql -U scp -d scp
```

Add a cron job for backups:

```bash
sudo mkdir -p /opt/scp/backups
( crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/scp/app && /usr/bin/docker compose exec -T db pg_dump -U scp scp | /usr/bin/gzip > /opt/scp/backups/scp-\$(date +\%F).sql.gz" ) | crontab -
```

---

## 13. Troubleshooting checklist

| Symptom | Likely cause | Fix |
|---|---|---|
| 404 on `/scp` | `basePath` not set | Re-check `next.config.js`, rebuild |
| Static assets 404 | `assetPrefix` missing | Set `assetPrefix: "/scp"` and rebuild |
| Login loop / NextAuth errors | `NEXTAUTH_URL` wrong | Must be the **full public** URL `https://.../scp` |
| 502 Bad Gateway from Nginx | Container not listening / SELinux | `docker compose ps`; `setsebool -P httpd_can_network_connect 1` |
| Prisma "Can't reach database" | Wrong `DATABASE_URL` host | Inside compose, hostname is `db`, not `localhost` |
| `prisma generate` fails on Alpine | Missing `openssl` | Already added to Dockerfile, but verify the build log |
| Session not persisting | Cookies blocked because URL mismatch | Make sure browser uses HTTPS and `NEXTAUTH_URL` matches |

---

## 14. Quick command summary (copy-paste runbook)

```bash
# On the VPS
sudo dnf update -y
sudo dnf install -y git curl firewalld policycoreutils-python-utils nginx
sudo systemctl enable --now firewalld nginx
sudo firewall-cmd --permanent --add-service={http,https,ssh}
sudo firewall-cmd --reload
sudo setsebool -P httpd_can_network_connect 1

# Docker
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER && newgrp docker

# App
sudo mkdir -p /opt/scp && sudo chown $USER:$USER /opt/scp
cd /opt/scp
git clone https://github.com/work4arun/scp1.git app
cd app
# … add next.config.js, Dockerfile, docker-compose.yml, .env from sections 5-7 …
docker compose up -d --build
docker compose exec web npx prisma db push
docker compose exec web npx tsx prisma/seed.ts

# Nginx + SSL
sudo cp ../rathinamtechnicalcampus.conf /etc/nginx/conf.d/
sudo dnf install -y epel-release && sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d rathinamtechnicalcampus.com -d www.rathinamtechnicalcampus.com \
  --agree-tos -m tx2arun@gmail.com --no-eff-email --redirect
```

---

## 15. What you still need to do in the code

These are **not optional** — without them the app will break under `/scp`:

1. Add `next.config.js` with `basePath` + `assetPrefix` (section 5).
2. Audit `src/` for hardcoded `/login`, `/api/...`, `/static/...` strings used outside Next.js's `<Link>` or `router.push()`. Most should already be fine since the project uses App Router.
3. Confirm the seed script's default credentials and **change them immediately after first login**.
4. Commit a real `README.md` and `.gitignore` (currently the repo has neither based on the workspace contents).

When all the above is done, https://rathinamtechnicalcampus.com/scp will serve the Strategic Control Portal.
