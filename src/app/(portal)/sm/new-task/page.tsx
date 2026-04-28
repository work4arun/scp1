import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NewTaskForm } from "./new-task-form";

export default async function NewTaskPage() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const [verticals, subVerticals, priorities, ownerRoles] = await Promise.all([
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subVertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
    prisma.ownerRole.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="New Task" description="Capture an instruction or new activity into the register." />
      <Card>
        <CardContent className="p-5">
          <NewTaskForm
            verticals={verticals.map((v) => ({ id: v.id, code: v.code, name: v.name }))}
            subVerticals={subVerticals.map((s) => ({ id: s.id, name: s.name, verticalId: s.verticalId }))}
            priorities={priorities.map((p) => ({ id: p.id, code: p.code, label: p.label }))}
            ownerRoles={ownerRoles.map((r) => ({ id: r.id, name: r.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
