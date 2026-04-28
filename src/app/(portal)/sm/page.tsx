import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { formatRelative } from "@/lib/utils";
import { Plus, AlertTriangle, ListChecks, Inbox, Clock } from "lucide-react";

export default async function SmHome() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const [p1, delayed, waiting, openEscalations] = await Promise.all([
    prisma.task.count({ where: { priority: { code: "P1" }, status: { not: "COMPLETED" } } }),
    prisma.task.count({ where: { status: "DELAYED" } }),
    prisma.task.count({ where: { status: { in: ["WAITING_FOR_INPUT", "WAITING_FOR_APPROVAL"] } } }),
    prisma.intervention.count({ where: { resolved: false } }),
  ]);

  const myFollowups = await prisma.task.findMany({
    where: {
      OR: [
        { status: "DELAYED" },
        { status: "WAITING_FOR_INPUT" },
        { intervention: "YES" },
      ],
    },
    orderBy: [{ priority: { rank: "asc" } }, { updatedAt: "asc" }],
    take: 8,
    include: { vertical: true, priority: true, ownerRole: true },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Today"
        description="Your daily control surface — capture, follow-up, escalate."
        action={
          <Button asChild size="lg">
            <Link href="/sm/new-task"><Plus className="h-4 w-4" /> New task</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<ListChecks className="h-4 w-4" />} label="Open P1" value={p1} href="/sm/tasks?priority=P1" />
        <KpiTile icon={<Clock className="h-4 w-4 text-warning" />} label="Delayed" value={delayed} href="/sm/tasks?status=DELAYED" />
        <KpiTile icon={<Inbox className="h-4 w-4 text-primary" />} label="Waiting" value={waiting} href="/sm/tasks?status=WAITING_FOR_INPUT" />
        <KpiTile icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Escalations" value={openEscalations} href="/sm/intervention" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Follow-ups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {myFollowups.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Nothing to chase. ✨</div>
          ) : (
            myFollowups.map((t) => (
              <Link key={t.id} href={`/sm/tasks/${t.id}`} className="block">
                <div className="rounded-lg border border-border p-3 hover:bg-accent transition-colors">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t.vertical.name} · {t.ownerRole?.name || "Unassigned"} · {formatRelative(t.lastUpdateAt || t.updatedAt)}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <PriorityBadge code={t.priority.code} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <QuickAction title="Capture boss instruction" href="/sm/boss" description="Park new asks before they become noise." />
        <QuickAction title="Raise escalation" href="/sm/intervention" description="Send only decision-level matters to Dr. BN." />
        <QuickAction title="Add parking-lot idea" href="/sm/parking" description="Respectfully hold non-urgent ideas." />
      </div>
    </div>
  );
}

function KpiTile({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            {icon} {label}
          </div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({ title, href, description }: { title: string; href: string; description: string }) {
  return (
    <Link href={href}>
      <Card className="h-full hover:border-primary/40 transition-colors">
        <CardContent className="p-5">
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
