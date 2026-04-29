# StartOS — Strategic Control Portal
## Complete Functional Diagnosis & Futuristic Enhancement Roadmap

**Project:** Strategic Control Portal (StartOS)
**Stack:** Next.js 14 (App Router), Prisma, NextAuth v5, Tailwind, shadcn/ui
**Audit date:** 2026-04-29
**Auditor:** Architecture & functionality review

---

## Executive Summary

StartOS is a well-structured, role-aware operational command center with three portals — **CBO** (Chief Business Officer), **SM** (Strategy Manager), and **Admin**. The data model is rich (verticals, priorities, interventions, parking-lot ideas, boss instructions, appointments) and the codebase shows discipline (server actions, transactions, RBAC, graceful error handling).

However, the system is **not yet production-hardened**. The most pressing gaps are in **security defenses** (no rate limiting, no 2FA, no password reset), **observability** (sparse audit log, no structured logging), **scale primitives** (no pagination, no full-text search), and **closed-loop communication** (notifications are in-app only — no email digests, no real-time push, no Slack/Teams parity).

The roadmap below ranks issues by severity and proposes a futuristic enhancement layer that would convert StartOS from a tracking tool into an **AI-augmented strategic operating system**.

---

## 1. Severity-Ranked Issue Register

### 1.1 CRITICAL — Block before any external rollout

| # | Issue | Where | Why it matters |
|---|-------|-------|----------------|
| C1 | **No rate limiting on login** | `src/lib/auth.ts:32-65`, `src/middleware.ts` | Credentials provider accepts unlimited attempts. Brute-force is trivial. |
| C2 | **No 2FA / MFA** | Auth layer | CBO and Super Admin are high-value accounts protected by a single password. |
| C3 | **No password reset / email verification** | Auth + admin actions | Users locked out must wait for an admin to issue a temp password (`admin/actions.ts:29-39`), and the temp password is returned in the response body. |
| C4 | **Sparse audit logging** | `admin/actions.ts:22-36` | Only password-reset events are logged. Task edits, status changes, intervention resolutions, parking-lot decisions leave no forensic trail. |
| C5 | **No Zod validation on server actions** | All `actions.ts` files use `String(formData.get(...))` | FormData is coerced without schema validation. Malformed input reaches Prisma. |
| C6 | **AUTH_SECRET not hard-failed at startup** | `src/lib/auth.ts:20-24` | A misconfigured deploy boots, then errors at runtime with a generic message. |

### 1.2 HIGH — Real risk to functionality, security, or scale

| # | Issue | Where | Why it matters |
|---|-------|-------|----------------|
| H1 | **No pagination anywhere** | Hardcoded `take: 8`, `take: 50`, `take: 200` across portal pages | Will break at ~10k tasks; full table loads each render. |
| H2 | **No email when CBO resolves an intervention** | `cbo/intervention/actions.ts:8-24` | SM sees resolution only by re-opening the app — closes a loop manually. |
| H3 | **No email when SM escalates** | `sm/tasks/[id]/actions.ts:58-103` | CBO is notified in-app only; can be missed. |
| H4 | **No real-time updates** | All pages are SSR-only | A change by another user requires manual refresh. |
| H5 | **No middleware-level role gating** | `src/middleware.ts` only checks auth | Every page re-implements RBAC; one missed check = privilege escalation. |
| H6 | **Boss Instruction workflow is one-way** | `sm/boss/*` | SM can capture instructions but never activate or update them. The schema has a `status` field but no transition UI. |
| H7 | **No timezone awareness in calendar** | `src/lib/calendar.ts:6-84` | Slots and recurrence assume server TZ = user TZ; remote teams will see wrong times. |
| H8 | **Email errors silently swallowed** | `src/lib/email.ts:186-188` | Correct policy, but no retry queue, no dead-letter, no admin visibility. |
| H9 | **Notifications never expire** | Schema `Notification` (line 55-71) | No archival; the bell will accumulate indefinitely. |
| H10 | **Temp password returned in response body** | `admin/actions.ts:29-39` | Should be one-time-use link delivered via email. |

### 1.3 MEDIUM — Functional gaps that hurt productivity

