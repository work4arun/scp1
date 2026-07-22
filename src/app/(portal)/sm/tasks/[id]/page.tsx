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
import { TaskActions } from "./task-actions";
import { ConversationButton } from "@/components/conversation-button";
import { LinkifiedText } from "@/components/linkified-text";
import { SmTaskChat } from "./sm-chat";

export default async function TaskDetail({ params, searchParams }: { params: { id: string }; searchParams: { chat?: string } }) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      vertical: true, priority: true,
      teamAssignments: { include: { team: true } },
      assignees: { include: { member: { include: { team: { select: { name: true } } } } } },
      updates: { orderBy: { createdAt: "desc" }, include: { author: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!task) notFound();

  const assignedTeamNames = task.teamAssignments.map((ta) => ta.team.name);
  const assignedMembers = task.assignees.map((a) => ({
    name: a.member.name, email: a.member.email, designation: a.member.designation,
    teamName: a.member.team.name, sendEmail: a.sendEmail,
  }));

  const teams = await prisma.team.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { members: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });

  const assignedTeamIds = task.teamAssignments.map((ta) => ta.teamId);
  const assignedMemberIds = task.assignees.map((a) => a.memberId);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={task.title}
        description={`${task.code} · ${task.vertical.name}`}
        action={<TaskActions taskId={task.id} code={task.code} isSuperAdmin={session?.user.systemRole === "SUPER_ADMIN"} />}
      />
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge code={task.priority.code} /><StatusBadge status={task.status} />
        {task.intervention !== "NO" ? <Badge variant="warning">Dr. BN: {task.intervention === "YES" ? "Yes" : "Only if delayed"}</Badge> : null}
        {task.frequency ? <Badge variant="info">{task.frequency}</Badge> : null}
        <ConversationButton
          taskId={task.id}
          baseUrl="/sm/tasks"
          textCount={task.messages.filter((m) => m.text != null).length}
          voiceCount={task.messages.filter((m) => m.audioBytes != null).length}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Update form + history stay together: after filing an update the SM sees it
            land in the history immediately, instead of scrolling past the details card. */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Add Status Update</CardTitle></CardHeader>
            <CardContent>
              <TaskUpdateForm
                taskId={task.id}
                currentStatus={task.status}
                teams={teams.map((t) => ({ id: t.id, name: t.name, members: t.members.map((m) => ({ id: m.id, name: m.name, email: m.email, designation: m.designation })) }))}
                assignedTeamIds={assignedTeamIds}
                assignedMemberIds={assignedMemberIds}
              />
            </CardContent>
          </Card>
          <Card id="conversation-section">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Update History</CardTitle>
              {task.updates.length > 0 ? <span className="text-xs text-muted-foreground">{task.updates.length} entr{task.updates.length === 1 ? "y" : "ies"}</span> : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {task.updates.length === 0 ? <div className="text-sm text-muted-foreground">No updates yet.</div> : task.updates.map((u) => (
                <div key={u.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold">{u.author.name}</div>
                    <div className="text-xs text-muted-foreground" title={formatDate(u.createdAt)}>{formatRelative(u.createdAt)}</div>
                  </div>
                  <LinkifiedText text={u.note} className="mt-1.5 whitespace-pre-line break-words text-sm" />
                  {u.newStatus ? <div className="mt-2"><Badge variant="info">Status → {u.newStatus.replace(/_/g, " ")}</Badge></div> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail label="Teams" value={assignedTeamNames.length > 0 ? assignedTeamNames.join(", ") : "—"} />
            <Detail label="Assigned members" value={assignedMembers.length > 0 ? assignedMembers.map((m) => `${m.name} (${m.email})${m.designation ? ` · ${m.designation}` : ""} [${m.teamName}]`).join(", ") : "—"} />
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
      {/* SM Chat box */}
      <SmTaskChat taskId={task.id} messages={task.messages} defaultOpen={searchParams.chat === "1"} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-0.5">{value}</div></div>;
}