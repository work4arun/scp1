import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import { InterventionPanel } from "./intervention-panel";

export default async function CboIntervention() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole) || !session?.user.id) redirect("/");

  const now = new Date();
  const [open, snoozed, resolved, pinned] = await Promise.all([
    prisma.intervention.findMany({
      where: { resolved: false, OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }] },
      orderBy: { createdAt: "desc" },
      include: { task: { include: { vertical: true } }, raisedBy: true },
    }),
    prisma.intervention.findMany({
      where: { resolved: false, snoozedUntil: { gt: now } },
      orderBy: { snoozedUntil: "asc" },
      include: { task: { include: { vertical: true } } },
    }),
    prisma.intervention.findMany({
      where: { resolved: true },
      orderBy: { resolvedAt: "desc" },
      take: 10,
      include: { task: { include: { vertical: true } } },
    }),
    prisma.pin.findMany({ where: { userId: session.user.id, kind: "intervention" } }),
  ]);

  const pinnedIds = new Set(pinned.map((p) => p.refId));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Decisions Awaiting You" description="Approve, defer, snooze, or drop a private note for the SM. Only items needing your call appear here." />

      <Card>
        <CardHeader><CardTitle>Open ({open.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {open.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">All clear. No pending decisions. 🎯</div>
          ) : (
            open.map((i) => (
              <InterventionPanel
                key={i.id}
                id={i.id}
                issue={i.issue}
                whyNeeded={i.whyNeeded}
                decisionRequired={i.decisionRequired}
                noteAttached={i.noteAttached}
                cboNote={i.cboNote}
                vertical={i.task?.vertical?.name || "—"}
                raisedBy={i.raisedBy.name}
                createdAt={i.createdAt.toISOString()}
                pinned={pinnedIds.has(i.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {snoozed.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Snoozed ({snoozed.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {snoozed.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{i.issue}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.task?.vertical?.name || "—"} · returns {i.snoozedUntil ? formatRelative(i.snoozedUntil) : "—"}
                    </div>
                  </div>
                  <Badge variant="muted">Snoozed</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Recently Resolved</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {resolved.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nothing resolved yet.</div>
          ) : (
            resolved.map((i) => (
              <div key={i.id} className="flex flex-col gap-1 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{i.issue}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.task?.vertical?.name || "—"} · {formatRelative(i.resolvedAt)}
                    {i.decisionType ? ` · ${i.decisionType.replace(/_/g, " ")}` : ""}
                  </div>
                </div>
                <Badge variant="success">Resolved</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
