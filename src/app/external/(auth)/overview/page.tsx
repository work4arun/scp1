import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateToken } from "@/lib/token-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ExternalOverviewPage() {
  const token = cookies().get("ext_token")?.value;
  if (!token) redirect("/external");
  const user = await validateToken(token);
  if (!user) redirect("/external?error=invalid-token");

  const assignments = await prisma.taskAssignment.findMany({
    where: { memberId: user.memberId },
    include: { task: { select: { status: true, priority: { select: { code: true, colorHex: true } } } } },
  });

  const total = assignments.length;
  const statusMap: Record<string, number> = {};
  const priorityMap: Record<string, number> = {};
  let completed = 0;

  for (const a of assignments) {
    const s = a.task.status;
    const p = a.task.priority.code;
    statusMap[s] = (statusMap[s] || 0) + 1;
    priorityMap[p] = (priorityMap[p] || 0) + 1;
    if (s === "COMPLETED") completed++;
  }

  const pending = total - completed;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard title="Total Tasks" value={total} color="bg-primary text-primary-foreground" />
        <MetricCard title="Pending" value={pending} color="bg-amber-500 text-white" />
        <MetricCard title="Completed" value={completed} color="bg-green-600 text-white" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Status Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(statusMap).length === 0 ? (
            <p className="text-xs text-muted-foreground">No tasks assigned yet.</p>
          ) : (
            Object.entries(statusMap).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span>{status.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-muted rounded-full w-32 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold w-8 text-right">{count}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Priority Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(priorityMap).length === 0 ? (
              <p className="text-xs text-muted-foreground">No data.</p>
            ) : (
              Object.entries(priorityMap).map(([code, count]) => {
                const color = assignments.find((a) => a.task.priority.code === code)?.task.priority.colorHex || "#6b7280";
                return (
                  <div key={code} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                    {code}: {count}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg p-5 ${color}`}>
      <p className="text-xs font-medium opacity-80">{title}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}