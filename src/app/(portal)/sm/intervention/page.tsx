import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";

export default async function SmIntervention() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const items = await prisma.intervention.findMany({
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    include: { task: { include: { vertical: true } } },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Escalation Queue" description="Track all decisions you've sent up to Dr. BN." />

      <Card>
        <CardHeader><CardTitle>{items.filter((i) => !i.resolved).length} open · {items.filter((i) => i.resolved).length} resolved</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No escalations yet. Open a task and use <strong>Escalate to Dr. BN</strong> to add one.
            </div>
          ) : (
            items.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{i.issue}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {i.task?.vertical?.name || "—"} · {formatRelative(i.createdAt)}
                      {i.task ? <> · <Link href={`/sm/tasks/${i.task.id}`} className="text-primary font-medium">View task</Link></> : null}
                      {!i.resolved ? <> · <Link href={`/calendar/book?intervention=${i.id}`} className="text-primary font-medium">📅 Book a meeting</Link></> : null}
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="font-semibold">Decision:</span> {i.decisionRequired}
                    </div>
                    {i.cboNote ? (
                      <div className="mt-2 rounded-md bg-accent/50 border border-accent p-2 text-xs">
                        <span className="font-bold">📩 Note from Dr. BN:</span> {i.cboNote}
                      </div>
                    ) : null}
                    {i.resolved && i.resolutionNote ? (
                      <div className="mt-2 rounded-md bg-success/10 border border-success/20 p-2 text-xs">
                        <span className="font-bold text-success">✓ Decision:</span> {i.resolutionNote}
                      </div>
                    ) : null}
                  </div>
                  <Badge variant={i.resolved ? "success" : "warning"}>{i.resolved ? "Resolved" : "Open"}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
