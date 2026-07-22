import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { formatRelative, formatDate } from "@/lib/utils";
import { MessageSquare, Mic } from "lucide-react";
import Link from "next/link";
import { TaskNotePanel } from "./task-note-panel";
import { FollowUpCalendar, DailyFollowUpPanel, buildFollowUpModel } from "./daily-followup";
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

  const [tasks, verticals, monthUpdates] = await Promise.all([
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

  const followUpModel = buildFollowUpModel(
    monthUpdates.map((u) => ({
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
    })),
    year,
    month,
    selectedDay,
  );

  const selectedVerticalName = verticals.find((v) => v.id === selectedVertical)?.code;
  const filterLabelParts: string[] = [];
  if (selectedStatus) filterLabelParts.push(`Status: ${selectedStatus.replace(/_/g, " ")}`);
  if (selectedPriority) filterLabelParts.push(`Priority: ${selectedPriority}`);
  if (selectedVerticalName) filterLabelParts.push(`Vertical: ${selectedVerticalName}`);
  const filterLabel = filterLabelParts.join(" · ");

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header row: greeting left, calendar centred. The empty third column is what
          centres it — equal flex-1 on both sides, calendar fixed-width in the middle.
          Not PageHeader, because that slots its action hard right. */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 sm:flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Good day, {session.user.name?.split(" ")[0] || "Dr. BN"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview — monitor all tasks across verticals.</p>
        </div>
        <div className="shrink-0 sm:mx-auto">
          <FollowUpCalendar model={followUpModel} year={year} month={month} searchParams={searchParams} />
        </div>
        <div className="hidden sm:block sm:flex-1" aria-hidden />
      </div>

      {/* Date-wise follow-up register */}
      <DailyFollowUpPanel
        model={followUpModel}
        year={year}
        month={month}
        view={followUpView}
        searchParams={searchParams}
      />

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