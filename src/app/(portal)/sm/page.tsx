import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { formatRelative } from "@/lib/utils";
import { Plus, ListChecks, Clock, Inbox } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { TaskNotePanel } from "@/app/(portal)/cbo/task-note-panel";

export default async function SmHome() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + IST_OFFSET_MS); istNow.setUTCHours(0, 0, 0, 0);
  const startOfDay = new Date(istNow.getTime() - IST_OFFSET_MS);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const todayFilter: Prisma.TaskWhereInput = { status: { not: "DROPPED" }, OR: [{ deadline: { gte: startOfDay, lt: endOfDay } }, { createdAt: { gte: startOfDay, lt: endOfDay } }, { lastUpdateAt: { gte: startOfDay, lt: endOfDay } }] };

  const [p1Today, delayedToday, waitingToday, todaysTasks] = await Promise.all([
    prisma.task.count({ where: { AND: [todayFilter, { priority: { code: "P1" }, status: { not: "COMPLETED" } }] } }),
    prisma.task.count({ where: { AND: [todayFilter, { status: "DELAYED" }] } }),
    prisma.task.count({ where: { AND: [todayFilter, { status: { in: ["WAITING_FOR_INPUT", "WAITING_FOR_APPROVAL"] } }] } }),
    prisma.task.findMany({ where: todayFilter, orderBy: [{ priority: { rank: "asc" } }, { deadline: "asc" }, { updatedAt: "desc" }], include: { vertical: true, priority: true, teamAssignments: { include: { team: true } }, assignees: { include: { member: true } }, cboNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } } }),
  ]);

  const todayLabel = startOfDay.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today</div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{todayLabel}</h1><p className="mt-1 text-sm text-muted-foreground">{todaysTasks.length === 0 ? "No tasks scheduled, created, or updated today." : `${todaysTasks.length} task${todaysTasks.length === 1 ? "" : "s"} for today.`}</p></div><div className="shrink-0"><Button asChild size="lg"><Link href="/sm/new-task"><Plus className="h-4 w-4" /> New task</Link></Button></div></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><KpiTile icon={<ListChecks className="h-4 w-4" />} label="P1 today" value={p1Today} href="/sm/tasks?priority=P1" /><KpiTile icon={<Clock className="h-4 w-4 text-warning" />} label="Delayed today" value={delayedToday} href="/sm/tasks?status=DELAYED" /><KpiTile icon={<Inbox className="h-4 w-4 text-primary" />} label="Waiting today" value={waitingToday} href="/sm/tasks?status=WAITING_FOR_INPUT" /></div>
      <Card><CardHeader><CardTitle>Today's Tasks</CardTitle></CardHeader><CardContent className="space-y-2">
        {todaysTasks.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">Nothing scheduled, created, or updated today. ✨</div> : todaysTasks.map((t) => {
          const assigneeNames = t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a: any) => a.member.name).join(", ") || "Unassigned";
          return (
            <div key={t.id} className="rounded-lg border border-border p-3 hover:bg-accent transition-colors">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <Link href={`/sm/tasks/${t.id}`} className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{t.title}</div><div className="text-xs text-muted-foreground truncate">{t.vertical.name} · {assigneeNames} · {formatRelative(t.lastUpdateAt || t.updatedAt)}</div></Link>
                <div className="flex flex-col gap-1 shrink-0 items-end"><div className="flex gap-1.5"><PriorityBadge code={t.priority.code} /><StatusBadge status={t.status} /></div><TaskNotePanel taskId={t.id} readOnly notes={t.cboNotes.map(({ audioBytes, ...n }: any) => ({ ...n, audioBase64: audioBytes ? Buffer.from(audioBytes).toString("base64") : null }))} /></div>
              </div>
            </div>
          );
        })}
      </CardContent></Card>
    </div>
  );
}

function KpiTile({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href: string }) { return <Link href={href}><Card className="hover:border-primary/40 transition-colors"><CardContent className="p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">{icon} {label}</div><div className="mt-2 text-2xl font-bold">{value}</div></CardContent></Card></Link>; }