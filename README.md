# Strategic Control Portal

A corporate Next.js 14 + TypeScript + PostgreSQL application that operationalizes the **Senior Manager Task Manager Register** framework. Three roles, six verticals, mobile-first.

## What it does

- **Master register** across Marketing, RTC, Placements, AIC RAISE, RGU, and Special Strategic Projects
- **Three roles**:
  - **Super Admin** — configures verticals, sub-verticals, priorities, owner roles, users; sees system health, audit log; can reset / generate temp passwords; reorders verticals & priorities
  - **CBO** — read-only oversight with daily briefing card, since-last-visit feed, vertical health traffic-lights, intervention queue with template responses (Approve / Need info / Defer / Reject), snooze, private-note replies to SM, and pinning
  - **Strategic Manager (SM)** — captures tasks, follows up, escalates; full edit / soft-delete / restore (within 30 days) / duplicate / bulk-edit on tasks; manages boss instructions and parking lot
- **Built-in protection registers**: Boss Task Register, Dr. BN Intervention Queue, Parking Lot, Dropped Archive
- **Workflow**: Capture → Classify → Prioritize → Assign → Follow-up → Escalate
- **Audit-trail aware**: every edit logs field-level diffs into the task timeline; system-impacting actions (user create/delete, password reset, vertical changes) write to a global audit log
- **Mobile-first** — responsive layout with bottom nav on phones, sidebar on desktop

## Stack

- **Next.js 14** (App Router, Server Actions)
- **TypeScript** strict mode
- **PostgreSQL** via Prisma ORM
- **NextAuth v5** (credentials login, JWT sessions)
- **Tailwind CSS** with shadcn-style components
- **Lucide** icons

---

## Setup

### Fastest path (recommended)

```bash
cd strategic-control-portal
./setup.sh        # one shot: deps, .env, Prisma, DB create, schema, seed
npm run dev
```

Then open http://localhost:3000 and log in with one of the demo accounts below.

> **Already running an older version?** Sync your DB to the latest schema (adds Pin, AuditLog, droppedAt, etc.):
> ```bash
> npx prisma db push
> ```
> No seed re-run needed unless you want to reset.

---

### Manual steps

### 1. Prerequisites

- Node.js 18.18+ (or 20+ recommended)
- PostgreSQL 13+ running locally or remotely
- npm / pnpm / yarn

### 2. Install

```bash
cd strategic-control-portal
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at least:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/scp?schema=public"
AUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Create the database

If you haven't already, create an empty database:

```bash
psql -U postgres -c "CREATE DATABASE scp;"
```

### 5. Push the schema and seed

```bash
npx prisma db push
npm run db:seed
```

Seed creates: 6 verticals, 27 sub-verticals, 4 priorities (P1–P4), 36 owner roles, 3 demo users, and ~80 tasks pulled directly from the framework registers.

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Default logins

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `sadmin@rathinam.in` | `SuperAdmin@123` |
| CBO | `cbo@rathinam.in` | `Cbo@123` |
| SM | `sm@rathinam.in` | `Sm@123` |

**Change these in production via the Super Admin → Users page.**

---

## Available scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (also runs `prisma generate`) |
| `npm run start` | Start production server |
| `npm run db:push` | Sync Prisma schema → Postgres without migrations |
| `npm run db:migrate` | Create + apply a migration (preferred for production) |
| `npm run db:seed` | Re-seed reference data + tasks (idempotent) |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run lint` | Run ESLint |

---

## Project layout

```
strategic-control-portal/
├─ prisma/
│  ├─ schema.prisma            # Postgres data model
│  └─ seed.ts                  # Full framework seed (verticals, tasks, users)
├─ src/
│  ├─ app/
│  │  ├─ login/                # Sign-in page
│  │  ├─ (portal)/
│  │  │  ├─ layout.tsx         # Auth wall + AppShell
│  │  │  ├─ admin/             # Super Admin
│  │  │  │  ├─ verticals/
│  │  │  │  ├─ sub-verticals/
│  │  │  │  ├─ priorities/
│  │  │  │  ├─ roles/
│  │  │  │  ├─ users/
│  │  │  │  └─ tasks/
│  │  │  ├─ cbo/               # CBO (read-only)
│  │  │  │  ├─ daily/
│  │  │  │  ├─ weekly/
│  │  │  │  ├─ intervention/
│  │  │  │  ├─ parking/
│  │  │  │  └─ verticals/[code]/
│  │  │  └─ sm/                # Strategic Manager
│  │  │     ├─ tasks/[id]/
│  │  │     ├─ new-task/
│  │  │     ├─ boss/
│  │  │     ├─ intervention/
│  │  │     └─ parking/
│  │  ├─ api/auth/[...nextauth]/
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx              # Home → role-aware redirect
│  ├─ components/
│  │  ├─ ui/                   # Button, Card, Badge, Input, Select, Textarea, Label
│  │  ├─ app-shell.tsx         # Sidebar (desktop) + bottom nav (mobile)
│  │  ├─ page-header.tsx
│  │  └─ status-badges.tsx
│  ├─ lib/
│  │  ├─ auth.ts               # NextAuth config
│  │  ├─ auth-handlers.ts      # Route handlers (Node runtime)
│  │  ├─ prisma.ts             # Prisma client singleton
│  │  ├─ rbac.ts               # Role helpers
│  │  └─ utils.ts              # cn(), formatDate(), formatRelative()
│  ├─ auth.config.ts           # Edge-safe authConfig (middleware)
│  └─ middleware.ts            # Auth middleware
├─ tailwind.config.ts
├─ tsconfig.json
├─ next.config.js
├─ package.json
└─ README.md
```

