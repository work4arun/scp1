import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import { BossInstructionForm } from "./boss-form";

export default async function BossRegister() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const [verticals, instructions] = await Promise.all([
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.bossInstruction.findMany({
      orderBy: { receivedAt: "desc" },
      take: 50,
      include: { capturedBy: true },
    }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Boss Task Register" description="Capture every instruction here BEFORE turning it into an active task." />

      <Card>
        <CardHeader><CardTitle>Capture new instruction</CardTitle></CardHeader>
        <CardContent>
          <BossInstructionForm verticals={verticals.map((v) => ({ id: v.id, name: v.name }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent ({instructions.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {instructions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No instructions captured yet.</div>
          ) : (
            instructions.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{i.instruction}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {i.source.replace(/_/g, " ")} · {formatRelative(i.receivedAt)} · captured by {i.capturedBy.name}
                    </div>
                    {i.responseGiven ? (
                      <div className="mt-2 text-xs">
                        <span className="font-semibold">Response:</span> {i.responseGiven}
                      </div>
                    ) : null}
                  </div>
                  <Badge variant={i.status === "Activated" ? "success" : i.status === "Parked" ? "muted" : "info"}>
                    {i.status}
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
