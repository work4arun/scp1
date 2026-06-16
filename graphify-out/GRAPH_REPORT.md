# Graph Report - .  (2026-06-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 669 nodes · 1829 edges · 40 communities (33 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7fdf951f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `friendlyPrismaError()` - 55 edges
2. `canConfigureSystem()` - 46 edges
3. `canManageTasks()` - 39 edges
4. `Button` - 32 edges
5. `Card` - 32 edges
6. `CardContent` - 32 edges
7. `PageHeader()` - 28 edges
8. `isCBO()` - 28 edges
9. `isEnabled()` - 26 edges
10. `writeAudit()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `VerticalsAdmin()` --calls--> `canConfigureSystem()`  [INFERRED]
  src/app/(portal)/admin/verticals/page.tsx → src/lib/rbac.ts
- `CboIntervention()` --calls--> `isCBO()`  [INFERRED]
  src/app/(portal)/cbo/intervention/page.tsx → src/lib/rbac.ts
- `CboNotes()` --calls--> `isCBO()`  [INFERRED]
  src/app/(portal)/cbo/notes/page.tsx → src/lib/rbac.ts
- `CboParking()` --calls--> `isCBO()`  [INFERRED]
  src/app/(portal)/cbo/parking/page.tsx → src/lib/rbac.ts
- `CboVerticals()` --calls--> `isCBO()`  [INFERRED]
  src/app/(portal)/cbo/verticals/page.tsx → src/lib/rbac.ts

## Import Cycles
- 1-file cycle: `src/app/(portal)/admin/tasks/page.tsx -> src/app/(portal)/admin/tasks/page.tsx`

## Communities (40 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (46): NotFound(), CalendarPage(), buildBriefing(), CboHome(), VerticalDetail(), CountUp(), PageHeader(), PriorityBadge() (+38 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (51): BackupActions(), Day, BossInstructionForm(), activePills(), DEADLINE_OPTIONS, FilterRefData, INTERVENTION_OPTIONS, Pill (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (41): AdminResult, Authed, ensureAdmin(), generateTempPasswordAction(), movePriorityAction(), moveVerticalAction(), resetUserPasswordAction(), TempPasswordResult (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (33): BookingForm(), BookPage(), AuthedUser, AuthResult, bookAppointmentAction(), BookResult, CalendarResult, cancelRecurringAction() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (24): ADMIN_NAV_ITEMS, AppShell(), bottomNavFor(), NavItem, navItemsFor(), NavLink(), NavSection, navSectionsFor() (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (24): GET(), POST(), DELETE(), buildFullHtml(), esc(), fmtDate(), fmtIst(), FullTaskNotificationArgs (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (26): dependencies, bcryptjs, class-variance-authority, clsx, date-fns, @hookform/resolvers, lucide-react, next (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (19): captureBossInstructionAction(), BossRegister(), addUpdateAction(), AddUpdateResult, EscalateResult, escalateTaskAction(), SmIntervention(), sendFullTaskNotification() (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (17): ClockAndTimer(), mergeTimers(), pad(), PRESETS_MIN, splitRemaining(), Timer, activeLoops, getContext() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (15): GET(), buildTaskWhere(), AuditEvent, readHeader(), toJson(), writeAudit(), checkBinary(), envFor() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (14): activateParkingItemAsTaskAction(), ActivateParkingResult, Authed, ensureCbo(), markSeenAction(), resolveInterventionRichAction(), setInterventionCboNoteAction(), SimpleResult (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (15): activateInstructionAsTaskAction(), ActivateResult, Authed, CaptureResult, ensureSm(), setInstructionStateAction(), SetStateResult, STATUS_TO_LEGACY (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (20): Authed, buildDiff(), bulkUpdateAction(), BulkUpdateResult, checkSm(), DeleteTaskResult, duplicateTaskAction(), DuplicateTaskResult (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (12): BulkDropSchema, DropTaskSchema, Email, EscalateSchema, formDataToObject(), NewTaskSchema, NonEmptyString, OptionalDate (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (9): Authed, FeatureResult, toggleFeatureAction(), FLAG_REGISTRY, FlagCategory, FlagDefinition, FlagKey, getFlagDefinition() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, prisma, tailwindcss, tsx (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.27
Nodes (10): Authed, ClearContactResult, clearRoleOwnerContactAction(), deleteOwnerRoleAction(), ensureAdmin(), SetOwnerContactResult, setRoleOwnerContactAction(), upsertOwnerRoleAction() (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (12): Strategic Control Portal — Deployment Procedure (Fresh Install), Strategic Control Portal — VPS Deployment Guide, StartOS — Strategic Control Portal: Functional Diagnosis & Roadmap, Docker, NextAuth v5, Next.js 14, Nginx, PostgreSQL 17 (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (10): scripts, build, db:migrate, db:push, db:seed, db:studio, dev, lint (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (7): OWNER_ROLES, PRIORITIES, prisma, SeedTask, SUB_VERTICALS, TASKS, VERTICALS

### Community 22 - "Community 22"
Cohesion: 0.47
Nodes (4): HomePage(), homePathForRole(), LoginForm(), LoginPage()

### Community 23 - "Community 23"
Cohesion: 0.47
Nodes (5): deploy.sh script, COMPOSE_DOCKER_CLI_BUILD, DOCKER_BUILDKIT, fail(), log()

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 25 - "Community 25"
Cohesion: 0.40
Nodes (3): inter, metadata, viewport

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (4): TaskFilterParams, VALID_INTERVENTIONS, VALID_SOURCES, VALID_STATUSES

### Community 27 - "Community 27"
Cohesion: 0.70
Nodes (4): setup.sh script, fail(), say(), warn()

## Knowledge Gaps
- **194 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+189 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `canConfigureSystem()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 9`, `Community 13`, `Community 15`, `Community 17`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `friendlyPrismaError()` connect `Community 11` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 7`, `Community 12`, `Community 13`, `Community 15`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `canManageTasks()` connect `Community 7` to `Community 0`, `Community 1`, `Community 3`, `Community 9`, `Community 12`, `Community 13`, `Community 30`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `canManageTasks()` (e.g. with `SmIntervention()` and `SmNotes()`) actually correct?**
  _`canManageTasks()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _194 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07564803385646271 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.060828680575962385 - nodes in this community are weakly interconnected._