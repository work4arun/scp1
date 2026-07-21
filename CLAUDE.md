# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # dev server (http://localhost:3000)
npm run build          # prisma generate + next build
npm run lint           # eslint (next lint)
npm run db:push        # sync schema.prisma -> Postgres (the actual workflow here)
npm run db:seed        # idempotent seed: verticals, priorities, feature flags, demo users, tasks
npm run db:studio      # Prisma Studio
./setup.sh             # one-shot local bootstrap: deps, .env, prisma, DB create, schema, seed
```

There is **no test suite** and no test runner configured — do not invent `npm test`.

`prisma/migrations/` does not exist. Schema changes go through `prisma db push` (the Docker entrypoint does the same on boot). `npm run db:migrate` is in package.json but has never been used; don't switch to it without asking.

After any change to `prisma/schema.prisma`, run `npx prisma generate` (or `npm run build`) before the types resolve.

Diagnostics: `GET /api/health` reports DB reachability, row counts, whether `AUTH_SECRET` is set, build-time `BASE_PATH`, and warns when the FeatureFlag table is empty (unseeded DB silently disables gated features).

## Architecture

Next.js 14 App Router + TypeScript strict + Prisma/Postgres + NextAuth v5 (credentials, JWT) + Tailwind. Server Components fetch via Prisma directly; mutations are Server Actions colocated in `actions.ts` next to the route that uses them.

### Two separate auth systems

1. **Portal** (`src/app/(portal)/**`) — NextAuth session, three `SystemRole`s: `SUPER_ADMIN`, `CBO`, `SM`. `src/middleware.ts` runs the edge-safe `src/auth.config.ts` (no DB calls) and gates everything except `/api`, `/external`, `/login`, static assets. `(portal)/layout.tsx` re-checks the session server-side and renders `AppShell` (sidebar on desktop, bottom nav on mobile — nav map lives in `src/components/app-shell.tsx`).
2. **External portal** (`src/app/external/**`) — passwordless, for `TeamMember`s who are not `User`s. `/external/token?token=…` sets an `ext_token` cookie; `external/(auth)/layout.tsx` calls `validateToken()` from [token-auth.ts](src/lib/token-auth.ts). Deliberately excluded from the middleware matcher — the layout is the only gate. Tokens are minted by `getOrCreateToken()` when a task assignment email goes out.

### RBAC

All role checks go through [src/lib/rbac.ts](src/lib/rbac.ts). Note the non-obvious semantics:
- `isCBO()` is true for `SUPER_ADMIN` too.
- `canManageTasks()` = SM **or** SUPER_ADMIN.
- `canConfigureSystem()` = SUPER_ADMIN **or SM** — so SM can hit admin config actions. Intentional; don't "fix" it without asking.

Every server action / route handler begins with `await auth()` + an rbac predicate. Follow the existing `ensureAdmin()` / `checkSm()` helper shape.

### Server Action contract

Actions **return** `{ success: false, error: string }` instead of throwing — Next.js replaces thrown errors with opaque `digest:` blobs in production. DB failures are funneled through `friendlyPrismaError()` ([prisma-errors.ts](src/lib/prisma-errors.ts)) which maps P2002/P2003/P2025/etc. to user-readable strings. Mutations end with `revalidatePath(...)`.

### Feature flags

[src/lib/features.ts](src/lib/features.ts) holds `FLAG_REGISTRY` — the single source of truth. Adding a flag = one entry in the registry plus `isEnabled("key")` / `requireFeature("key")` calls. Flags live in the `FeatureFlag` table, are toggled at `/admin/features`, default to disabled, and `feature_flags_enforced` is a master kill-switch that forces everything off. Missing rows fall back to registry defaults. `loadAllFlags()` is for layouts that branch on several at once.

### Audit log

`writeAudit()` ([audit.ts](src/lib/audit.ts)) is fire-and-forget — it never throws into the caller, so a failed audit write can't abort the user's action. Before/after JSON snapshots, IP, and UA are only persisted when the `audit_log_v2` flag is on; pass `force: true` for legacy admin events that must always be recorded. `passwordHash`/`password` keys are stripped from snapshots.

### Task codes

`computeNextTaskCode()` ([task-code.ts](src/lib/task-code.ts)) must be called **inside** a `prisma.$transaction`. It takes `SELECT … FOR UPDATE` on the Vertical row and queries existing tasks **by code prefix, not by verticalId** (verticals can be deleted and recreated with a new cuid, orphaning the old code space). The file's header comment documents two prior bugs — read it before changing anything there. Never parse task codes with a SQL regex inside a Prisma tagged template; JS eats the backslashes.

### Email

[email.ts](src/lib/email.ts) → nodemailer. Config resolution order: `SmtpConfig` DB row (Admin → Email Configuration) first, then `SMTP_*` env vars; if neither is complete, sends return `{ success: false }` rather than throwing. Sends are recorded in `EmailLog`. Assignment emails embed an external-portal token link.

### Binary content in Postgres

`StaticPage.fileData`, `CboNote.audioBytes`, and `TaskMessage.audioBytes` are Prisma `Bytes` columns — uploads and voice notes are stored **in the database**, not on disk or object storage. Upload/body limits are set to 1 GB in three places that must stay in sync: `next.config.js` (`serverActions.bodySizeLimit`), the restore/upload route handlers, and `nginx/default.conf`. When returning a `Buffer` in a `NextResponse`, convert to `Uint8Array` first.

### Backup / restore

[pg-tools.ts](src/lib/pg-tools.ts) shells out to `pg_dump` / `psql` (must be on PATH at runtime; password passed via `PGPASSWORD`, never argv). `POST /api/admin/restore` is triple-gated: Super Admin role + `backup_restore` flag + live password re-validation, and applies with `--single-transaction --on-error-stop`.

## Deployment

Docker Compose (`db` Postgres 16 / `app` Next.js standalone / `nginx` SSL proxy), deployed by `deploy-all.sh` to an EC2 host at `rtc.systitsoft.in`. `docker/entrypoint.sh` waits for the DB, runs `prisma db push`, seeds only when `SCP_SEED=1` **and** the User table is empty, then starts `server.js`.

Sub-path hosting is supported via `BASE_PATH` (e.g. `/scp`), wired into `basePath` + `assetPrefix` in `next.config.js`. `BASE_PATH` is baked in at build time — if the build-time and runtime values drift, Server Actions break silently. `/api/health` echoes the build-time value for exactly this reason.

## Repo gotchas

- `.gitignore` only lists `node_modules` and `.env`, so **the `.next/` build output is committed**. `git status` is permanently noisy with build artifacts; never let them dominate a diff review, and don't stage them deliberately.
- `README.md` describes routes that no longer exist (`/cbo/daily`, `/cbo/weekly`, `/sm/boss`, an owner-roles admin page). Trust `src/components/app-shell.tsx` and the directory tree over the README.
- `graphify-out/` holds a generated dependency graph; `.github/copilot-instructions.md` tells Copilot to query it. It is a build artifact and may be stale — verify against source before relying on it.
- `.env` is committed-adjacent config; real secrets and the seeded demo passwords (`sadmin@rathinam.in` etc.) are documented in the README and `deploy-all.sh`.