| # | Issue | Where | Why it matters |
|---|-------|-------|----------------|
| M1 | **No CSV / PDF / Excel export** | All report pages | Weekly summary, task register, audit log cannot be shared with non-users. |
| M2 | **No bulk actions** | SM tasks page, Admin pages | Cannot bulk reassign, bulk drop, bulk activate parking-lot ideas. |
| M3 | **No file attachments on tasks/interventions** | Task and Intervention models | All evidence (decks, contracts, screenshots) lives outside the system. |
| M4 | **No search except title CONTAINS** | `sm/tasks/page.tsx:28` | No full-text on description/notes/updates; will not scale. |
| M5 | **No saved filters / views** | Task register | Each user re-applies filters every visit. |
| M6 | **Parking lot has no auto-promote-to-task** | CBO/SM parking pages | Activated ideas must be re-typed as tasks; loses lineage. |
| M7 | **Intervention has free-text decision type** | `cbo/actions.ts:25-40` | No taxonomy ("Approved", "Deferred", "Need More Info") = no analytics. |
| M8 | **No appointment auto-booking from intervention** | `Intervention` and `Appointment` models exist but not linked in UI | A decision often needs a meeting; flow is manual. |
| M9 | **No notification for delayed tasks** | Everywhere | The system knows a task is delayed but never tells anyone. |
| M10 | **No `loading.tsx` / per-route `error.tsx`** | All portal segments | Only a global error boundary; no graceful per-section fallback. |
| M11 | **No CI / tests** | Repo root | Zero test coverage; every refactor is risky. |
| M12 | **No structured logging / Sentry** | Repo-wide | No error tracking, no APM, no usage analytics. |
| M13 | **No soft-delete reason on dropped tasks** | `Task.droppedAt` only | Can't see *why* a task was dropped. |
| M14 | **Email field not normalized at write** | `sm/new-task/actions.ts:40, 49` | Lookup is `.toLowerCase()` but storage is as-typed; allows ghost duplicates. |
| M15 | **`BossInstruction.status` is a free string** | `schema.prisma:349` | Should be enum (`CAPTURED \| ACTIVATED \| PARKED`). |
| M16 | **All-CBO notification fan-out on every task** | `sm/new-task/actions.ts:120-127` | Will become noisy at scale; needs per-user preferences. |

### 1.4 LOW — Polish, code-hygiene, future-proofing

| # | Issue | Where | Why it matters |
|---|-------|-------|----------------|
| L1 | `any` types in JWT callback | `src/lib/auth.ts:69, 72, 78-79` | Lose type safety on token payload. |
| L2 | No breadcrumbs in shell | `src/components/app-shell.tsx` | Deep pages have no trail. |
| L3 | No dark-mode toggle exposed | Tailwind supports it; no UI control | |
| L4 | No skip-to-content / ARIA live regions | `app-shell.tsx` | Notifications not announced to screen readers. |
| L5 | No `aria-current` on active nav links | `app-shell.tsx:31-66` | Active state is visual only. |
| L6 | No print stylesheet | Reports are screen-only | |
| L7 | Hardcoded role labels | `rbac.ts:3-7` | No i18n hooks. |
| L8 | No optimistic UI on mutations | All forms wait for server round-trip | |
| L9 | No empty-state illustrations | Most empty states are plain text | Lower delight. |
| L10 | No `Task.code` index (only unique) | `schema.prisma:282` | Direct-by-code lookups won't be index-only. |

---

## 2. Functional Diagnosis by Module

### 2.1 Authentication & RBAC — `src/lib/auth.ts`, `src/lib/rbac.ts`

**What works.** NextAuth v5 with credentials provider, bcrypt @ 10 rounds, JWT sessions, edge-compatible middleware (`src/auth.config.ts`, `src/middleware.ts`). Server actions consistently call `auth()` then a role check (`isCBO`, `canManageTasks`, `canConfigureSystem`).

**Gaps.** No rate limiting (C1), no 2FA (C2), no self-service password reset (C3), no session revocation, no login audit, no IP/UA tracking, no enforced password complexity, no token rotation. The `lastSeenAt` field is for "what's new since you were here" — not a login audit.

### 2.2 Data Model — `prisma/schema.prisma`

**Strengths.** Rich, opinionated domain: `Task`, `TaskUpdate` (audit trail per task), `Intervention` (with `snoozedUntil`, `resolutionNote`), `BossInstruction`, `ParkingLot` (impact + urgency + decision), `Appointment` + `Availability`, `Notification`, `Pin`, sparse `AuditLog`. Soft-delete on Task via `droppedAt`. Reasonable indexes on most hot paths.

