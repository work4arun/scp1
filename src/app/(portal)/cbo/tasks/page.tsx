import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge, StatusBadge } from "@/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskFilterBar } from "../task-filter-bar";
import { ConversationButton } from "@/components/conversation-button";
import { buildTaskWhere, type TaskFilterParams } from "../task-filter-utils";
import { formatRelative, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function CboAllTasks({ searchParams }: { searchParams: TaskFilterParams }) {
  const session = await auth();
  if (session?.user.systemRole !== "CBO" && session?.user.systemRole !== "SUPER_ADMIN") redirect("/");

  const filterWhere = buildTaskWhere(searchParams);
  const where = { AND: [{ status: { not: "DROPPED" } as const }, filterWhere] };

  const [allTasks, verticals, priorities, teams] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ priority: { rank: "asc" } }, { createdAt: "asc" }],
      include: {
        vertical: true, priority: true,
        teamAssignments: { include: { team: true } },
        assignees: { include: { member: true } },
        updates: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
        messages: { select: { text: true, audioBytes: true } },
      },
    }),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
    prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="All Tasks" description="Full task register with filters." />
      <TaskFilterBar active={searchParams} basePath="/cbo/tasks" options={{ verticals: verticals.map((v) => ({ id: v.id, code: v.code, name: v.name })), priorities: priorities.map((p) => ({ id: p.id, code: p.code, label: p.label })), teams: teams.map((t) => ({ id: t.id, name: t.name })) }} />
      <Card id="full-task-register">
        <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle>Full Task Register</CardTitle><p className="mt-1 text-xs text-muted-foreground">{allTasks.length} task{allTasks.length !== 1 && "s"} match the filter</p></CardHeader>
        <CardContent className="p-0">
          {allTasks.length === 0 ? <div className="px-6 py-8 text-sm text-muted-foreground text-center">No active tasks found.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="border-b border-border bg-muted/40"><Th>Task ID</Th><Th>Vertical</Th><Th minW="200px">Task / Activity</Th><Th>Priority</Th><Th minW="140px">Assigned</Th><Th>Deadline</Th><Th>Status</Th><Th>Last Update</Th><Th minW="160px">Delay Reason</Th><Th minW="160px">Support Needed</Th><Th>Dr. BN?</Th><Th minW="180px">Next Action</Th><Th>Chat</Th></tr></thead>
                <tbody>
                  {allTasks.map((t, i) => {
                    const lastUpdate = t.updates[0]; const isDelayed = t.status === "DELAYED";
                    const assigneeLabel = t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a) => a.member.name).join(", ") || "—";
                    const textCount = t.messages.filter((m) => m.text != null).length;
                    const voiceCount = t.messages.filter((m) => m.audioBytes != null).length;
                    return (
                      <tr key={t.id} className={`border-b border-border ${i % 2 === 0 ? "bg-card" : "bg-muted/10"} ${isDelayed ? "bg-red-50 dark:bg-red-950/10" : ""}`}>
                        <td><Link href={`/cbo?taskId=${t.id}`} className="font-mono text-xs text-primary hover:underline">{t.code}</Link></td>
                        <td><span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: t.vertical.colorHex }}>{t.vertical.name}</span></td>
                        <td className="text-xs truncate max-w-[200px]">{t.title}</td>
                        <td><PriorityBadge code={t.priority.code} /></td>
                        <td className="text-xs text-muted-foreground">{assigneeLabel}</td>
                        <td className="text-xs">{t.deadline ? formatDate(t.deadline) : "—"}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td className="text-xs text-muted-foreground">{lastUpdate ? formatRelative(lastUpdate.createdAt) : "—"}</td>
                        <td className={`text-xs ${isDelayed ? "text-red-600 font-semibold" : ""}`}>{t.delayReason || "—"}</td>
                        <td className="text-xs">{t.supportNeeded || "—"}</td>
                        <td className="text-xs">{t.intervention === "NO" ? "No" : t.intervention === "YES" ? "Yes" : "If delayed"}</td>
                        <td className="text-xs">{t.nextAction || "—"}</td>
                        <td><ConversationButton taskId={t.id} baseUrl="/cbo" textCount={textCount} voiceCount={voiceCount} /></td>
                      </tr>
                    );
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

function Th({ children, minW }: { children: React.ReactNode; minW?: string }) {
  return <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground" style={minW ? { minWidth: minW } : undefined}>{children}</th>;
}