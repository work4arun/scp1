import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { formatRelative } from "@/lib/utils";

export default async function VerticalDetail({ params }: { params: { code: string } }) {
  const session = await auth();
  if (!isCBO(session?.user.systemRole)) redirect("/");

  const vertical = await prisma.vertical.findUnique({
    where: { code: params.code.toUpperCase() },
    include: {
      subVerticals: { orderBy: { sortOrder: "asc" } },
      tasks: {
        orderBy: [{ priority: { rank: "asc" } }, { updatedAt: "desc" }],
        include: { priority: true, ownerRole: true, subVertical: true },
      },
    },
  });
  if (!vertical) notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={vertical.name}
        description={vertical.description || undefined}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiBlock label="Total" value={vertical.tasks.length} />
        <KpiBlock label="P1" value={vertical.tasks.filter((t) => t.priority.code === "P1").length} tone="destructive" />
        <KpiBlock label="In Progress" value={vertical.tasks.filter((t) => t.status === "IN_PROGRESS").length} tone="primary" />
        <KpiBlock label="Delayed" value={vertical.tasks.filter((t) => t.status === "DELAYED").length} tone="destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sub-Verticals</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {vertical.subVerticals.map((sv) => (
            <span key={sv.id} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
              {sv.name}
            </span>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {vertical.tasks.map((t) => (
            <div key={t.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.code} · {t.subVertical?.name || "—"} · {t.ownerRole?.name || "Unassigned"} · updated {formatRelative(t.lastUpdateAt || t.updatedAt)}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <PriorityBadge code={t.priority.code} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiBlock({ label, value, tone }: { label: string; value: number; tone?: "destructive" | "primary" }) {
  const colorCls = tone === "destructive" ? "text-destructive" : tone === "primary" ? "text-primary" : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${colorCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