**Smells.**
- `BossInstruction.status` is a string — should be enum (M15).
- No optimistic-locking version field — concurrent edits silently overwrite.
- No soft-delete on `Intervention`, `BossInstruction`, `ParkingLot`.
- `AuditLog` exists but only `admin/actions.ts` writes to it (C4).
- No `DropReason` field on Task (M13).
- Missing indexes: `Task.code`, `Task.createdAt`, `Intervention.taskId`, `BossInstruction.status`.

### 2.3 CBO Portal — `src/app/(portal)/cbo/*`

| Page | What it does | What's missing |
|------|---------------|-----------------|
| **Daily** (`daily/page.tsx`) | Top-8 P1, top-8 delayed, decisions awaiting, leader load, last 5 boss instructions. | Hardcoded `take:8`; no date filter; no drill-down; no email digest; no trend deltas. |
| **Weekly** (`weekly/page.tsx`) | Vertical roll-up table + guidance cards. | Static snapshot — no week-over-week, no charts, no export, no automated alerts when delays exceed thresholds. |
| **Intervention** (`intervention/page.tsx`, `actions.ts`) | Open / Snoozed / Resolved queues, snooze, resolve with note, pin. | Free-text decision type (M7); no escalation back to SM for clarification; no auto-booking of follow-up meeting (M8); no email to SM on resolution (H2). |
| **Parking** (`parking/page.tsx`) | Read-only review of ideas with decision badge. | No filtering, no bulk activate, no auto-promote to task (M6), no monthly review reminder. |
| **Verticals** (`verticals/page.tsx`, `[code]/page.tsx`) | List + drill-down per vertical. | CBO is read-only here (correctly), but cannot see the dropped archive or export the roadmap. |

### 2.4 SM Portal — `src/app/(portal)/sm/*`

| Page | What it does | What's missing |
|------|---------------|-----------------|
| **Home** (`page.tsx`) | KPI tiles, "My Follow-ups", quick links. | No daily digest email; appointments not shown inline; no task templates. |
| **Task Register** (`tasks/page.tsx`) | Filter by vertical / priority / status, title search, hard cap of 200 rows. | No pagination (H1), no saved views, no bulk actions (M2), no CSV export, no full-text on body (M4). |
| **New Task** (`new-task/*`) | Atomic code generation per vertical (P2002 retry handled), notifies CBO + emails owners. | No deadline-in-future validation; no template library; no attachments (M3); fan-out notification on every task to all CBO (M16). |
| **Task Detail** (`tasks/[id]/*`) | Add update (note + status), escalate (creates Intervention). | Cannot edit code/title/vertical inline; no status history view; no comment threads on updates; no in-context appointment booking. |
| **Boss** (`boss/*`) | Capture instructions; view list. | Cannot transition status (H6) — captured instructions have no destination. |
| **Parking** (`parking/*`) | Add ideas with impact / urgency / vertical. | No edit / delete; SM can't see CBO's decision rationale. |
| **Dropped Archive** (`dropped/page.tsx`) | View dropped tasks + restore. | No drop-reason captured (M13); 30-day window isn't enforced or surfaced. |

### 2.5 Admin Portal — `src/app/(portal)/admin/*`

| Page | What it does | What's missing |
|------|---------------|-----------------|
| **Home** (`page.tsx`) | DB-status tile, active tasks, open decisions, active users, last 6 audit entries; gracefully degrades if `AuditLog` table is missing. | No system stats (uptime, latency), no backup status, no usage heatmap. |
| **Users** (`users/*`) | Create, list, reset password, generate temp password, deactivate. | No invite-link flow; temp password returned in response (H10); no last-login history; no enforced password complexity; no role hierarchy. |
| **Verticals / Sub-Verticals / Priorities / Roles** | Full CRUD + reorder by `sortOrder` swap. | Hard delete only — no archive toggle; no bulk reorder (drag-drop); no color presets. |
| **Audit Log** (`audit/page.tsx`) | Lists entries. | No filters (action / entity / user / date), no pagination, no export, and the table itself is barely populated (C4). |
| **All Tasks** (`tasks/page.tsx`) | Cross-vertical master register. | Read-only; no oversight bulk actions. |

