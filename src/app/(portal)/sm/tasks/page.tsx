import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Archive } from "lucide-react";
import { BulkTaskList } from "./bulk-list";
import type { TaskStatus, Prisma } from "@prisma/client";

export default async function SmTasks({
  searchParams,
}: {
  searchParams: { vertical?: string; priority?: string; status?: string; q?: string };
}) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const where: Prisma.TaskWhereInput = { status: { not: "DROPPED" } };
  if (searchParams.vertical) where.vertical = { code: searchParams.vertical };
  if (searchParams.priority) where.priority = { code: searchParams.priority };
  if (searchParams.status) where.status = searchParams.status as TaskStatus;
  if (searchParams.q) where.title = { contains: searchParams.q, mode: "insensitive" };

  const [tasks, verticals, priorities, ownerRoles, droppedCount] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ priority: { rank: "asc" } }, { updatedAt: "desc" }],
      include: { vertical: true, priority: true, ownerRole: true, subVertical: true },
      take: 200,
    }),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
    prisma.ownerRole.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.task.count({ where: { status: "DROPPED" } }),
  ]);

  const rows = tasks.map((t) => ({
    id: t.id,
    code: t.code,
    title: t.title,
    vertical: t.vertical.name,
    subVertical: t.subVertical?.name || null,
    ownerRole: t.ownerRole?.name || null,
    priority: t.priority.code,
    status: t.status,
    updatedAt: (t.lastUpdateAt || t.updatedAt).toISOString(),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Task Register"
        description={`${tasks.length} active task${tasks.length === 1 ? "" : "s"}`}
        action={
          <div className="flex flex-wrap gap-2">
            {droppedCount > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/sm/dropped"><Archive className="h-4 w-4" /> Dropped ({droppedCount})</Link>
              </Button>
            )}
            <Button asChild size="lg">
              <Link href="/sm/new-task"><Plus className="h-4 w-4" /> New task</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <form className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Search</Label>
              <Input name="q" defaultValue={searchParams.q || ""} placeholder="Title…" />
            </div>
            <div className="space-y-1">
              <Label>Vertical</Label>
              <Select name="vertical" defaultValue={searchParams.vertical || ""}>
                <option value="">All</option>
                {verticals.map((v) => <option key={v.id} value={v.code}>{v.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select name="priority" defaultValue={searchParams.priority || ""}>
                <option value="">All</option>
                {priorities.map((p) => <option key={p.id} value={p.code}>{p.code} — {p.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select name="status" defaultValue={searchParams.status || ""}>
                <option value="">All (active)</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_INPUT">Waiting Input</option>
                <option value="WAITING_FOR_APPROVAL">Waiting Approval</option>
                <option value="DELAYED">Delayed</option>
                <option value="COMPLETED">Completed</option>
                <option value="PARKED">Parked</option>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-4 flex justify-end gap-2">
              <Button asChild variant="outline" size="sm"><Link href="/sm/tasks">Reset</Link></Button>
              <Button type="submit" size="sm">Apply filters</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <BulkTaskList tasks={rows} ownerRoles={ownerRoles.map((r) => ({ id: r.id, name: r.name }))} />
    </div>
  );
}
