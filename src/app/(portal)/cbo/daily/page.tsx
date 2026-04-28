import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";

export default async function CboDaily() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole)) redirect("/");

  const [p1Today, delayed, decisions, leadersPending, bossInstructions] = await Promise.all([
    prisma.task.findMany({
      where: { priority: { code: "P1" } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { vertical: true, priority: true, ownerRole: true },
    }),
    prisma.task.findMany({
      where: { status: "DELAYED" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { vertical: true, priority: true, ownerRole: true },
    }),
    prisma.intervention.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { task: { include: { vertical: true } } },
    }),
    prisma.task.groupBy({
      by: ["ownerRoleId"],
      where: { status: { in: ["WAITING_FOR_INPUT", "DELAYED", "IN_PROGRESS"] } },
      _count: { _all: true },
    }),
    prisma.bossInstruction.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const ownerRoles = await prisma.ownerRole.findMany({
    where: { id: { in: leadersPending.map((g) => g.ownerRoleId).filter(Boolean) as string[] } },
  });
  const ownerLabel = (id: string | null) => ownerRoles.find((o) => o.id === id)?.name || "Unassigned";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Daily Control Summary" description="One-page view your Senior Manager sends each morning." />

      <Card>
        <CardHeader>
          <CardTitle>Today's P1 Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {p1Today.map((t) => (
            <Row key={t.id} title={t.title} meta={t.vertical.name} owner={t.ownerRole?.name} priority={t.priority.code} status={t.status} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delayed Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {delayed.length === 0 ? <div className="text-sm text-muted-foreground">None.</div> : delayed.map((t) => (
            <Row key={t.id} title={t.title} meta={t.vertical.name} owner={t.ownerRole?.name} priority={t.priority.code} status={t.status} />
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Decisions Needed from Dr. BN</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {decisions.length === 0 ? <div className="text-sm text-muted-foreground">No decisions waiting.</div> : decisions.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3">
                <div className="text-sm font-semibold">{i.issue}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <strong className="text-foreground">Decision:</strong> {i.decisionRequired}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Leaders Pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leadersPending.length === 0 ? <div className="text-sm text-muted-foreground">All leaders responding.</div> : leadersPending.map((g) => (
              <div key={g.ownerRoleId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                <span className="font-medium">{ownerLabel(g.ownerRoleId)}</span>
                <span className="text-xs text-muted-foreground">{g._count._all} pending</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Boss Instructions Captured</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bossInstructions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No new instructions captured.</div>
          ) : (
            bossInstructions.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="font-medium">{i.instruction}</div>
                <div className="mt-1 text-xs text-muted-foreground">{i.source}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  title,
  meta,
  owner,
  priority,
  status,
}: {
  title: string;
  meta: string;
  owner?: string | null;
  priority: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "WAITING_FOR_INPUT" | "WAITING_FOR_APPROVAL" | "DELAYED" | "COMPLETED" | "PARKED" | "DROPPED";
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{meta}{owner ? ` · ${owner}` : ""}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <PriorityBadge code={priority} />
        <StatusBadge status={status} />
      </div>
    </div>
  );
}
