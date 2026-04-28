import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { formatRelative, formatDate } from "@/lib/utils";
import { TaskUpdateForm } from "./update-form";
import { EscalateForm } from "./escalate-form";
import { TaskActions } from "./task-actions";

export default async function TaskDetail({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      vertical: true,
      subVertical: true,
      priority: true,
      ownerRole: true,
      ownerUser: true,
      updates: { orderBy: { createdAt: "desc" }, include: { author: true } },
      interventions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!task) notFound();

  const hasOpenEscalation = task.interventions.some((i) => !i.resolved);
  const isDropped = task.status === "DROPPED";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={task.title}
        description={`${task.code} · ${task.vertical.name}${task.subVertical ? ` · ${task.subVertical.name}` : ""}`}
        action={
          <TaskActions
            taskId={task.id}
            code={task.code}
            status={task.status}
            hasOpenEscalation={hasOpenEscalation}
            droppedAtIso={task.droppedAt ? task.droppedAt.toISOString() : null}
          />
        }
      />

      <div className="flex flex-wrap gap-2">
        <PriorityBadge code={task.priority.code} />
        <StatusBadge status={task.status} />
        {task.intervention !== "NO" ? (
          <Badge variant="warning">Dr. BN: {task.intervention === "YES" ? "Yes" : "Only if delayed"}</Badge>
        ) : null}
        {task.frequency ? <Badge variant="info">{task.frequency}</Badge> : null}
        {isDropped && task.droppedAt ? (
          <Badge variant="muted">Dropped {formatRelative(task.droppedAt)}</Badge>
        ) : null}
      </div>

      {!isDropped && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Add Status Update</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskUpdateForm taskId={task.id} currentStatus={task.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Detail label="Owner role" value={task.ownerRole?.name || "—"} />
              <Detail label="Owner user" value={task.ownerUser?.name || "—"} />
              <Detail label="Deadline" value={task.deadline ? formatDate(task.deadline) : "—"} />
              <Detail label="Frequency" value={task.frequency || "—"} />
              <Detail label="Source" value={task.source.replace(/_/g, " ")} />
              <Detail label="Support needed" value={task.supportNeeded || "—"} />
              <Detail label="Delay reason" value={task.delayReason || "—"} />
              <Detail label="Next action" value={task.nextAction || "—"} />
              <Detail label="Expected output" value={task.expectedOutput || "—"} />
            </CardContent>
          </Card>
        </div>
      )}

      {!isDropped && (
        <Card>
          <CardHeader><CardTitle>Escalate to Dr. BN</CardTitle></CardHeader>
          <CardContent><EscalateForm taskId={task.id} /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Update History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {task.updates.length === 0 ? (
            <div className="text-sm text-muted-foreground">No updates yet.</div>
          ) : (
            task.updates.map((u) => (
              <div key={u.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold">{u.author.name}</div>
                  <div className="text-xs text-muted-foreground">{formatRelative(u.createdAt)}</div>
                </div>
                <div className="mt-1.5 whitespace-pre-line text-sm">{u.note}</div>
                {u.newStatus ? (
                  <div className="mt-2"><Badge variant="info">Status → {u.newStatus.replace(/_/g, " ")}</Badge></div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
