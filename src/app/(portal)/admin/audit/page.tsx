import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelative, formatDate } from "@/lib/utils";

export default async function AuditPage() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Audit Log" description="Last 200 system-impacting actions, newest first." />
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No log entries yet.</div>
          ) : (
            logs.map((a) => (
              <div key={a.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{a.action.replace(/_/g, " ").replace(/\./g, " · ")}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.user?.name || "system"} · {a.user?.email || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {a.entity}{a.entityId ? ` · ${a.entityId}` : ""}
                  </div>
                  {a.note ? <div className="text-xs mt-1">{a.note}</div> : null}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {formatRelative(a.createdAt)} · {formatDate(a.createdAt)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
