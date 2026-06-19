import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { validateToken } from "@/lib/token-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { formatRelative, formatDate } from "@/lib/utils";
import { TaskChat } from "./chat-box";

export default async function ExternalTaskDetail({ params }: { params: { id: string } }) {
  const token = cookies().get("ext_token")?.value;
  if (!token) redirect("/external");
  const user = await validateToken(token);
  if (!user) redirect("/external?error=invalid-token");

  // Verify this member is assigned to this task
  const assignment = await prisma.taskAssignment.findUnique({
    where: { taskId_memberId: { taskId: params.id, memberId: user.memberId } },
  });
  if (!assignment) redirect("/external/tasks");

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      vertical: true, priority: true,
      teamAssignments: { include: { team: true } },
      assignees: { include: { member: { include: { team: { select: { name: true } } } } } },
      updates: { orderBy: { createdAt: "desc" }, include: { author: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
    },
  });
  if (!task) notFound();

  const assignedTeamNames = task.teamAssignments.map((ta) => ta.team.name);
  const assignedMembers = task.assignees.map((a) => ({
    name: a.member.name, email: a.member.email, designation: a.member.designation,
    teamName: a.member.team.name,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold">{task.title}</h1>
      <p className="text-xs text-muted-foreground">{task.code} · {task.vertical.name}</p>

      <div className="flex flex-wrap gap-2">
        <PriorityBadge code={task.priority.code} />
        <StatusBadge status={task.status} />
        {task.intervention !== "NO" ? (
          <Badge variant="warning">Dr. BN: {task.intervention === "YES" ? "Yes" : "Only if delayed"}</Badge>
        ) : null}
      </div>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Detail label="Teams" value={assignedTeamNames.length > 0 ? assignedTeamNames.join(", ") : "—"} />
          <Detail label="Assigned members" value={assignedMembers.length > 0 ? assignedMembers.map((m) => `${m.name} (${m.email})`).join(", ") : "—"} />
          <Detail label="Deadline" value={task.deadline ? formatDate(task.deadline) : "—"} />
          <Detail label="Frequency" value={task.frequency || "—"} />
          <Detail label="Source" value={task.source.replace(/_/g, " ")} />
          <Detail label="Expected output" value={task.expectedOutput || "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Update History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {task.updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
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

      {/* Chat box */}
      <TaskChat taskId={task.id} memberId={user.memberId} memberName={user.memberName} messages={task.messages} />
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