import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function CboParking() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole)) redirect("/");

  const items = await prisma.parkingLot.findMany({
    orderBy: { createdAt: "desc" },
    include: { capturedBy: true },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Parking Lot" description="Future ideas captured respectfully — reviewed monthly. Not active execution." />

      <Card>
        <CardHeader>
          <CardTitle>{items.length} Parked Items</CardTitle>
        </CardHeader>
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
                {p.remarks ? <div className="mt-2 text-xs text-muted-foreground">{p.remarks}</div> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
