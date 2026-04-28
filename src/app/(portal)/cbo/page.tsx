import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Layers, Sparkles, Building2, Flame, Zap } from "lucide-react";
import { MarkSeenOnLoad } from "./mark-seen";

export default async function CboHome() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole) || !session?.user.id) redirect("/");

  // lastSeenAt is a newer column — fall back gracefully if Prisma client is stale.
  let lastSeen: Date | null = null;
  try {
    const userBefore = await prisma.user.findUnique({ where: { id: session.user.id }, select: { lastSeenAt: true } });
    lastSeen = userBefore?.lastSeenAt ?? null;
  } catch { /* migration pending */ }
  const since = lastSeen ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    taskCount, verticalCount, p1Count, delayedCount, interventionCount, verticals,
    sinceTasks, sinceEscalations, sinceCompleted, p1Delayed,
  ] = await Promise.all([
    prisma.task.count({ where: { status: { not: "DROPPED" } } }),
    prisma.vertical.count({ where: { active: true } }),
    prisma.task.count({ where: { priority: { code: "P1" }, status: { not: "DROPPED" } } }),
    prisma.task.count({ where: { status: "DELAYED" } }),
    prisma.intervention.count({ where: { resolved: false } }).catch(() => 0),
    prisma.vertical.findMany({
      where: { active: true }, orderBy: { sortOrder: "asc" },
      include: { _count: { select: { tasks: true } }, tasks: { include: { priority: true } } },
    }),
    prisma.task.count({ where: { createdAt: { gt: since } } }),
    prisma.intervention.count({ where: { createdAt: { gt: since }, resolved: false } }).catch(() => 0),
    prisma.task.count({ where: { status: "COMPLETED", lastUpdateAt: { gt: since } } }),
    prisma.task.findMany({
      where: { priority: { code: "P1" }, status: "DELAYED" },
      orderBy: { updatedAt: "asc" },
      take: 3,
      include: { vertical: true, ownerRole: true },
    }),
  ]);

  // Pin model is newer too — degrade gracefully.
  let pins: { kind: string; refId: string }[] = [];
  try {
    pins = await prisma.pin.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 5 });
  } catch { /* migration pending */ }

  // Today's appointments (for the "My day" timeline)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  let todaysAppts: Array<{ id: string; title: string; startAt: Date; endAt: Date; status: string; organizer: { name: string }; intervention: { issue: string } | null }> = [];
  try {
    todaysAppts = await prisma.appointment.findMany({
      where: {
        attendeeId: session.user.id,
        startAt: { gte: today, lt: tomorrow },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: { startAt: "asc" },
      include: { organizer: { select: { name: true } }, intervention: { select: { issue: true } } },
    });
  } catch { /* migration pending */ }

  const recentDelayed = await prisma.task.findMany({
    where: { status: "DELAYED" },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: { priority: true, vertical: true, ownerRole: true },
  });

  const interventionList = await prisma.intervention.findMany({
    where: { resolved: false, OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: new Date() } }] },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { task: { include: { vertical: true } } },
  });

  // Vertical health score: weighted (delayed -3, p1 not done -1, completed +1)
  const verticalHealth = verticals.map((v) => {
    const total = v.tasks.length || 1;
    const delayed = v.tasks.filter((t) => t.status === "DELAYED").length;
    const completed = v.tasks.filter((t) => t.status === "COMPLETED").length;
    const p1Open = v.tasks.filter((t) => t.priority.code === "P1" && t.status !== "COMPLETED" && t.status !== "DROPPED").length;
    const score = Math.round(((completed - delayed * 3 - p1Open) / total + 1) * 50); // 0–100ish
    const tone: "good" | "watch" | "bad" = delayed >= 3 || score < 40 ? "bad" : delayed >= 1 || score < 60 ? "watch" : "good";
    return { v, total: v._count.tasks, delayed, completed, p1Open, score, tone };
  });

  // Resolve pinned items (best effort)
  const pinnedTasks = pins.filter((p) => p.kind === "task").length
    ? await prisma.task.findMany({
        where: { id: { in: pins.filter((p) => p.kind === "task").map((p) => p.refId) } },
        include: { vertical: true, priority: true },
      })
    : [];

  // Auto-generated briefing line
  const briefing = buildBriefing({
    p1Count, delayedCount, interventionCount, sinceEscalations, sinceCompleted, lastSeen,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <MarkSeenOnLoad />
      <PageHeader
        title={`Good day, ${session.user.name?.split(" ")[0] || "Dr. BN"}`}
        description="Your single executive view — only decisions and exceptions surface here."
      />

      {/* Daily briefing card */}
      <Card className="border-primary/30 bg-gradient-to-br from-accent to-card">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wide text-primary">Today's Briefing</div>
              <p className="mt-1 text-sm leading-relaxed">{briefing}</p>
              {lastSeen ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="info">{sinceTasks} new tasks</Badge>
                  <Badge variant="warning">{sinceEscalations} new escalations</Badge>
                  <Badge variant="success">{sinceCompleted} completed</Badge>
                  <Badge variant="muted">since {formatRelative(lastSeen)}</Badge>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RIGHT NOW — Critical action focus card (only shows when there's something urgent) */}
      {(p1Delayed.length > 0 || interventionCount > 0) && (
        <Card className="border-destructive/40 bg-gradient-to-br from-destructive/5 via-card to-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center shrink-0">
                <Flame className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <div className="text-xs font-bold uppercase tracking-wide text-destructive">Right Now</div>
                  <div className="text-[10px] text-muted-foreground">Top items needing your attention</div>
                </div>
                <div className="mt-3 grid gap-2">
                  {interventionCount > 0 && (
                    <Link href="/cbo/intervention" className="flex items-center justify-between rounded-lg border border-destructive/20 bg-card px-3 py-2.5 hover:border-destructive/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Zap className="h-4 w-4 text-destructive shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{interventionCount} decision{interventionCount > 1 ? "s" : ""} await your call</div>
                          <div className="text-xs text-muted-foreground">One-click templates: Approve / Need info / Defer</div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-destructive shrink-0" />
                    </Link>
                  )}
                  {p1Delayed.slice(0, 2).map((t) => (
                    <Link key={t.id} href={`/cbo/verticals/${t.vertical.code}`} className="flex items-center justify-between rounded-lg border border-warning/20 bg-card px-3 py-2.5 hover:border-warning/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{t.title}</div>
                          <div className="text-xs text-muted-foreground truncate">P1 delayed · {t.vertical.name} · {t.ownerRole?.name || "Unassigned"}</div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Snapshot</div>
          <Link href="/cbo/weekly" className="text-[11px] font-semibold text-primary inline-flex items-center gap-1">
            Weekly summary <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi icon={<Building2 className="h-4 w-4 text-primary" />} label="Total Verticals" value={verticalCount} hint="Operational areas" />
          <Kpi icon={<Layers className="h-4 w-4 text-primary" />} label="Total Tasks" value={taskCount} hint="Active across all verticals" />
          <Kpi icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="P1 Critical" value={p1Count} hint="Reviewed by you" />
          <Kpi icon={<Clock className="h-4 w-4 text-warning" />} label="Delayed" value={delayedCount} hint="Need follow-up" />
          <Kpi icon={<CheckCircle2 className="h-4 w-4 text-primary" />} label="Decisions Pending" value={interventionCount} hint="In your queue" />
        </div>
      </div>

      {/* Today's Timeline (my day) */}
      {todaysAppts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> My Day
            </CardTitle>
            <Link href="/calendar" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
              Open calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="relative pl-5 space-y-3">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              {todaysAppts.map((a) => (
                <div key={a.id} className="relative">
                  <span className="absolute -left-3.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <Link href="/calendar" className="block rounded-lg border border-border p-3 hover:bg-accent transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-primary">
                          {a.startAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {a.endAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-sm font-semibold">{a.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          With {a.organizer.name}{a.intervention ? ` · linked to: ${a.intervention.issue}` : ""}
                        </div>
                      </div>
                      <Badge variant={a.status === "CONFIRMED" ? "success" : "warning"}>{a.status}</Badge>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pinned */}
      {pinnedTasks.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">📌 Pinned</CardTitle>
            <span className="text-xs text-muted-foreground">{pinnedTasks.length} item(s)</span>
          </CardHeader>
          <CardContent className="space-y-2">
            {pinnedTasks.map((t) => (
              <Link key={t.id} href={`/cbo/verticals/${t.vertical.code}`} className="block rounded-lg border border-border p-3 hover:bg-accent transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.vertical.name}</div>
                  </div>
                  <PriorityBadge code={t.priority.code} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Vertical health + decisions side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Vertical Health</CardTitle>
            <Link href="/cbo/verticals" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {verticalHealth.map(({ v, delayed, p1Open, total, tone }) => (
              <Link
                key={v.id}
                href={`/cbo/verticals/${v.code}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-8 w-8 rounded-md grid place-items-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: v.colorHex }}>{v.code}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{v.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {total} tasks · {p1Open} P1 open · {delayed} delayed
                    </div>
                  </div>
                </div>
                <HealthDot tone={tone} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Decisions Awaiting You</CardTitle>
            <Link href="/cbo/intervention" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
              Open queue <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {interventionList.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No pending decisions. 🎯</div>
            ) : (
              interventionList.map((i) => (
                <div key={i.id} className="rounded-lg border border-warning/50 bg-warning/5 p-3 relative overflow-hidden transition-all duration-300 hover:shadow-md">
                  <div className="absolute inset-0 bg-warning/10 animate-pulse opacity-30 pointer-events-none"></div>
                  <div className="flex items-start justify-between gap-2 relative z-10">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate text-foreground">{i.issue}</div>
                      <div className="text-xs text-muted-foreground">{i.task?.vertical?.name || "—"} · {formatRelative(i.createdAt)}</div>
                    </div>
                    <Badge variant="warning" className="animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)]">Decide</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Currently Delayed</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {recentDelayed.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Nothing delayed. ✨</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Task</th>
                  <th className="py-2 pr-3 hidden sm:table-cell">Vertical</th>
                  <th className="py-2 pr-3 hidden sm:table-cell">Owner</th>
                  <th className="py-2 pr-3">Priority</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentDelayed.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{t.title}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground hidden sm:table-cell">{t.vertical.name}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground hidden sm:table-cell">{t.ownerRole?.name || "—"}</td>
                    <td className="py-2.5 pr-3"><PriorityBadge code={t.priority.code} /></td>
                    <td className="py-2.5 pr-3"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
          {icon} {label}
        </div>
        <div className="mt-2 text-2xl font-bold sm:text-3xl">{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function HealthDot({ tone }: { tone: "good" | "watch" | "bad" }) {
  const config = {
    good:  { color: "bg-success",     label: "Green" },
    watch: { color: "bg-warning",     label: "Watch" },
    bad:   { color: "bg-destructive", label: "Action" },
  }[tone];
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
      <span className="text-[11px] font-semibold uppercase text-muted-foreground">{config.label}</span>
    </div>
  );
}

function buildBriefing({
  p1Count, delayedCount, interventionCount, sinceEscalations, sinceCompleted, lastSeen,
}: { p1Count: number; delayedCount: number; interventionCount: number; sinceEscalations: number; sinceCompleted: number; lastSeen: Date | null }) {
  const parts: string[] = [];
  if (interventionCount > 0) parts.push(`${interventionCount} decision${interventionCount > 1 ? "s" : ""} await your call`);
  if (p1Count > 0) parts.push(`${p1Count} P1 item${p1Count > 1 ? "s" : ""} are active`);
  if (delayedCount > 0) parts.push(`${delayedCount} task${delayedCount > 1 ? "s are" : " is"} delayed`);
  if (lastSeen && sinceEscalations > 0) parts.push(`${sinceEscalations} new escalation${sinceEscalations > 1 ? "s" : ""} since you were last here`);
  if (lastSeen && sinceCompleted > 0) parts.push(`${sinceCompleted} task${sinceCompleted > 1 ? "s were" : " was"} closed in your absence`);

  if (parts.length === 0) return "You're caught up. Nothing critical is open. Use this window to review the weekly summary or pin items for next week.";
  return parts.join(" · ") + ".";
}
