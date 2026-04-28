import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityForm, PriorityRow } from "./priority-client";

export default async function PrioritiesAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const priorities = await prisma.priority.findMany({
    orderBy: { rank: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Priorities" description="P1–P4 with review cadence. Add custom priority levels if needed." />

      <Card>
        <CardHeader><CardTitle>Add new priority</CardTitle></CardHeader>
        <CardContent><PriorityForm /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{priorities.length} priorities</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {priorities.map((p) => (
            <PriorityRow
              key={p.id}
              p={{
                id: p.id, code: p.code, label: p.label, description: p.description,
                reviewCadence: p.reviewCadence, colorHex: p.colorHex, rank: p.rank,
                active: p.active, taskCount: p._count.tasks,
              }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
