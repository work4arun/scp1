# Strategic Control Portal — AI Onboarding Prompt

Copy and paste the entire section below into a new conversation with any AI (Claude, ChatGPT, Gemini, etc.) to give it full context about this project before asking for help.

---

## START PROMPT — Copy from here

I'm working on a project called **Strategic Control Portal (SCP)** — a Next.js 14 task management dashboard for a college institution. It has three roles: Super Admin, CBO (Chief Business Officer), and SM (Strategic Manager).

**Before answering any questions about this project, please thoroughly analyze the following files to understand the full architecture:**

### Required Reading (in this order):

1. **`graphify-out/GRAPH_REPORT.md`** — The code dependency graph and community analysis. This tells you exactly how modules connect, which files depend on each other, and where the architectural boundaries are. Pay special attention to:
   - The "God Nodes" section (core abstractions like `friendlyPrismaError`, `canConfigureSystem`, etc.)
   - The "Communities" section (40 modules/communities with cohesion scores)
   - Cross-community bridges (RBAC guards connecting multiple communities)
   - Import cycles (there's 1 known cycle)

2. **`prisma/schema.prisma`** — The complete database schema. This is the source of truth for all data models including:
   - Users, Teams, TeamMembers
   - Tasks, TaskAssignments, TaskTeamAssignments, TaskUpdates
   - Verticals, SubVerticals, Priorities
   - CboNotes (voice + text notes)
   - EmailLog, ListmonkConfig
   - FeatureFlags, AuditLog, Pins

3. **`DEPLOYMENT.md`** and **`DEPLOYMENT_GUIDE.md`** — Deployment architecture and procedures.

4. **`DIAGNOSIS_REPORT.md`** — Known issues/diagnosis from a previous audit.

5. **`deploy-all.sh`** — The all-in-one VPS deployment script. Shows the exact Docker Compose stack (db, app, listmonk, nginx) and how SSL is handled.

6. **`docker-compose.yml`** — The production Docker Compose configuration with all services.

7. **`nginx/default.conf`** — Nginx SSL proxy configuration routing traffic to the app and Listmonk.

8. **`src/components/app-shell.tsx`** — The main navigation shell. This defines all sidebar menus for each role and is the entry point to understanding the UI structure.

### Key Architecture Points:
- **Framework**: Next.js 14 App Router with server actions
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth v5 with credentials provider
- **Email**: Listmonk (self-hosted) for transactional emails
- **Deployment**: Docker Compose on AWS EC2 (Amazon Linux 2023)
- **Domain**: rtc.systitsoft.in (with Let's Encrypt SSL via Nginx)

### What I need help with:
[Describe your specific question or task here]

---

## END PROMPT — Copy until here