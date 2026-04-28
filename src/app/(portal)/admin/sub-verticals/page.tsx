import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubVerticalForm, SubVerticalRow } from "./sub-vertical-client";

export default async function SubVerticalsAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const [verticals, subs] = await Promise.all([
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subVertical.findMany({
      orderBy: [{ vertical: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: { vertical: true, _count: { select: { tasks: true } } },
    }),
  ]);

  // Group by vertical for nicer mobile view
  const grouped = verticals.map((v) => ({
    vertical: v,
    subs: subs.filter((s) => s.verticalId === v.id),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Sub-Verticals" description="Categories inside each vertical (e.g., Physical Marketing, Growth Card)." />

      <Card>
        <CardHeader><CardTitle>Add new sub-vertical</CardTitle></CardHeader>
        <CardContent>
          <SubVerticalForm verticals={verticals.map((v) => ({ id: v.id, name: v.name }))} />
        </CardContent>
      </Card>

      {grouped.map((g) => (
        <Card key={g.vertical.id}>
          <CardHeader className="flex flex-row items-center gap-2">
            <span className="h-6 w-6 rounded text-[10px] grid place-items-center font-bold text-white" style={{ backgroundColor: g.vertical.colorHex }}>
              {g.vertical.code}
            </span>
            <CardTitle>{g.vertical.name} <span className="text-xs text-muted-foreground font-normal">({g.subs.length})</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.subs.length === 0 ? (
              <div className="text-xs text-muted-foreground">No sub-verticals yet.</div>
            ) : (
              g.subs.map((s) => (
                <SubVerticalRow
                  key={s.id}
                  s={{ id: s.id, name: s.name, sortOrder: s.sortOrder, active: s.active, verticalId: s.verticalId, taskCount: s._count.tasks }}
                  verticals={verticals.map((v) => ({ id: v.id, name: v.name }))}
                />
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