### 2.6 Calendar — `src/lib/calendar.ts`, `src/app/(portal)/calendar/*`

Slot generation, ICS export, weekly recurrence. **Gaps:** no timezone (H7), no email invites, no RSVP loop, no auto-booking from interventions (M8), no meeting-notes capture.

### 2.7 Notifications & Email — `src/lib/notify.ts`, `src/lib/email.ts`

In-app `Notification` rows + nodemailer for *task assignment only*. **Gaps:** no escalation email (H3), no resolution email (H2), no delayed-task reminder (M9), no digest, no preferences, no retry/dead-letter queue (H8), no archival (H9).

### 2.8 UI / UX — `src/components/app-shell.tsx`, `src/components/ui/*`

Solid shadcn/ui base, role-aware sidebar, mobile drawer, bottom nav, NotificationBell, dark-mode classes ready. **Gaps:** no breadcrumbs (L2), no dark-mode toggle (L3), no toasts on mutation success, no optimistic UI (L8), no skip-to-content (L4), no `aria-current` (L5), no print CSS (L6), no empty-state illustrations (L9).

### 2.9 Code Quality

Positives: Prisma everywhere (no SQL), React-escaped output, HTML-escaped emails, transactions on critical writes, errors swallowed only where they should be (notify/email).

Negatives: no Zod (C5), `any` in JWT callback (L1), hardcoded pagination ceilings (H1), no error boundaries per route (M10), no logging/observability (M12), no tests / CI (M11).

---

## 3. Futuristic Enhancements — Productivity Multiplier Roadmap

These are arranged from "near-term, high-leverage" to "horizon, transformative". Each tags the modules it touches.

### 3.1 AI-Augmented Strategic Layer

**A1. AI Daily Briefing (CBO).** Each morning, an LLM generates a 90-second briefing from the last 24h of TaskUpdate, Intervention, BossInstruction, and ParkingLot rows: *"Yesterday: 3 P1s slipped in Marketing; Dr. BN has 2 decisions waiting > 48h; the parking-lot review window opens Friday."* Delivered as in-app card + email + (optional) audio via TTS.

**A2. Smart Task Drafting.** When SM types in the New Task title, an inline assistant suggests Vertical, Sub-Vertical, Priority, Owner Role, Expected Output, and Next Action — learned from historical task patterns by vertical. Reduces task-entry time by ~60%.

**A3. Decision Co-Pilot for Interventions.** When CBO opens an intervention, the panel shows: linked task history, similar past decisions, predicted decision-type (Approve / Defer / Reject) with confidence, and a draft `resolutionNote`. CBO edits and confirms; the model learns from accepted/rejected drafts.

**A4. Risk Radar.** Continuous scoring of every active task on `slip_risk` (deadline, owner load, history, sub-vertical health). Surfaces a "Top-5 at risk" tile on Daily; auto-creates a *soft* intervention if risk > threshold for 48h.

**A5. Boss-Instruction → Task Auto-Conversion.** Run an extraction model on each captured `BossInstruction` to propose: title, vertical, deadline, owner role. SM approves with one click; the linkage is preserved (`Task.sourceInstructionId`).

**A6. Parking-Lot Triage Bot.** Monthly auto-rank of all `Park` items by current strategic fit (cosine similarity to the last 90 days of activated tasks + boss instructions). Suggests which items to *Activate*, *Re-park*, *Drop*.

**A7. Natural-Language Search.** Replace the title `CONTAINS` search (M4) with a semantic search index (pgvector or Typesense) over Task.title + description + last 10 updates. *"Find every delayed P1 in Sales that's blocked on legal"* should just work.

### 3.2 Closed-Loop Communication

**B1. Multi-Channel Notification Bus.** Replace the single in-app rail with a pluggable bus → in-app, email digest, Slack DM, MS Teams card, WhatsApp Business. Per-user channel preferences, per-event templates. Solves H2, H3, H9, M9.

**B2. Daily / Weekly Digest Emails.** SM gets a 7am "Today's chase list"; CBO gets a 7pm "Tomorrow's decisions"; Admin gets a Sunday system-health digest.

**B3. Real-Time Sync.** Switch portal pages to React Server Components + a thin Pusher / Ably / Supabase Realtime subscription on `Task`, `Intervention`, `Notification`. Eliminates manual refresh (H4).

