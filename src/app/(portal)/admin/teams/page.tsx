import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamForm, TeamRow } from "./team-client";

export default async function TeamsAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      members: { orderBy: { sortOrder: "asc" } },
      taskAssignments: true,
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Teams" description="Create teams and manage their members for task assignment." />

      <Card>
        <CardHeader><CardTitle>Add new team</CardTitle></CardHeader>
        <CardContent>
          <TeamForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{teams.length} teams</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {teams.map((t) => (
            <TeamRow
              key={t.id}
              team={{
                id: t.id,
                name: t.name,
                description: t.description,
                active: t.active,
                memberCount: t.members.length,
                taskCount: t.taskAssignments.length,
                members: t.members.map((m) => ({
                  id: m.id,
                  name: m.name,
                  email: m.email,
                  designation: m.designation,
                  sortOrder: m.sortOrder,
                })),
              }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}