import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { formatRelative, formatDate } from "@/lib/utils";

export default async function SmParkedPage() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const tasks = await prisma.task.findMany({
    where: { status: "PARKED" },
    orderBy: { updatedAt: "desc" },
    include: {
      vertical: true, subVertical: true, priority: true,
      teamAssignments: { include: { team: true } },
      assignees: { include: { member: true } },
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Parking Lot" description="Tasks that have been parked for later review." />
      <Card><CardHeader><CardTitle>{tasks.length} parked task{tasks.length !== 1 ? "s" : ""}</CardTitle></CardHeader><CardContent className="space-y-2">
        {tasks.length === 0 ? <div className="text-sm text-muted-foreground py-4 text-center">No parked tasks. 🎯</div> : tasks.map((t) => {
          const assigneeNames = t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a) => a.member.name).join(", ") || "—";
          return (
            <Link key={t.id} href={`/sm/tasks/${t.id}`} className="block">
              <div className="rounded-lg border border-border p-3 hover:bg-accent transition-colors">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><div className="flex items-center gap-2 mb-1"><span className="font-mono text-[10px] font-bold text-muted-foreground">{t.code}</span><span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: t.vertical.colorHex }}>{t.vertical.name}</span></div><div className="text-sm font-semibold truncate">{t.title}</div><div className="text-xs text-muted-foreground truncate">{assigneeNames}{t.deadline ? ` · Deadline: ${formatDate(t.deadline)}` : ""}{` · Updated ${formatRelative(t.lastUpdateAt || t.updatedAt)}`}</div></div>
                  <div className="flex gap-1.5 shrink-0"><PriorityBadge code={t.priority.code} /><StatusBadge status="PARKED" /></div>
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent></Card>
    </div>
  );
}