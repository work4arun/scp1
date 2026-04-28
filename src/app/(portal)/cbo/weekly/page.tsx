import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CboWeekly() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole)) redirect("/");

  const verticals = await prisma.vertical.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      tasks: { include: { priority: true } },
    },
  });

  const summary = verticals.map((v) => {
    const total = v.tasks.length;
    const completed = v.tasks.filter((t) => t.status === "COMPLETED").length;
    const inProgress = v.tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const delayed = v.tasks.filter((t) => t.status === "DELAYED").length;
    const p1 = v.tasks.filter((t) => t.priority.code === "P1").length;
    return { vertical: v, total, completed, inProgress, delayed, p1 };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Weekly Strategic Summary" description="Send this every Saturday or Monday — also shareable with the board." />

      <Card>
        <CardHeader>
          <CardTitle>Vertical Roll-up</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">Vertical</th>
                <th className="py-2 pr-3 text-center">Total</th>
                <th className="py-2 pr-3 text-center">P1</th>
                <th className="py-2 pr-3 text-center">In Progress</th>
                <th className="py-2 pr-3 text-center">Delayed</th>
                <th className="py-2 pr-3 text-center">Completed</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.vertical.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-3 font-semibold flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.vertical.colorHex }} />
                    {s.vertical.name}
                  </td>
                  <td className="py-2.5 pr-3 text-center">{s.total}</td>
                  <td className="py-2.5 pr-3 text-center text-destructive font-bold">{s.p1}</td>
                  <td className="py-2.5 pr-3 text-center">{s.inProgress}</td>
                  <td className="py-2.5 pr-3 text-center text-destructive">{s.delayed}</td>
                  <td className="py-2.5 pr-3 text-center text-success">{s.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>What needs your decision</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm list-disc pl-5 text-muted-foreground">
              <li>Open the <strong>Decisions Awaiting You</strong> queue from the Master Dashboard.</li>
              <li>Approve or defer items with attached notes from the Senior Manager.</li>
              <li>Items left unactioned roll forward and surface in tomorrow's daily summary.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>What you should NOT review</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm list-disc pl-5 text-muted-foreground">
              <li>Operational P3 items — Senior Manager closes these.</li>
              <li>Parking Lot ideas — review monthly only.</li>
              <li>Routine status updates with no decision attached.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
