import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserForm, UserRow } from "./user-client";

export default async function UsersAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const [users, ownerRoles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { ownerRole: true },
    }),
    prisma.ownerRole.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Users" description="Manage Super Admin / CBO / SM accounts and link them to operational roles." />

      <Card>
        <CardHeader><CardTitle>Add new user</CardTitle></CardHeader>
        <CardContent>
          <UserForm ownerRoles={ownerRoles.map((r) => ({ id: r.id, name: r.name }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{users.length} users</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <UserRow
              key={u.id}
              u={{
                id: u.id, name: u.name, email: u.email, systemRole: u.systemRole,
                ownerRole: u.ownerRole?.name || null, active: u.active,
              }}
              ownerRoles={ownerRoles.map((r) => ({ id: r.id, name: r.name }))}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
