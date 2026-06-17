import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EditTaskForm } from "./edit-form";

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const [task, verticals, priorities, teams] = await Promise.all([
    prisma.task.findUnique({ where: { id: params.id }, include: { teamAssignments: { include: { team: true } }, assignees: { include: { member: true } }, priority: true } }),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
    prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" }, include: { members: { where: { active: true }, orderBy: { sortOrder: "asc" } } } }),
  ]);
  if (!task) notFound();

  return (
    <div className="space-y-6 animate-fade-in"><PageHeader title="Edit Task" description={task.code} />
      <Card><CardContent className="p-5">
        <EditTaskForm
          task={{
            id: task.id, code: task.code, title: task.title, verticalId: task.verticalId,
            priorityId: task.priorityId, deadline: task.deadline ? task.deadline.toISOString().slice(0, 10) : "",
            frequency: task.frequency || "", source: task.source, expectedOutput: task.expectedOutput || "",
            supportNeeded: task.supportNeeded || "", delayReason: task.delayReason || "",
            nextAction: task.nextAction || "", intervention: task.intervention, status: task.status,
            teamIds: task.teamAssignments.map((ta: { teamId: string }) => ta.teamId),
            memberIds: task.assignees.map((a: { memberId: string }) => a.memberId),
          }}
          verticals={verticals.map((v) => ({ id: v.id, code: v.code, name: v.name }))}
          priorities={priorities.map((p) => ({ id: p.id, code: p.code, label: p.label }))}
          teams={teams.map((t) => ({ id: t.id, name: t.name, members: t.members.map((m) => ({ id: m.id, name: m.name, email: m.email, designation: m.designation })) }))}
        />
      </CardContent></Card>
    </div>
  );
}