**B4. Slack/Teams Two-Way Bot.** `/startos escalate` from Slack creates an Intervention; replies in the thread post back as `TaskUpdate`s. Decisions can be *resolved* from a Slack action button.

### 3.3 Calendar & Meeting Intelligence

**C1. Auto-Schedule on Escalation.** When SM escalates a task that needs >24h CBO attention, the system proposes 3 free slots from `Availability`, sends an ICS invite + Slack DM, and binds the appointment to the intervention (M8, H7 once we add timezone).

**C2. Meeting Notes Capture.** Each `Appointment` gains a structured notes panel; on save, an LLM extracts decisions and auto-creates Intervention resolutions, Task updates, or new ParkingLot entries — every meeting becomes an action register.

**C3. Recurrence v2.** RRULE-compliant recurrence + per-user timezone; exceptions; reschedule cascade.

### 3.4 Analytics, Reporting & Forecasting

**D1. Live KPI Dashboard.** Replace the static Weekly page with a chart grid: 12-week trend of P1 closure, delay rate per vertical, decision turnaround, parking-lot conversion %. Drill-through to filtered task lists.

**D2. CBO Heatmap.** Calendar-style heatmap of decisions made per day; shows decision-throughput bottlenecks.

**D3. Owner Workload View.** Per-`OwnerRole` capacity vs. open P1/P2; flags overloaded leaders before they slip.

**D4. Export & Scheduled Reports.** CSV / Excel / PDF export buttons (M1) on every list; scheduled "Weekly Vertical Pack" PDF emailed to CBO each Friday.

**D5. Predictive Burndown.** Per vertical, forecast week-end completion using historical velocity; raise an early warning if projected > target.

### 3.5 Workflow & Automation

**E1. Task Templates & Recurring Tasks.** Admin defines templates ("Quarterly Board Pack"); SM instantiates with one click. Cron-driven recurrences write fresh `Task`s on schedule.

**E2. Bulk Actions Everywhere.** Multi-select in Task Register, Parking Lot, Boss Instructions; bulk reassign, bulk drop with required reason (closes M2, M13).

**E3. SLA Engine.** Per-priority SLA (P1 = 24h, P2 = 72h, …); auto-escalate to Intervention when breached.

**E4. Saved Views.** Each user pins their filter combos; saved views appear in the sidebar (e.g., "My P1 in Marketing").

**E5. Workflow Designer.** Visual canvas where Admin defines: *"When a Task tagged `legal-review` reaches `IN_PROGRESS`, auto-create a sub-intervention to General Counsel."*

### 3.6 Security & Trust

**F1. WebAuthn / Passkeys + TOTP 2FA** for CBO and SUPER_ADMIN (closes C2).

**F2. Email-Verified Magic-Link Reset** replacing the temp-password-in-response flow (closes C3, H10).

**F3. Edge Rate Limiter** (Upstash / Vercel KV) on `/api/auth/*` and all action endpoints (closes C1).

**F4. Comprehensive Audit Log v2.** Middleware that intercepts every server action; writes `{actor, action, entity, before, after, ip, ua}` to `AuditLog`. Immutable append-only table, exportable, filterable (closes C4).

**F5. Field-Level Encryption** for sensitive instruction text and resolution notes (envelope encryption with per-row data keys).

**F6. Anomaly Detection.** Watch for unusual patterns (mass deletes, off-hours admin actions) and alert via the notification bus.

### 3.7 Mobile & Ambient

**G1. PWA + Push Notifications.** Installable app shell, offline-cached daily/weekly views, web-push for interventions.

**G2. Voice Capture.** SM presses-and-holds a mic button to dictate a Boss Instruction or Task update; Whisper transcribes; the AI splits into structured fields.

**G3. Conversational Interface.** Sidebar `Ask StartOS` chat: *"Show me everything blocked on Finance that hit P1 in the last 30 days."* The agent emits a saved view + a plain-English summary.

### 3.8 Enterprise & Integrations

**H1. SSO / SAML / Google Workspace** for org-wide identity.

**H2. Connector Marketplace.** Out-of-the-box ingestors for Google Drive, Notion, Salesforce, Jira, HubSpot — boss instructions and parking-lot ideas can originate from any of them via webhook.

