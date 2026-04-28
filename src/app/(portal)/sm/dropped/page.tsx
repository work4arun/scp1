import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelative } from "@/lib/utils";
import { RestoreInline } from "./restore-inline";
import { ArrowLeft, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DroppedArchive() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const dropped = await prisma.task.findMany({
    where: { status: "DROPPED" },
    orderBy: { droppedAt: "desc" },
    include: { vertical: true, priority: true, ownerRole: true },
  });

  const now = Date.now();
  const within30 = (d: Date | null) => d !== null && now - d.getTime() < 30 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dropped Archive"
        description="Soft-deleted tasks. Restorable within 30 days; otherwise duplicate to recreate."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/sm/tasks"><ArrowLeft className="h-4 w-4" /> Back to register</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-4 w-4" /> {dropped.length} dropped task{dropped.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dropped.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Nothing in the archive.</div>
          ) : (
            dropped.map((t) => {
              const restorable = within30(t.droppedAt);
              return (
                <div key={t.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">{t.code} · {t.vertical.name}</div>
                      <Link href={`/sm/tasks/${t.id}`} className="text-sm font-semibold hover:text-primary">{t.title}</Link>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Dropped {t.droppedAt ? formatRelative(t.droppedAt) : "—"} · {t.droppedAt ? formatDate(t.droppedAt) : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {restorable ? (
                        <Badge variant="info">Restorable</Badge>
                      ) : (
                        <Badge variant="muted">Window expired</Badge>
                      )}
                      <RestoreInline taskId={t.id} restorable={restorable} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
