import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { formatRelative, formatDate } from "@/lib/utils";
import { TaskFilterBar } from "../task-filter-bar";
import { buildTaskWhere, type TaskFilterParams } from "../task-filter-utils";

export default async function CboAllTasks({ searchParams }: { searchParams: TaskFilterParams }) {
  const session = await auth();
  if (!isCBO(session?.user.systemRole) || !session?.user.id) redirect("/");

  const filterWhere = buildTaskWhere(searchParams);
  const where = { AND: [{ status: { not: "DROPPED" } as const }, filterWhere] };

  const [allTasks, verticals, subVerticals, priorities, teams] = await Promise.all([
    prisma.task.findMany({ where, orderBy: [{ priority: { rank: "asc" } }, { createdAt: "asc" }], include: { vertical: true, subVertical: true, priority: true, teamAssignments: { include: { team: true } }, assignees: { include: { member: true } }, updates: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subVertical.findMany({ where: { active: true }, orderBy: [{ vertical: { sortOrder: "asc" } }, { sortOrder: "asc" }], include: { vertical: { select: { code: true } } } }),
    prisma.priority.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
    prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="All Tasks" description="Full task register with filters." />
      <TaskFilterBar active={searchParams} basePath="/cbo/tasks" options={{ verticals: verticals.map((v) => ({ id: v.id, code: v.code, name: v.name })), subVerticals: subVerticals.map((s) => ({ id: s.id, name: s.name, verticalCode: s.vertical.code })), priorities: priorities.map((p) => ({ id: p.id, code: p.code, label: p.label })), teams: teams.map((t) => ({ id: t.id, name: t.name })) }} />
      <Card id="full-task-register">
        <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle>Full Task Register</CardTitle><p className="mt-1 text-xs text-muted-foreground">{allTasks.length} task{allTasks.length !== 1 && "s"} match the filter</p></CardHeader>
        <CardContent className="p-0">
          {allTasks.length === 0 ? <div className="px-6 py-8 text-sm text-muted-foreground text-center">No active tasks found.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="border-b border-border bg-muted/40"><Th>Task ID</Th><Th>Vertical</Th><Th>Sub Vertical</Th><Th minW="200px">Task / Activity</Th><Th>Priority</Th><Th minW="140px">Assigned</Th><Th>Deadline</Th><Th>Status</Th><Th>Last Update</Th><Th minW="160px">Delay Reason</Th><Th minW="160px">Support Needed</Th><Th>Dr. BN?</Th><Th minW="180px">Next Action</Th></tr></thead>
                <tbody>
                  {allTasks.map((t, i) => {
                    const lastUpdate = t.updates[0]; const isDelayed = t.status === "DELAYED";
                    const assigneeNames = t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a) => a.member.name).join(", ") || "—";
                    return (<tr key={t.id} className={["border-b border-border transition-colors hover:bg-accent/50", isDelayed ? "bg-destructive/[0.03]" : i % 2 === 0 ? "" : "bg-muted/20"].join(" ")}><Td><span className="font-mono text-xs font-semibold whitespace-nowrap">{t.code}</span></Td><Td><span className="inline-block rounded px-1.5 py-0.5 text-[11px] font-bold text-white whitespace-nowrap" style={{ backgroundColor: t.vertical.colorHex }}>{t.vertical.name}</span></Td><Td><span className="text-xs text-muted-foreground whitespace-nowrap">{t.subVertical?.name || "—"}</span></Td><Td><span className="font-medium line-clamp-2 max-w-[220px]" title={t.title}>{t.title}</span></Td><Td><PriorityBadge code={t.priority.code} /></Td><Td><div className="text-xs whitespace-nowrap">{assigneeNames}</div></Td><Td>{t.deadline ? <span className={["text-xs whitespace-nowrap", new Date(t.deadline) < new Date() && t.status !== "COMPLETED" ? "text-destructive font-semibold" : "text-muted-foreground"].join(" ")}>{formatDate(t.deadline)}</span> : <span className="text-xs text-muted-foreground">—</span>}</Td><Td><StatusBadge status={t.status} /></Td><Td>{lastUpdate ? <div className="text-xs max-w-[160px]"><div className="text-muted-foreground whitespace-nowrap">{formatRelative(lastUpdate.createdAt)}</div><div className="mt-0.5 line-clamp-2 text-foreground/70" title={lastUpdate.note}>{lastUpdate.note.replace(/^[^\w]+ ?/, "").slice(0, 60)}{lastUpdate.note.length > 60 ? "…" : ""}</div></div> : <span className="text-xs text-muted-foreground">No updates yet</span>}</Td><Td><span className="text-xs text-muted-foreground line-clamp-2 max-w-[160px]" title={t.delayReason || undefined}>{t.delayReason || "—"}</span></Td><Td><span className="text-xs text-muted-foreground line-clamp-2 max-w-[160px]" title={t.supportNeeded || undefined}>{t.supportNeeded || "—"}</span></Td><Td>{t.intervention === "NO" ? <span className="text-xs text-muted-foreground">No</span> : t.intervention === "YES" ? <Badge variant="warning" className="text-[10px] whitespace-nowrap">Yes</Badge> : <Badge variant="info" className="text-[10px] whitespace-nowrap">If delayed</Badge>}</Td><Td><span className="text-xs text-muted-foreground line-clamp-2 max-w-[180px]" title={t.nextAction || undefined}>{t.nextAction || "—"}</span></Td></tr>);
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Th({ children, minW }: { children: React.ReactNode; minW?: string }) { return <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap" style={minW ? { minWidth: minW } : undefined}>{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-3 py-2.5 align-top">{children}</td>; }