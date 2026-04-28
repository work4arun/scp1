import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EditTaskForm } from "./edit-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const [task, verticals, subVerticals, priorities, ownerRoles] = await Promise.all([
    prisma.task.findUnique({ where: { id: params.id } }),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subVertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
    prisma.ownerRole.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!task) notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Edit · ${task.code}`}
        description="Every change is logged in the task timeline as a field-level diff."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/sm/tasks/${task.id}`}><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-5">
          <EditTaskForm
            taskId={task.id}
            verticals={verticals.map((v) => ({ id: v.id, code: v.code, name: v.name }))}
            subVerticals={subVerticals.map((s) => ({ id: s.id, name: s.name, verticalId: s.verticalId }))}
            priorities={priorities.map((p) => ({ id: p.id, code: p.code, label: p.label }))}
            ownerRoles={ownerRoles.map((r) => ({ id: r.id, name: r.name }))}
            initial={{
              title: task.title,
              verticalId: task.verticalId,
              subVerticalId: task.subVerticalId,
              priorityId: task.priorityId,
              ownerRoleId: task.ownerRoleId,
              deadline: task.deadline ? task.deadline.toISOString().slice(0, 10) : "",
              frequency: task.frequency,
              source: task.source,
              expectedOutput: task.expectedOutput,
              supportNeeded: task.supportNeeded,
              nextAction: task.nextAction,
              intervention: task.intervention,
              status: task.status,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
