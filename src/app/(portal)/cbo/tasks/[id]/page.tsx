import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ConversationButton } from "@/components/conversation-button";
import { SmTaskChat } from "@/app/(portal)/sm/tasks/[id]/sm-chat";
import { TaskNotePanel } from "../../task-note-panel";
import { TaskTimeline } from "@/components/task-timeline";

export default async function CboTaskDetail({ params, searchParams }: { params: { id: string }; searchParams: { chat?: string; order?: string } }) {
  const session = await auth();
  if (!isCBO(session?.user.systemRole)) redirect("/");

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      vertical: true, priority: true,
      teamAssignments: { include: { team: true } },
      assignees: { include: { member: { include: { team: { select: { name: true } } } } } },
      updates: { orderBy: { createdAt: "desc" }, include: { author: true } },
      messages: { orderBy: { createdAt: "asc" } },
      cboNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!task) notFound();

  // Timeline reads start → end by default; ?order=desc flips it.
  const timelineOrder = searchParams.order === "desc" ? "desc" : "asc";

  const assignedTeamNames = task.teamAssignments.map((ta) => ta.team.name);
  const assignedMembers = task.assignees.map((a) => ({
    name: a.member.name, email: a.member.email, designation: a.member.designation,
    teamName: a.member.team.name, sendEmail: a.sendEmail,
  }));

  const textCount = task.messages.filter((m: any) => m.text != null).length;
  const voiceCount = task.messages.filter((m: any) => m.audioBytes != null).length;

  const notesForPanel = task.cboNotes.map(({ audioBytes, ...n }: any) => ({
    ...n,
    audioBase64: audioBytes ? Buffer.from(audioBytes).toString("base64") : null,
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={task.title}
        description={`${task.code} · ${task.vertical.name}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge code={task.priority.code} /><StatusBadge status={task.status} />
        {task.intervention !== "NO" ? <Badge variant="warning">Dr. BN: {task.intervention === "YES" ? "Yes" : "Only if delayed"}</Badge> : null}
        {task.frequency ? <Badge variant="info">{task.frequency}</Badge> : null}
        <ConversationButton
          taskId={task.id}
          baseUrl="/cbo/tasks"
          textCount={textCount}
          voiceCount={voiceCount}
        />
      </div>

      {/* Details + CBO Notes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
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
            {task.description && <Detail label="Description" value={task.description} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>CBO Notes</CardTitle></CardHeader>
          <CardContent>
            <TaskNotePanel taskId={task.id} notes={notesForPanel} readOnly={false} />
          </CardContent>
        </Card>
      </div>

      {/* Follow-up timeline — every update for this task, day by day, start to end. */}
      <Card id="timeline">
        <CardHeader><CardTitle>Follow-Up Timeline</CardTitle></CardHeader>
        <CardContent>
          <TaskTimeline
            entries={task.updates.map((u) => ({
              id: u.id,
              createdAt: u.createdAt,
              note: u.note,
              newStatus: u.newStatus,
              authorName: u.author.name,
            }))}
            order={timelineOrder}
            toggleHref={`/cbo/tasks/${task.id}${timelineOrder === "asc" ? "?order=desc" : ""}#timeline`}
          />
        </CardContent>
      </Card>

      {/* Chat / Conversation */}
      <Card id="conversation-section"><CardHeader><CardTitle>Conversation</CardTitle></CardHeader>
        <CardContent>
          <SmTaskChat taskId={task.id} messages={task.messages} defaultOpen={searchParams.chat === "1"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-0.5">{value}</div></div>;
}