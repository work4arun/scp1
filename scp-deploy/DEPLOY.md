# Strategic Control Portal — Docker Deployment on AlmaLinux 9

Target URL: `https://rathinamtechnicalcampus.com/scp`

## Why this design

The server is shared with other apps that already use PostgreSQL. To guarantee that **this app cannot affect, and cannot be affected by, any other Postgres on this server — now or in the future** — everything for SCP runs inside Docker:

- A dedicated **Postgres 16 container** with its own data volume. It does **not** publish any host port. The host's existing Postgres on `5432` is untouched.
- A dedicated **Next.js container** bound only to `127.0.0.1:3000`. The public traffic enters via the host's existing Nginx, which reverse-proxies `/scp/` to the container.
- A dedicated **Docker network** (`scp_net`). The two containers talk to each other on this private network — nothing else on the host can reach the database.

To remove the entire app cleanly later: `docker compose down -v` (and delete the folder). Nothing else on the server is touched.

---

## Prerequisites (one-time, on the server)

> Skip any step whose tool you already have.

```bash
# 1. Install Docker Engine + the compose plugin on AlmaLinux 9
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker

# 2. (optional) let your user run docker without sudo
sudo usermod -aG docker "$USER"
newgrp docker     # or log out/in

# 3. Open the firewall ONLY for 80/443 if not already open. Do NOT open 3000 or 5432.
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## Layout on the server

Pick a stable directory. Suggested:

```
/opt/scp/
├── app/                  <-- the source code from https://github.com/work4arun/scp
└── deploy/               <-- the files from this scp-deploy folder
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .env              <-- you create this from .env.example
    ├── .dockerignore
    ├── docker/
    │   └── entrypoint.sh
    └── nginx/
        └── scp.conf
```

The Dockerfile expects to be run from a directory that *also contains the app source* (so the `COPY . .` step picks it up). Easiest pattern: put the deploy files **inside the app folder**, like this:

```
/opt/scp/app/
├── package.json          (from the GitHub repo)
├── prisma/               (from the GitHub repo)
├── src/                  (from the GitHub repo)
├── ... rest of repo ...
├── Dockerfile            <-- copied from scp-deploy/
├── docker-compose.yml    <-- copied from scp-deploy/
├── .env                  <-- you create from .env.example
├── .dockerignore         <-- copied from scp-deploy/
└── docker/entrypoint.sh  <-- copied from scp-deploy/
```

> ⚠️ **Heads-up about the GitHub repo.** As of today, `https://github.com/work4arun/scp.git` contains only `README.md` — the actual `strategic-control-portal/` source code has not been pushed yet. Push the source first, otherwise the Docker build has nothing to compile.

---

## First deployment

```bash
# 1. Get the code
sudo mkdir -p /opt/scp && sudo chown "$USER":"$USER" /opt/scp
cd /opt/scp
git clone https://github.com/work4arun/scp.git app
cd app

# 2. Drop the deploy files in alongside the source
#    (copy from this scp-deploy folder; e.g. via scp / rsync from your laptop, or curl from a release)
#    After this step you should see Dockerfile, docker-compose.yml, .dockerignore,
#    docker/entrypoint.sh, nginx/scp.conf inside /opt/scp/app/

# 3. Create .env
cp .env.example .env
# Edit it:
#   - POSTGRES_PASSWORD : openssl rand -base64 24
#   - AUTH_SECRET       : openssl rand -base64 32
#   - NEXTAUTH_URL      : https://rathinamtechnicalcampus.com/scp   (already the default)
#   - BASE_PATH         : /scp                                      (already the default)
#   - SCP_SEED          : 1   <-- ONLY for the very first boot, then change back to 0

nano .env

# 4. Build and start
docker compose build
docker compose up -d

# 5. Watch the first boot — you want to see "Starting Next.js..." then a "ready" line
docker compose logs -f app
# Ctrl-C to detach (containers keep running)

# 6. After the first successful boot with the seed, turn the seed off
sed -i 's/^SCP_SEED=1/SCP_SEED=0/' .env
docker compose up -d   # picks up the env change with no rebuild
```

At this point the app is listening on `127.0.0.1:3000` inside the host. It is **not** reachable from the internet yet — Nginx still has to be told about `/scp/`.

---

## Wire up Nginx (host side)

You already have Nginx serving `rathinamtechnicalcampus.com` with TLS. Open whichever file currently holds that `server { ... listen 443 ssl ... }` block (commonly `/etc/nginx/conf.d/rathinamtechnicalcampus.com.conf` or `/etc/nginx/sites-available/...`) and **paste the contents of `nginx/scp.conf` inside** that server block.

Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Visit `https://rathinamtechnicalcampus.com/scp` — you should land on the SCP login page.

---

## Day-2 operations

### Update to a new version
```bash
cd /opt/scp/app
git pull
docker compose build
docker compose up -d
docker compose logs -f app   # sanity check
```

The entrypoint runs `prisma migrate deploy` on every start, so schema changes shipped in the new commit apply automatically.

### Tail logs
```bash
docker compose logs -f app    # Next.js
docker compose logs -f db     # Postgres
```

### Open a psql shell into the app's database
```bash
docker compose exec db psql -U scp -d scp
```

### Back up the database
```bash
# Full SQL dump to ./backups/scp-YYYYMMDD-HHMM.sql.gz
mkdir -p backups
docker compose exec -T db pg_dump -U scp -d scp \
  | gzip > backups/scp-$(date +%Y%m%d-%H%M).sql.gz
```

Set this as a daily cron once you're happy with the deploy.

### Restore from a backup
```bash
gunzip -c backups/scp-YYYYMMDD-HHMM.sql.gz \
  | docker compose exec -T db psql -U scp -d scp
```

### Stop / start / restart
```bash
docker compose stop      # graceful stop, data preserved
docker compose start     # start again
docker compose restart   # restart both containers
```

### Completely remove the app and its data
```bash
cd /opt/scp/app
docker compose down -v   # -v also drops the scp_pgdata volume
docker image rm scp-app:latest postgres:16-alpine || true
sudo rm -rf /opt/scp
# Then remove the /scp/ block from Nginx and reload.
```

This sequence touches **only** scp-owned resources. Nothing else on the shared server is affected.

---

## What this deployment does NOT touch (on purpose)

- ❌ The host's `postgresql` service / `/var/lib/pgsql` / port 5432
- ❌ Any other database, user, or app on the host
- ❌ Any system-wide Node.js / npm install
- ❌ Any system-wide PM2 process

Everything for SCP lives in the two containers and the named volume `scp_pgdata`.

---

## Troubleshooting

**"build failed: not found package.json"** — The `git clone` produced an empty repo (only `README.md`). The source code hasn't been pushed yet. Push it, then rebuild.

**"AUTH_SECRET must be set"** — `.env` is missing or hasn't been edited. Copy `.env.example` to `.env` and fill in real values.

**Login page loads but the CSS / images 404** — `BASE_PATH` and `NEXTAUTH_URL` got out of sync. They must agree: `BASE_PATH=/scp` and `NEXTAUTH_URL=https://rathinamtechnicalcampus.com/scp`. Fix `.env`, then `docker compose up -d`.

**`502 Bad Gateway` from Nginx** — The app container isn't running or isn't on `127.0.0.1:3000`. Check `docker compose ps` and `docker compose logs app`.

**SELinux blocks Nginx → 127.0.0.1:3000** — On AlmaLinux this can happen if SELinux is enforcing and Nginx isn't allowed outbound to local network ports. Run once:
```bash
sudo setsebool -P httpd_can_network_connect 1
```
