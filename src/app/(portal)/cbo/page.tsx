import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { formatRelative, formatDate } from "@/lib/utils";
import { Layers } from "lucide-react";
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
      },
    }),
  ]);

  const filterLabel = selectedStatus ? `Status: ${selectedStatus.replace(/_/g, " ")}` : selectedPriority ? `Priority: ${selectedPriority}` : "";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={`Good day, ${session.user.name?.split(" ")[0] || "Dr. BN"}`} description="Overview — monitor all tasks across verticals." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={<Layers className="h-4 w-4 text-primary" />} label="Total Tasks" value={taskCount} href="/cbo" active={!selectedPriority && !selectedStatus} />
        {priorityStats.map((p) => (
          <KpiCard key={p.code} icon={<span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: p.code === "P1" ? "#dc2626" : p.code === "P2" ? "#ea580c" : p.code === "P3" ? "#ca8a04" : "#16a34a" }} />} label={`${p.code} · ${p.label}`} value={p.count} href={`/cbo?priority=${p.code}`} active={selectedPriority === p.code} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Status:</span><TaskStatusFilter current={selectedStatus} priority={selectedPriority} /></div>
        {filterLabel && <div className="flex items-center gap-2"><span className="text-xs font-medium text-primary bg-primary/10 rounded px-2 py-0.5">{filterLabel}</span><Link href="/cbo" className="text-xs text-muted-foreground hover:text-foreground">Clear</Link></div>}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle>Tasks{tasks.length > 0 ? ` (${tasks.length})` : ""}</CardTitle><Link href="/cbo/tasks" className="text-xs font-semibold text-primary hover:underline">Full register →</Link></CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? <div className="text-sm text-muted-foreground py-4 text-center">{filterLabel ? `No tasks match "${filterLabel}".` : "No tasks yet."}</div> : tasks.map((t) => {
            const assigneeNames = t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a) => a.member.name).join(", ") || "—";
            return (
              <div key={t.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1"><span className="font-mono text-[10px] font-bold text-muted-foreground">{t.code}</span><span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: t.vertical.colorHex }}>{t.vertical.name}</span></div>
                  <div className="text-sm font-semibold truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{assigneeNames}{t.deadline ? ` · Deadline: ${formatDate(t.deadline)}` : ""}{` · Updated ${formatRelative(t.lastUpdateAt || t.updatedAt)}`}</div>
                </div>
                <div className="flex flex-col gap-1 shrink-0 items-end">
                  <div className="flex items-center gap-1.5"><PriorityBadge code={t.priority.code} /><StatusBadge status={t.status} /></div>
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

function KpiCard({ icon, label, value, href, active }: { icon: React.ReactNode; label: string; value: number; href: string; active: boolean }) {
  return <Link href={href}><Card className={`hover-lift overflow-hidden transition-all ${active ? "border-primary/60 ring-2 ring-primary/20 shadow-md" : "hover:border-primary/40"}`}><CardContent className="p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">{icon} {label}</div><div className="mt-2 text-2xl font-bold sm:text-3xl tabular-nums">{value}</div></CardContent></Card></Link>;
}