**H3. Public-API + Webhooks.** Stable REST + signed webhooks (`task.escalated`, `intervention.resolved`) so other internal tools can react.

**H4. Multi-Tenant.** A future "StartOS Cloud" — per-org isolation, per-org branding (logo, colors, domain), per-org billing.

### 3.9 Foundational Engineering Investments

**I1. Zod schemas + typed Server Actions.** One `lib/schemas` directory; every action validates `formData` through Zod (closes C5).

**I2. Cursor-based pagination + virtualized lists** (closes H1).

**I3. Vitest + Playwright + GitHub Actions** with smoke tests for every action and an e2e per portal (closes M11).

**I4. Sentry / OpenTelemetry / pino structured logs** (closes M12).

**I5. Per-route `error.tsx` + `loading.tsx`** (closes M10).

**I6. Database migrations strategy.** Adopt a `prisma migrate deploy` pipeline + a seed-versioned approach so production is reproducible.

---

## 4. 90-Day Implementation Plan

| Phase | Window | Scope | Outcome |
|-------|--------|-------|---------|
| **Phase 0 — Harden** | Weeks 1–3 | C1–C6, H10, M11 (CI scaffold), I1, I4 | Production-safe baseline |
| **Phase 1 — Close the loop** | Weeks 4–6 | H2, H3, M9, B1 (email + in-app), F4 (audit v2), L8 (toasts/optimistic UI) | Users stop missing events |
| **Phase 2 — Scale** | Weeks 7–9 | H1 (pagination), M4 (semantic search), M2 (bulk), D4 (exports), I3 (test depth) | System handles 10k+ tasks |
| **Phase 3 — Intelligence** | Weeks 10–13 | A1, A2, A3, A4, D1, B3 (real-time) | StartOS becomes proactive |
| **Phase 4 — Mobile & Voice** | Weeks 14+ | G1, G2, G3, B4 (Slack bot) | Works wherever the leader is |

---

## 5. Key File References

```
prisma/schema.prisma                                   # data model (402 lines)
src/lib/auth.ts                                        # NextAuth config
src/lib/rbac.ts                                        # role helpers
src/middleware.ts                                      # route guard
src/lib/email.ts                                       # nodemailer pipeline
src/lib/notify.ts                                      # in-app notifications
src/lib/calendar.ts                                    # slots + ICS

src/app/(portal)/cbo/daily/page.tsx                    # CBO daily summary
src/app/(portal)/cbo/weekly/page.tsx                   # CBO weekly roll-up
src/app/(portal)/cbo/intervention/page.tsx             # decisions awaiting
src/app/(portal)/cbo/intervention/actions.ts           # resolve / snooze
src/app/(portal)/cbo/parking/page.tsx                  # parking lot review
src/app/(portal)/cbo/actions.ts                        # CBO mutations

src/app/(portal)/sm/page.tsx                           # SM home
src/app/(portal)/sm/tasks/page.tsx                     # task register
src/app/(portal)/sm/tasks/[id]/actions.ts              # update + escalate
src/app/(portal)/sm/new-task/actions.ts                # create task
src/app/(portal)/sm/boss/page.tsx                      # boss instructions
src/app/(portal)/sm/parking/page.tsx                   # parking submit

src/app/(portal)/admin/page.tsx                        # admin home
src/app/(portal)/admin/actions.ts                      # password reset, reorder
src/app/(portal)/admin/users/page.tsx                  # user mgmt
src/app/(portal)/admin/verticals/*                     # vertical CRUD

src/components/app-shell.tsx                           # sidebar + mobile nav
src/components/status-badges.tsx                       # status / priority badges
src/app/error.tsx                                      # global error boundary
```

---

## 6. Verdict

StartOS is **architecturally sound** and **functionally honest** for a small leadership team. To make it the strategic operating system its name implies, the next moves are clear:

1. **Harden** (rate-limit, 2FA, password reset, full audit) — *non-negotiable for production.*
2. **Close the communication loop** (email + real-time + Slack) — *makes the tool feel alive.*
3. **Add intelligence** (AI briefings, decision co-pilot, risk radar, semantic search) — *turns tracking into foresight.*
4. **Scale primitives** (pagination, full-text, exports, tests) — *survives the first 10× of usage.*

Done well, this becomes the calmest, smartest control tower a CBO has ever sat in.
