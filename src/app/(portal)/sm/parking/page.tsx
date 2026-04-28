import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ParkingForm } from "./parking-form";

export default async function SmParking() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const [verticals, items] = await Promise.all([
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.parkingLot.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Parking Lot" description="Capture non-urgent ideas without disturbing current execution." />

      <Card>
        <CardHeader><CardTitle>Add to parking lot</CardTitle></CardHeader>
        <CardContent>
          <ParkingForm verticals={verticals.map((v) => ({ id: v.id, name: v.name }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{items.length} items parked</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No parking lot items yet.</div>
          ) : (
            items.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{p.idea}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Suggested by {p.suggestedBy} · captured {formatDate(p.createdAt)}
                    </div>
                  </div>
                  <Badge variant={p.decision === "Activate" ? "success" : p.decision === "Review" ? "warning" : "muted"}>
                    {p.decision}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
