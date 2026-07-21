import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { formatRelative, formatDate } from "@/lib/utils";
import { Layers, MessageSquare, Mic } from "lucide-react";
import Link from "next/link";
import { TaskStatusFilter } from "./overview-status-filter";
import { TaskVerticalFilter } from "./overview-vertical-filter";
import { TaskNotePanel } from "./task-note-panel";
import { DailyFollowUp } from "./daily-followup";
import { monthRangeUtc, parseMonthKey } from "@/lib/followups";

export default async function CboHome({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await auth();
  if (!isCBO(session?.user.systemRole) || !session?.user.id) redirect("/");

  const selectedStatus = searchParams.status || "";
  const selectedPriority = searchParams.priority || "";
  const selectedVertical = searchParams.vertical || "";

  // Daily follow-up calendar: ?m=YYYY-MM picks the month, ?d=YYYY-MM-DD the open day.
  const { year, month } = parseMonthKey(searchParams.m);
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.d ?? "") ? searchParams.d! : null;
  const followUpView = searchParams.fv === "vertical" ? "vertical" : "table";
  const monthRange = monthRangeUtc(year, month);

  const where: Record<string, unknown> = { status: { not: "DROPPED" } as const };
  if (selectedStatus) where.status = selectedStatus;
  if (selectedPriority) where.priority = { code: selectedPriority };
  if (selectedVertical) where.verticalId = selectedVertical;

  const [taskCount, priorityStats, tasks, verticals, monthUpdates] = await Promise.all([
    prisma.task.count({ where: { status: { not: "DROPPED" } } }),
    Promise.all([
      prisma.task.count({ where: { priority: { code: "P1" }, status: { not: "DROPPED" } } }).then((c) => ({ code: "P1", label: "Critical", count: c })),
      prisma.task.count({ where: { priority: { code: "P2" }, status: { not: "DROPPED" } } }).then((c) => ({ code: "P2", label: "High", count: c })),
      prisma.task.count({ where: { priority: { code: "P3" }, status: { not: "DROPPED" } } }).then((c) => ({ code: "P3", label: "Medium", count: c })),
      prisma.task.count({ where: { priority: { code: "P4" }, status: { not: "DROPPED" } } }).then((c) => ({ code: "P4", label: "Low", count: c })),
    ]),
    prisma.task.findMany({
      where: where as any,
      orderBy: [{ priority: { rank: "asc" } }, { updatedAt: "desc" }],
      take: 50,
      include: {
        vertical: true,
        priority: true,
        teamAssignments: { include: { team: true } },
        assignees: { include: { member: true } },
        cboNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
        _count: { select: { cboNotes: true } },
      },
    }),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    // Every SM update filed in the displayed month — the calendar buckets these by
    // local date. The range is padded a day either side; `dayKey()` does the exact
    // timezone bucketing (see lib/followups.ts).
    prisma.taskUpdate.findMany({
      where: { createdAt: { gte: monthRange.gte, lt: monthRange.lt }, task: { status: { not: "DROPPED" } } },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { name: true } },
        task: {
          select: {
            id: true, code: true, title: true, status: true, vertical: true,
            priority: { select: { code: true } },
            // Assigned teams carry the owner column; each team's head is the named person.
            teamAssignments: { include: { team: { include: { members: { where: { isHead: true }, select: { name: true } } } } } },
            assignees: { include: { member: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const selectedVerticalName = verticals.find((v) => v.id === selectedVertical)?.code;
  const filterLabelParts: string[] = [];
  if (selectedStatus) filterLabelParts.push(`Status: ${selectedStatus.replace(/_/g, " ")}`);
  if (selectedPriority) filterLabelParts.push(`Priority: ${selectedPriority}`);
  if (selectedVerticalName) filterLabelParts.push(`Vertical: ${selectedVerticalName}`);
  const filterLabel = filterLabelParts.join(" · ");

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader title={`Good day, ${session.user.name?.split(" ")[0] || "Dr. BN"}`} description="Overview — monitor all tasks across verticals." />

      {/* Date-wise follow-up register */}
      <DailyFollowUp
        entries={monthUpdates.map((u) => ({
          id: u.id,
          createdAt: u.createdAt,
          note: u.note,
          newStatus: u.newStatus,
          authorName: u.author.name,
          task: {
            id: u.task.id,
            code: u.task.code,
            title: u.task.title,
            status: u.task.status,
            vertical: { id: u.task.vertical.id, name: u.task.vertical.name, colorHex: u.task.vertical.colorHex, sortOrder: u.task.vertical.sortOrder },
            priority: { code: u.task.priority.code },
            teams: u.task.teamAssignments.map((ta) => ({ name: ta.team.name, head: ta.team.members[0]?.name ?? null })),
            members: u.task.assignees.map((a) => a.member.name),
          },
        }))}
        year={year}
        month={month}
        selectedDay={selectedDay}
        view={followUpView}
        searchParams={searchParams}
      />

      {/* Compact button-style summary chips */}
      <div className="flex flex-wrap gap-2">
        <Link href="/cbo" className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${!selectedPriority && !selectedStatus && !selectedVertical ? "border-primary/60 ring-2 ring-primary/20 bg-primary/5" : "border-border hover:bg-accent"}`}>
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold">{taskCount}</span>
        </Link>
        {priorityStats.map((p) => (
          <Link key={p.code} href={`/cbo?priority=${p.code}`} className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${selectedPriority === p.code ? "border-primary/60 ring-2 ring-primary/20 bg-primary/5" : "border-border hover:bg-accent"}`}>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.code === "P1" ? "#dc2626" : p.code === "P2" ? "#ea580c" : p.code === "P3" ? "#ca8a04" : "#16a34a" }} />
            <span className="text-muted-foreground">{p.code}</span>
            <span className="font-bold">{p.count}</span>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Status:</span><TaskStatusFilter current={selectedStatus} priority={selectedPriority} /></div>
        <div className="flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Vertical:</span><TaskVerticalFilter current={selectedVertical} status={selectedStatus} priority={selectedPriority} verticals={verticals.map((v) => ({ id: v.id, code: v.code, name: v.name }))} /></div>
        {filterLabel && <div className="flex items-center gap-2"><span className="text-xs font-medium text-primary bg-primary/10 rounded px-2 py-0.5">{filterLabel}</span><Link href="/cbo" className="text-xs text-muted-foreground hover:text-foreground">Clear</Link></div>}
      </div>

      {/* Task list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Tasks{tasks.length > 0 ? ` (${tasks.length})` : ""}</CardTitle>
          <Link href="/cbo/tasks" className="text-xs font-semibold text-primary hover:underline">Full register →</Link>
        </CardHeader>
        <CardContent className="space-y-1">
          {tasks.length === 0 ? <div className="text-sm text-muted-foreground py-4 text-center">{filterLabel ? `No tasks match "${filterLabel}".` : "No tasks yet."}</div> : tasks.map((t) => {
            const assigneeNames = t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a) => a.member.name).join(", ") || "—";
            const textCount = t.cboNotes.filter((m: any) => m.text != null).length;
            const voiceCount = t.cboNotes.filter((m: any) => m.audioBytes != null).length;
            const hasChat = textCount > 0 || voiceCount > 0;
            return (
              <Link key={t.id} href={`/cbo/tasks/${t.id}`} className="block rounded-md border border-border px-3 py-2 hover:bg-accent transition-colors group cursor-pointer">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground">{t.code}</span>
                      <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: t.vertical.colorHex }}>{t.vertical.name}</span>
                      <PriorityBadge code={t.priority.code} />
                      <StatusBadge status={t.status} />
                      {hasChat && (
                        <span className="inline-flex items-center gap-1 text-[10px] ml-auto sm:ml-0">
                          {textCount > 0 && <span className="inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{textCount}</span>}
                          {voiceCount > 0 && <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Mic className="h-3 w-3" />{voiceCount}</span>}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-sm font-medium truncate group-hover:text-primary">{t.title}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{assigneeNames}{t.deadline ? ` · ${formatDate(t.deadline)}` : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <TaskNotePanel taskId={t.id} notes={t.cboNotes.map(({ audioBytes, ...n }: any) => ({ ...n, audioBase64: audioBytes ? Buffer.from(audioBytes).toString("base64") : null }))} readOnly />
                  </div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}