import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateToken } from "@/lib/token-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, StatusBadge } from "@/components/status-badges";
import Link from "next/link";

export default async function ExternalTasksPage() {
  const token = cookies().get("ext_token")?.value;
  if (!token) redirect("/external");
  const user = await validateToken(token);
  if (!user) redirect("/external?error=invalid-token");

  const assignments = await prisma.taskAssignment.findMany({
    where: { memberId: user.memberId },
    include: {
      task: {
        include: {
          vertical: { select: { name: true, code: true } },
          priority: true,
          teamAssignments: { include: { team: { select: { name: true } } } },
          assignees: { include: { member: { select: { name: true } } } },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  const tasks = assignments.map((a) => a.task);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Tasks</h1>
        <p className="text-xs text-muted-foreground">{tasks.length} task(s)</p>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No tasks assigned to you yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/external/tasks/${task.id}`}
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {task.code} · {task.vertical.name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <PriorityBadge code={task.priority.code} />
                  <StatusBadge status={task.status} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                {task.teamAssignments.length > 0 && (
                  <span>Teams: {task.teamAssignments.map((ta) => ta.team.name).join(", ")}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}