---

## Customizing for your organization

Everything below can be edited from the **Super Admin** UI without touching code:

- **Verticals**: code, name, colour, sort order
- **Sub-Verticals**: per-vertical, sortable
- **Priorities**: code, label, rank, review cadence, colour
- **Owner Roles**: any operational title
- **Users**: full CRUD with system + owner role assignment

Edit branding/strings in `src/app/login/page.tsx` and the SCP logo block in `src/components/app-shell.tsx`.

---

## Production deployment

### Option A — Deploy under a subpath (e.g. `rathinamtechnicalcampus.com/scp`)

This runs Next.js on a private port and your existing webserver (Nginx / Apache) reverse-proxies `/scp/*` to it.

#### Step 1 — Configure the app

In your production `.env`:

```env
DATABASE_URL="postgresql://USER:PASS@host:5432/scp?schema=public"
AUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="https://rathinamtechnicalcampus.com/scp"
BASE_PATH="/scp"
```

Build:

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run build
```

#### Step 2 — Run the Next.js server with PM2

Install [PM2](https://pm2.keymetrics.io/) once: `npm i -g pm2`

```bash
PORT=3000 pm2 start npm --name scp -- start
pm2 save
pm2 startup        # follow the printed instructions to enable on reboot
```

The app now listens on `localhost:3000` with `basePath = /scp`.

#### Step 3 — Reverse-proxy from your main site

**Nginx** (add inside your existing `server { ... }` block for `rathinamtechnicalcampus.com`):

```nginx
# Strategic Control Portal at /scp
location /scp/ {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection "upgrade";
    proxy_read_timeout 60s;
    proxy_buffering    off;
}

# Some browsers request /scp without trailing slash — redirect cleanly
location = /scp {
    return 301 /scp/;
}
```

Reload: `sudo nginx -t && sudo systemctl reload nginx`

**Apache** (with `mod_proxy` and `mod_proxy_http` enabled):

```apache
# Inside <VirtualHost *:443> for rathinamtechnicalcampus.com

ProxyPreserveHost On
ProxyPass        /scp/  http://127.0.0.1:3000/scp/
ProxyPassReverse /scp/  http://127.0.0.1:3000/scp/

# Required for streaming / Next.js Server Actions
RequestHeader set X-Forwarded-Proto "https"
```

Reload: `sudo systemctl reload apache2` (or `httpd`).

#### Step 4 — Open it

Visit `https://rathinamtechnicalcampus.com/scp` — it should load the login page. All internal links, API routes, and assets correctly resolve under `/scp` thanks to `basePath` + `assetPrefix` in `next.config.js`.

---

### Option B — Deploy on a dedicated subdomain (`scp.rathinamtechnicalcampus.com`)

Easier and cleaner. No `BASE_PATH` needed.

```env
NEXTAUTH_URL="https://scp.rathinamtechnicalcampus.com"
BASE_PATH=""
```

Add a DNS A record for `scp` pointing to your server, then a standard Nginx/Apache vhost proxying everything to `localhost:3000`.

---

### Option C — Vercel / Render / Railway

Push this folder to a Git repo, connect the platform, set the same env vars (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`). Use Neon / Supabase / Railway for managed Postgres. No `BASE_PATH` needed unless you want a subpath.

---

### After every deployment

- **Change all default passwords from the Users page.**
- Verify the audit log is recording activity.
- Test a full login → task edit → escalate → resolve flow as a smoke test.

---

## License

Internal / proprietary. Not for redistribution.
# scp
# scp1
