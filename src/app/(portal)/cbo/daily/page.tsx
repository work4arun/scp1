import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import {
  KpiTile,
  DonutByVertical,
  OwnerLoadBars,
  DecisionAging,
  ActivityWave,
  StatusMosaic,
} from "./charts";
import { Flame, AlertTriangle, GitPullRequest, Activity } from "lucide-react";
import { isEnabled } from "@/lib/features";

// ─────────────────────────────────────────────────────────────────────────────
//  Today's Summary — chart-first dashboard for the CBO.
//  Pure server-rendered SVG visualizations; no external chart library.
// ─────────────────────────────────────────────────────────────────────────────

export default async function CboToday() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole)) redirect("/");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const slaEnabled = await isEnabled("sla_engine");

  // ── Parallel fetch ──
  const [
    activeCount,
    p1Active,
    delayedCount,
    openInterventions,
    todayUpdates,
    yesterdayUpdates,
    weekUpdates,
    activeByVertical,
    leadersPending,
    bossInstructions,
    p1Today,
    delayedTasks,
    statusCounts,
    slaBreached,
    verticals,
    priorities,
    ownerRolesAll,
  ] = await Promise.all([
    prisma.task.count({ where: { status: { notIn: ["DROPPED", "COMPLETED"] } } }),
    prisma.task.count({ where: { priority: { code: "P1" }, status: { notIn: ["DROPPED", "COMPLETED"] } } }),
    prisma.task.count({ where: { status: "DELAYED" } }),
    prisma.intervention.findMany({
      where: { resolved: false, OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }] },
      orderBy: { createdAt: "asc" },
      include: { task: { include: { vertical: true } } },
    }),
    prisma.taskUpdate.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.taskUpdate.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.taskUpdate.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.task.groupBy({
      by: ["verticalId"],
      where: { status: { notIn: ["DROPPED", "COMPLETED"] } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["ownerRoleId", "priorityId"],
      where: { status: { in: ["WAITING_FOR_INPUT", "DELAYED", "IN_PROGRESS", "NOT_STARTED"] } },
      _count: { _all: true },
    }),
    prisma.bossInstruction.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.task.findMany({
      where: { priority: { code: "P1" }, status: { notIn: ["DROPPED", "COMPLETED"] } },
      orderBy: { lastUpdateAt: "desc" },
      take: 6,
      include: { vertical: true, priority: true, ownerRole: true },
    }),
    prisma.task.findMany({
      where: { status: "DELAYED" },
      orderBy: { lastUpdateAt: "desc" },
      take: 6,
      include: { vertical: true, priority: true, ownerRole: true },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { status: { not: "DROPPED" } },
      _count: { _all: true },
    }),
    slaEnabled
      ? prisma.task.count({
          where: { slaBreachedAt: { not: null }, status: { notIn: ["DROPPED", "COMPLETED"] } },
        })
      : Promise.resolve(0),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { active: true } }),
    prisma.ownerRole.findMany({ where: { active: true } }),
  ]);

  // ── Derived: vertical donut ──
  const verticalById = new Map(verticals.map((v) => [v.id, v]));
  const donutSlices = activeByVertical
    .map((g) => ({
      label: verticalById.get(g.verticalId)?.name ?? "Unknown",
      value: g._count._all,
      color: verticalById.get(g.verticalId)?.colorHex ?? "#6b7280",
    }))
    .sort((a, b) => b.value - a.value);

  // ── Derived: owner workload (top 5 by total) ──
  const priorityCodeById = new Map(priorities.map((p) => [p.id, p.code]));
  const ownerNameById = new Map(ownerRolesAll.map((o) => [o.id, o.name]));
  const loadByOwner = new Map<string, { p1: number; p2: number; total: number }>();
  for (const g of leadersPending) {
    if (!g.ownerRoleId) continue;
    const code = priorityCodeById.get(g.priorityId) ?? "";
    const cur = loadByOwner.get(g.ownerRoleId) ?? { p1: 0, p2: 0, total: 0 };
    if (code === "P1") cur.p1 += g._count._all;
    if (code === "P2") cur.p2 += g._count._all;
    cur.total += g._count._all;
    loadByOwner.set(g.ownerRoleId, cur);
  }
  const ownerLoadRows = Array.from(loadByOwner.entries())
    .map(([id, v]) => ({ owner: ownerNameById.get(id) ?? "Unassigned", ...v }))
    .sort((a, b) => b.p1 * 100 + b.total - (a.p1 * 100 + a.total))
    .slice(0, 5);
  const ownerLoadMax = Math.max(1, ...ownerLoadRows.map((r) => r.total));

  // ── Derived: 7-day activity buckets (today is rightmost) ──
  const buckets: Array<{ label: string; count: number; date: Date }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    buckets.push({ label, count: 0, date: d });
  }
  for (const u of weekUpdates) {
    const idx = Math.floor((u.createdAt.getTime() - sevenDaysAgo.getTime()) / (24 * 60 * 60 * 1000));
    if (idx >= 0 && idx < buckets.length) buckets[idx].count++;
  }

  // ── Derived: aging strip ──
  const agingItems = openInterventions.slice(0, 6).map((i) => ({
    id: i.id,
    issue: i.issue,
    ageHours: (now.getTime() - i.createdAt.getTime()) / (1000 * 60 * 60),
    vertical: i.task?.vertical?.name ?? null,
  }));

  // ── Derived: status mosaic counts ──
  const sc = (key: string) => statusCounts.find((s) => s.status === key)?._count._all ?? 0;
  const mosaic = {
    NOT_STARTED: sc("NOT_STARTED"),
    IN_PROGRESS: sc("IN_PROGRESS"),
    WAITING_FOR_INPUT: sc("WAITING_FOR_INPUT"),
    WAITING_FOR_APPROVAL: sc("WAITING_FOR_APPROVAL"),
    DELAYED: sc("DELAYED"),
    COMPLETED: sc("COMPLETED"),
    PARKED: sc("PARKED"),
  };

  const updateDelta = todayUpdates - yesterdayUpdates;
  const oldestDecisionH = openInterventions[0]
    ? Math.floor((now.getTime() - openInterventions[0].createdAt.getTime()) / (1000 * 60 * 60))
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Today's Summary"
        description={now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      />

      {/* Hero KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="P1 Active"
          value={p1Active}
          icon={<Flame className="h-4 w-4" />}
          tone={p1Active > 10 ? "danger" : p1Active > 5 ? "warn" : "good"}
          spark={buckets.map((b) => b.count)}
          hint={`${activeCount} total active`}
        />
        <KpiTile
          label="Delayed"
          value={delayedCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={delayedCount > 0 ? "warn" : "good"}
          hint={delayedCount === 0 ? "Clean run" : "Need attention"}
        />
        <KpiTile
          label="Decisions Waiting"
          value={openInterventions.length}
          icon={<GitPullRequest className="h-4 w-4" />}
          tone={oldestDecisionH >= 48 ? "danger" : oldestDecisionH >= 24 ? "warn" : openInterventions.length === 0 ? "good" : "neutral"}
          hint={oldestDecisionH > 0 ? `oldest ${oldestDecisionH}h` : "—"}
        />
        <KpiTile
          label={slaEnabled ? "SLA Breaches" : "Today's Updates"}
          value={slaEnabled ? slaBreached : todayUpdates}
          icon={<Activity className="h-4 w-4" />}
          tone={slaEnabled ? (slaBreached > 0 ? "danger" : "good") : "neutral"}
          delta={slaEnabled ? undefined : updateDelta}
          hint={slaEnabled ? (slaBreached > 0 ? "SLAs missed" : "All on track") : "vs yesterday"}
        />
      </div>

      {/* Status mosaic — quick at-a-glance breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Where the work sits</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusMosaic counts={mosaic} />
        </CardContent>
      </Card>

      {/* Two-column: Vertical donut + Activity wave */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active tasks by vertical</CardTitle>
          </CardHeader>
          <CardContent>
            {donutSlices.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No active tasks.</div>
            ) : (
              <DonutByVertical slices={donutSlices} centerLabel="Active" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activity · last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityWave buckets={buckets.map(({ label, count }) => ({ label, count }))} />
          </CardContent>
        </Card>
      </div>

      {/* Two-column: Owner workload + Decision aging */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Owner workload</CardTitle>
          </CardHeader>
          <CardContent>
            <OwnerLoadBars rows={ownerLoadRows} max={ownerLoadMax} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Decisions waiting · sorted by age</CardTitle>
          </CardHeader>
          <CardContent>
            <DecisionAging items={agingItems} />
          </CardContent>
        </Card>
      </div>

      {/* Existing detail sections, retained for drill-down */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's P1 Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {p1Today.length === 0 ? (
              <div className="text-sm text-muted-foreground">No active P1 tasks.</div>
            ) : (
              p1Today.map((t) => (
                <Row
                  key={t.id}
                  title={t.title}
                  meta={t.vertical.name}
                  owner={t.ownerRole?.name}
                  priority={t.priority.code}
                  status={t.status}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delayed Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {delayedTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">None — clean run.</div>
            ) : (
              delayedTasks.map((t) => (
                <Row
                  key={t.id}
                  title={t.title}
                  meta={t.vertical.name}
                  owner={t.ownerRole?.name}
                  priority={t.priority.code}
                  status={t.status}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Boss Instructions Captured</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bossInstructions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No new instructions captured.</div>
          ) : (
            bossInstructions.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="font-medium">{i.instruction}</div>
                <div className="mt-1 text-xs text-muted-foreground">{i.source}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  title,
  meta,
  owner,
  priority,
  status,
}: {
  title: string;
  meta: string;
  owner?: string | null;
  priority: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "WAITING_FOR_INPUT" | "WAITING_FOR_APPROVAL" | "DELAYED" | "COMPLETED" | "PARKED" | "DROPPED";
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {meta}
          {owner ? ` · ${owner}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <PriorityBadge code={priority} />
        <StatusBadge status={status} />
      </div>
    </div>
  );
}
