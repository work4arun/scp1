import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OwnerRoleForm, OwnerRoleRow } from "./role-client";

export default async function RolesAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const roles = await prisma.ownerRole.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Owner Roles"
        description="Operational roles assigned as task owners (Marketing Head, RTC Head, …). The owner contact is just a name + email for communication — it does not create a login. Logins are managed on Users."
      />

      <Card>
        <CardHeader><CardTitle>Add new role</CardTitle></CardHeader>
        <CardContent><OwnerRoleForm /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{roles.length} roles</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {roles.map((r) => (
            <OwnerRoleRow
              key={r.id}
              r={{
                id: r.id,
                name: r.name,
                description: r.description,
                active: r.active,
                taskCount: r._count.tasks,
                ownerName: r.ownerName,
                ownerEmail: r.ownerEmail,
              }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
