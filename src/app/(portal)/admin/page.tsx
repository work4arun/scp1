import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative } from "@/lib/utils";
import { Layers, Tags, Users, ListChecks, Building2, ShieldCheck, Activity, History, ToggleLeft, Database } from "lucide-react";
import { FLAG_REGISTRY } from "@/lib/features";

export default async function AdminHome() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const [verticals, subVerticals, priorities, ownerRoles, users, tasks, dropped, interventions] = await Promise.all([
    prisma.vertical.count(),
    prisma.subVertical.count(),
    prisma.priority.count(),
    prisma.ownerRole.count(),
    prisma.user.count(),
    prisma.task.count(),
    prisma.task.count({ where: { status: "DROPPED" } }),
    prisma.intervention.count({ where: { resolved: false } }),
  ]);

  // Feature flag count — degrade gracefully if migration hasn't run.
  let enabledFlagCount = 0;
  try {
    enabledFlagCount = await prisma.featureFlag.count({ where: { enabled: true } });
  } catch { /* table not yet migrated */ }

  // Audit log is a newer model — degrade gracefully if migration hasn't run yet.
  let recent: Array<{
    id: string; action: string; entity: string; entityId: string | null;
    note: string | null; createdAt: Date; user: { name: string; email: string } | null;
  }> = [];
  let auditMigrationPending = false;
  try {
    recent = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { user: true } });
  } catch {
    auditMigrationPending = true;
  }

  const tiles = [
    { href: "/admin/verticals", icon: Building2, title: "Verticals", value: verticals, hint: "Top-level operational areas" },
    { href: "/admin/sub-verticals", icon: Layers, title: "Sub-Verticals", value: subVerticals, hint: "Categories inside each vertical" },
    { href: "/admin/priorities", icon: Tags, title: "Priorities", value: priorities, hint: "P1–P4 with review cadence" },
    { href: "/admin/roles", icon: Users, title: "Owner Roles", value: ownerRoles, hint: "Marketing Head, RTC Head, …" },
    { href: "/admin/users", icon: Users, title: "Users", value: users, hint: "All user accounts" },
    { href: "/admin/tasks", icon: ListChecks, title: "All Tasks", value: tasks, hint: "Master register, all verticals" },
    { href: "/admin/features", icon: ToggleLeft, title: "Feature Flags", value: `${enabledFlagCount} / ${FLAG_REGISTRY.length}`, hint: "Phase-1 enhancement toggles" },
    { href: "/admin/backup", icon: Database, title: "Backup & Restore", value: "🛟", hint: "Download a .sql snapshot or restore from one" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Super Admin" description="Configure the system and monitor activity. Every change here is logged." />

      {/* System health */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" /> System Health
            <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-bold uppercase text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Live
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Health icon={<ShieldCheck className="h-4 w-4 text-success" />} label="Database" value="Connected" tone="good" />
            <Health label="Active Tasks" value={tasks - dropped} hint={`${dropped} dropped`} />
            <Health label="Open Decisions" value={interventions} hint="Awaiting CBO" tone={interventions > 0 ? "warn" : "good"} />
            <Health label="Active Users" value={users} />
          </div>
        </CardContent>
      </Card>

      {/* Tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href}>
              <Card className="hover:border-primary/40 transition-colors h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.hint}</div>
                    </div>
                    <div className="text-2xl font-bold">{t.value}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Audit log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Recent Activity
          </CardTitle>
          <Link href="/admin/audit" className="text-xs font-semibold text-primary">View all →</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditMigrationPending ? (
            <div className="rounded-md bg-warning/10 text-warning p-3 text-xs">
              ⚠️ Audit log table not found. Run <code className="rounded bg-background px-1.5 py-0.5 font-mono">npx prisma db push &amp;&amp; npx prisma generate</code> in your project folder, then restart.
            </div>
          ) : recent.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No activity logged yet.</div>
          ) : (
            recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.action.replace(/_/g, " ").replace(/\./g, " · ")}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {a.user?.name || "system"} · {a.entity}{a.entityId ? ` (${a.entityId.slice(0, 8)}…)` : ""}
                    {a.note ? ` · ${a.note}` : ""}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 ml-3">{formatRelative(a.createdAt)}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Health({ icon, label, value, hint, tone = "neutral" }: { icon?: React.ReactNode; label: string; value: number | string; hint?: string; tone?: "good" | "warn" | "neutral" }) {
  const ringTone = tone === "good" ? "ring-success/30" : tone === "warn" ? "ring-warning/30" : "ring-border";
  return (
    <div className={`rounded-lg border border-border bg-background p-3 ring-1 ${ringTone}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
