// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health
//
// Lightweight diagnostic endpoint for deployments. Returns JSON describing:
//   • DB reachability and basic counts (User, Task, Vertical, Priority, FeatureFlag)
//   • Feature flag table status (zero rows means the seeder didn't run)
//   • Whether AUTH_SECRET is set
//   • Build-time BASE_PATH (must match runtime — sub-path drift breaks server actions)
//
// Use this when the deployed UI is misbehaving. The endpoint is safe to expose
// because it only returns counts and configuration flags — no user content.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FLAG_REGISTRY } from "@/lib/features";

export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = {
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasAuthSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      basePath: process.env.BASE_PATH || "",
      smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
    },
  };

  try {
    // Use $queryRaw to confirm a real round-trip and surface low-level errors.
    await prisma.$queryRaw`SELECT 1`;
    out.db = { reachable: true };
  } catch (err) {
    out.ok = false;
    out.db = {
      reachable: false,
      error: (err as Error)?.message ?? String(err),
    };
    return NextResponse.json(out, { status: 500 });
  }

  try {
    const [userCount, taskCount, verticalCount, priorityCount, flagCount] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.vertical.count(),
      prisma.priority.count(),
      prisma.featureFlag.count().catch(() => -1),
    ]);
    out.counts = { users: userCount, tasks: taskCount, verticals: verticalCount, priorities: priorityCount, featureFlagRows: flagCount };

    if (flagCount === 0) {
      out.warnings = [
        "FeatureFlag table is empty — the seed step did not run. Bulk task actions and other gated features will be unavailable until you run `npm run db:seed` (or restart the container with SCP_SEED=1).",
      ];
    } else if (flagCount === -1) {
      out.warnings = [
        "FeatureFlag table is missing — Prisma schema is not in sync with the database. Run `npx prisma db push` against the deployment DB.",
      ];
    }

    if (verticalCount === 0 || priorityCount === 0) {
      out.warnings = [
        ...((out.warnings as string[]) ?? []),
        "No verticals or priorities found — task creation will fail until reference data is seeded.",
      ];
    }

    out.featureFlagsRegistered = FLAG_REGISTRY.length;
  } catch (err) {
    out.ok = false;
    out.countsError = (err as Error)?.message ?? String(err);
    return NextResponse.json(out, { status: 500 });
  }

  return NextResponse.json(out);
}
