# Strategic Control Portal — Docker Deployment on Amazon Linux 2023 (AWS)

Target URL: `http://<YOUR_AWS_PUBLIC_IP>`

## Why this design

The server is shared with other apps that already use PostgreSQL. To guarantee that **this app cannot affect, and cannot be affected by, any other Postgres on this server — now or in the future** — everything for SCP runs inside Docker:

- A dedicated **Postgres 16 container** with its own data volume. It does **not** publish any host port. The host's existing Postgres on `5432` is untouched.
- A dedicated **Next.js container** bound directly to port `80`. The public traffic hits Docker directly over HTTP.
- A dedicated **Docker network** (`scp_net`). The two containers talk to each other on this private network — nothing else on the host can reach the database.

To remove the entire app cleanly later: `docker compose down -v` (and delete the folder). Nothing else on the server is touched.

---

## Prerequisites (one-time, on the server)

> Skip any step whose tool you already have.

```bash
# 1. Install Docker Engine and Git on Amazon Linux 2023
sudo dnf update -y
sudo dnf install -y docker git

# 2. Start and enable Docker
sudo systemctl enable --now docker

# 3. Install Docker Compose
sudo mkdir -p /usr/local/lib/docker/cli-plugins/
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# 4. (optional) let the ec2-user run docker without sudo
sudo usermod -aG docker ec2-user
newgrp docker     # or log out/in
```

> **3. AWS Security Groups (Firewall):**
> Instead of running local firewall commands, go to your **AWS EC2 Console**.
> Select your instance -> Security -> click the Security Group.
> Edit Inbound Rules and add two rules:
> - **Type:** HTTP, **Port:** 80, **Source:** 0.0.0.0/0
> - **Type:** HTTPS, **Port:** 443, **Source:** 0.0.0.0/0

---

## Layout on the server

Pick a stable directory. Suggested:

```
/opt/scp/
├── app/                  <-- the source code from https://github.com/work4arun/scp1
└── deploy/               <-- the files from this scp-deploy folder
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .env              <-- you create this from .env.example
    ├── .dockerignore
    ├── docker/
    │   └── entrypoint.sh
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

> ⚠️ **Heads-up about the GitHub repo.** As of today, `https://github.com/work4arun/scp1.git` contains only `README.md` — the actual `strategic-control-portal/` source code has not been pushed yet. Push the source first, otherwise the Docker build has nothing to compile.

---

## First deployment

```bash
# 1. Get the code
sudo mkdir -p /opt/scp && sudo chown "$USER":"$USER" /opt/scp
cd /opt/scp
git clone https://github.com/work4arun/scp1.git app
cd app

# 2. Drop the deploy files in alongside the source
#    (copy from this scp-deploy folder; e.g. via scp / rsync from your laptop, or curl from a release)
#    After this step you should see Dockerfile, docker-compose.yml, .dockerignore,
#    docker/entrypoint.sh inside /opt/scp/app/

# 3. Create .env
cp .env.example .env
# Edit it:
#   - POSTGRES_PASSWORD : openssl rand -base64 24
#   - AUTH_SECRET       : openssl rand -base64 32
#   - NEXTAUTH_URL      : http://<YOUR_AWS_PUBLIC_IP>
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

At this point the app is listening directly on port 80.

Visit `http://<YOUR_AWS_PUBLIC_IP>` — you should land on the SCP login page.

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

**App doesn't load at all** — Ensure your AWS Security Group allows inbound traffic on Port 80 (HTTP).

**Login page loads but the CSS / images 404** — `NEXTAUTH_URL` is likely incorrect. Make sure it explicitly says `http://<YOUR_AWS_PUBLIC_IP>`. Fix `.env`, then run `docker compose up -d`.
