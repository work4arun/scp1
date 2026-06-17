import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { VerticalForm, VerticalRow } from "./vertical-client";

export default async function VerticalsAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const verticals = await prisma.vertical.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Verticals" description="Manage the functional areas tracked in the register." />
      <Card>
        <CardHeader><CardTitle>Add new vertical</CardTitle></CardHeader>
        <CardContent><VerticalForm /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{verticals.length} verticals</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {verticals.map((v) => (
            <VerticalRow
              key={v.id}
              v={{
                id: v.id, code: v.code, name: v.name, description: v.description,
                colorHex: v.colorHex, sortOrder: v.sortOrder, active: v.active,
                taskCount: v._count.tasks,
              }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}