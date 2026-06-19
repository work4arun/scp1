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
import { TaskNotePanel } from "./task-note-panel";

export default async function CboHome({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await auth();
  if (!isCBO(session?.user.systemRole) || !session?.user.id) redirect("/");

  const selectedStatus = searchParams.status || "";
  const selectedPriority = searchParams.priority || "";

  const where: Record<string, unknown> = { status: { not: "DROPPED" } as const };
  if (selectedStatus) where.status = selectedStatus;
  if (selectedPriority) where.priority = { code: selectedPriority };

  const [taskCount, priorityStats, tasks] = await Promise.all([
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
        _count: { select: { messages: true } },
        messages: { select: { text: true, audioBytes: true } },
      },
    }),
  ]);

  const filterLabel = selectedStatus ? `Status: ${selectedStatus.replace(/_/g, " ")}` : selectedPriority ? `Priority: ${selectedPriority}` : "";

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader title={`Good day, ${session.user.name?.split(" ")[0] || "Dr. BN"}`} description="Overview — monitor all tasks across verticals." />

      {/* Compact button-style summary chips */}
      <div className="flex flex-wrap gap-2">
        <Link href="/cbo" className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${!selectedPriority && !selectedStatus ? "border-primary/60 ring-2 ring-primary/20 bg-primary/5" : "border-border hover:bg-accent"}`}>
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

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Status:</span><TaskStatusFilter current={selectedStatus} priority={selectedPriority} /></div>
        {filterLabel && <div className="flex items-center gap-2"><span className="text-xs font-medium text-primary bg-primary/10 rounded px-2 py-0.5">{filterLabel}</span><Link href="/cbo" className="text-xs text-muted-foreground hover:text-foreground">Clear</Link></div>}
      </div>

      {/* Task list - compact button-style rows with chat button */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Tasks{tasks.length > 0 ? ` (${tasks.length})` : ""}</CardTitle>
          <Link href="/cbo/tasks" className="text-xs font-semibold text-primary hover:underline">Full register →</Link>
        </CardHeader>
        <CardContent className="space-y-1">
          {tasks.length === 0 ? <div className="text-sm text-muted-foreground py-4 text-center">{filterLabel ? `No tasks match "${filterLabel}".` : "No tasks yet."}</div> : tasks.map((t) => {
            const assigneeNames = t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a) => a.member.name).join(", ") || "—";
            const textCount = t.messages.filter((m) => m.text != null).length;
            const voiceCount = t.messages.filter((m) => m.audioBytes != null).length;
            const hasChat = textCount > 0 || voiceCount > 0;
            return (
              <div key={t.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-accent transition-colors group">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground shrink-0">{t.code}</span>
                  <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: t.vertical.colorHex }}>{t.vertical.name}</span>
                  <Link href={`/cbo/tasks/${t.id}`} className="text-sm font-medium truncate hover:text-primary">{t.title}</Link>
                  <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{assigneeNames}{t.deadline ? ` · ${formatDate(t.deadline)}` : ""} · {formatRelative(t.lastUpdateAt || t.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <PriorityBadge code={t.priority.code} />
                  <StatusBadge status={t.status} />
                  <Link
                    href={`/sm/tasks/${t.id}?chat=1#conversation-section`}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium transition-colors hover:bg-accent hover:border-primary/40 shrink-0"
                    title="Open conversation"
                  >
                    <MessageSquare className={`h-3 w-3 ${hasChat ? "text-primary" : "text-muted-foreground"}`} />
                    {hasChat ? (
                      <span className="flex items-center gap-1">
                        {textCount > 0 && <span className="inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{textCount}</span>}
                        {voiceCount > 0 && <span className="inline-flex items-center gap-0.5 text-[10px]"><Mic className="h-3 w-3" />{voiceCount}</span>}
                      </span>
                    ) : <span className="text-[10px] text-muted-foreground">Chat</span>}
                  </Link>
                  <TaskNotePanel taskId={t.id} notes={t.cboNotes.map(({ audioBytes, ...n }: any) => ({ ...n, audioBase64: audioBytes ? Buffer.from(audioBytes).toString("base64") : null }))} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}