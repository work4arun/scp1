import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { formatRelative } from "@/lib/utils";
import { Plus, ListChecks, Clock, Inbox, AlertCircle } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { TaskNotePanel } from "@/app/(portal)/cbo/task-note-panel";
import { TaskFilterBar } from "@/app/(portal)/cbo/task-filter-bar";
import { buildTaskWhere, type TaskFilterParams } from "@/app/(portal)/cbo/task-filter-utils";

export default async function SmHome({ searchParams }: { searchParams: TaskFilterParams }) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + IST_OFFSET_MS); istNow.setUTCHours(0, 0, 0, 0);
  const startOfDay = new Date(istNow.getTime() - IST_OFFSET_MS);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const todayFilter: Prisma.TaskWhereInput = { status: { not: "DROPPED" }, OR: [{ deadline: { gte: startOfDay, lt: endOfDay } }, { createdAt: { gte: startOfDay, lt: endOfDay } }, { lastUpdateAt: { gte: startOfDay, lt: endOfDay } }] };

  // Merge user filters with today filter
  const filterWhere = buildTaskWhere(searchParams);
  const combinedWhere: Prisma.TaskWhereInput = { AND: [todayFilter, filterWhere] };

  const [p1Today, delayedToday, waitingToday, todaysTasks, verticals, priorities, teams] = await Promise.all([
    prisma.task.count({ where: { AND: [todayFilter, { priority: { code: "P1" }, status: { not: "COMPLETED" } }] } }),
    prisma.task.count({ where: { AND: [todayFilter, { status: "DELAYED" }] } }),
    prisma.task.count({ where: { AND: [todayFilter, { status: { in: ["WAITING_FOR_INPUT", "WAITING_FOR_APPROVAL"] } }] } }),
    prisma.task.findMany({ where: combinedWhere, orderBy: [{ priority: { rank: "asc" } }, { deadline: "asc" }, { updatedAt: "desc" }], include: { vertical: true, priority: true, teamAssignments: { include: { team: true } }, assignees: { include: { member: true } }, cboNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } } }),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
    prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const todayLabel = startOfDay.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today</div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{todayLabel}</h1>
        </div>
        <div className="shrink-0">
          <Button asChild size="lg"><Link href="/sm/new-task"><Plus className="h-4 w-4" /> New task</Link></Button>
        </div>
      </div>

      {/* Summary chips - compact button-style */}
      <div className="flex flex-wrap gap-2">
        <Link href="/sm/tasks" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Today</span>
          <span className="font-bold">{todaysTasks.length}</span>
        </Link>
        <Link href="/sm/tasks?status=DELAYED" className="inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/5 px-3 py-1.5 text-xs font-medium hover:bg-warning/10 transition-colors">
          <AlertCircle className="h-3.5 w-3.5 text-warning" />
          <span className="text-warning">Delayed</span>
          <span className="font-bold">{delayedToday}</span>
        </Link>
        <Link href="/sm/tasks?status=WAITING_FOR_INPUT" className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium hover:bg-primary/10 transition-colors">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="text-primary">Waiting</span>
          <span className="font-bold">{waitingToday}</span>
        </Link>
        <Link href="/sm/tasks?priority=P1" className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium hover:bg-destructive/10 transition-colors">
          <Inbox className="h-3.5 w-3.5 text-destructive" />
          <span className="text-destructive">P1</span>
          <span className="font-bold">{p1Today}</span>
        </Link>
      </div>

      {/* Filter bar - same as Tasks page */}
      <TaskFilterBar
        active={searchParams as Record<string, string | string[] | undefined>}
        basePath="/sm"
        options={{
          verticals: verticals.map((v) => ({ id: v.id, code: v.code, name: v.name })),
          priorities: priorities.map((p) => ({ id: p.id, code: p.code, label: p.label })),
          teams: teams.map((t) => ({ id: t.id, name: t.name })),
        }}
      />

      {/* Task list - compact button-style rows */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{todaysTasks.length} task{todaysTasks.length !== 1 ? "s" : ""} today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {todaysTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Nothing scheduled, created, or updated today. ✨</div>
          ) : (
            todaysTasks.map((t) => {
              const assigneeNames = t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a: any) => a.member.name).join(", ") || "Unassigned";
              return (
                <Link key={t.id} href={`/sm/tasks/${t.id}`} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-accent transition-colors group">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{t.title}</span>
                    <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{t.vertical.name} · {assigneeNames} · {formatRelative(t.lastUpdateAt || t.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <PriorityBadge code={t.priority.code} />
                    <StatusBadge status={t.status} />
                    <TaskNotePanel taskId={t.id} readOnly notes={t.cboNotes.map(({ audioBytes, ...n }: any) => ({ ...n, audioBase64: audioBytes ? Buffer.from(audioBytes).toString("base64") : null }))} />
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}