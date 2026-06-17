import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils";
import { Plus } from "lucide-react";
import { TaskFilterBar } from "@/app/(portal)/cbo/task-filter-bar";
import { TaskNotePanel } from "@/app/(portal)/cbo/task-note-panel";
import { buildTaskWhere, type TaskFilterParams } from "@/app/(portal)/cbo/task-filter-utils";

export default async function TasksPage({ searchParams }: { searchParams: TaskFilterParams }) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const filterWhere = buildTaskWhere(searchParams);
  const where = { AND: [{ status: { not: "DROPPED" } as const }, filterWhere] };

  const [tasks, verticals, priorities, teams] = await Promise.all([
    prisma.task.findMany({ where, orderBy: [{ priority: { rank: "asc" } }, { updatedAt: "desc" }], include: { vertical: true, priority: true, teamAssignments: { include: { team: true } }, assignees: { include: { member: true } }, cboNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } } }),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
    prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const rows = tasks.map((t) => ({ id: t.id, code: t.code, title: t.title, verticalName: t.vertical.name, verticalCode: t.vertical.code, priorityLabel: t.priority.label, priorityCode: t.priority.code, status: t.status, assigneeNames: t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a) => a.member.name).join(", ") || "—", updatedAt: t.updatedAt, lastUpdateAt: t.lastUpdateAt }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Tasks" description="All active tasks across verticals." action={<Button asChild size="lg"><Link href="/sm/new-task"><Plus className="h-4 w-4" /> New task</Link></Button>} />
      <TaskFilterBar active={searchParams as Record<string, string | undefined>} basePath="/sm/tasks" options={{ verticals: verticals.map((v) => ({ id: v.id, code: v.code, name: v.name })), priorities: priorities.map((p) => ({ id: p.id, code: p.code, label: p.label })), teams: teams.map((t) => ({ id: t.id, name: t.name })) }} />
      <Card><CardHeader><CardTitle>{rows.length} task{rows.length !== 1 ? "s" : ""}</CardTitle></CardHeader><CardContent className="space-y-2">
        {rows.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No tasks found.</div> : rows.map((r) => {
          const task = tasks.find((t) => t.id === r.id);
          const notes = task ? task.cboNotes.map(({ audioBytes, ...n }: any) => ({ ...n, audioBase64: audioBytes ? Buffer.from(audioBytes).toString("base64") : null })) : [];
          return (
            <div key={r.id} className="rounded-lg border border-border p-3 hover:bg-accent transition-colors">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <Link href={`/sm/tasks/${r.id}`} className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{r.title}</div><div className="text-xs text-muted-foreground truncate">{r.code} · {r.verticalName} · {r.assigneeNames} · {formatRelative(r.lastUpdateAt || r.updatedAt)}</div></Link>
                <div className="flex flex-col gap-1 shrink-0 items-end"><div className="flex gap-1.5"><PriorityBadge code={r.priorityCode} /><StatusBadge status={r.status} /></div><TaskNotePanel taskId={r.id} readOnly notes={notes} /></div>
              </div>
            </div>
          );
        })}
      </CardContent></Card>
    </div>
  );
}