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
import { Plus, Download } from "lucide-react";
import { BulkTaskList } from "./bulk-list";
import type { TaskStatus, Prisma } from "@prisma/client";
import { isEnabled } from "@/lib/features";

export default async function SmTasks({
  searchParams,
}: {
  searchParams: { vertical?: string; priority?: string; status?: string; q?: string; page?: string; dateType?: string; dateValue?: string };
}) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  // Tasks are hard-deleted now, but rows soft-deleted under the old "Dropped"
  // flow may still exist in the database. Hide them from the active register.
  const where: Prisma.TaskWhereInput = { status: { not: "DROPPED" } };
  if (searchParams.vertical) where.vertical = { code: searchParams.vertical };
  if (searchParams.priority) where.priority = { code: searchParams.priority };
  if (searchParams.status) where.status = searchParams.status as TaskStatus;
  if (searchParams.q) where.title = { contains: searchParams.q, mode: "insensitive" };

  // Exact-date filter — both params required, value must be YYYY-MM-DD
  if (searchParams.dateType && searchParams.dateValue && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dateValue)) {
    const dayStart = new Date(`${searchParams.dateValue}T00:00:00.000Z`);
    const dayEnd   = new Date(`${searchParams.dateValue}T00:00:00.000Z`);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    if (searchParams.dateType === "assigned") {
      where.createdAt = { gte: dayStart, lt: dayEnd };
    } else if (searchParams.dateType === "deadline_exact") {
      where.deadline = { gte: dayStart, lt: dayEnd };
    }
  }

  // Feature flags
  const [paginationEnabled, bulkActionsEnabled, csvEnabled, dropReasonEnabled] = await Promise.all([
    isEnabled("task_pagination"),
    isEnabled("task_bulk_actions"),
    isEnabled("csv_export"),
    isEnabled("drop_reason"),
  ]);

  // Pagination — when the flag is on we use offset-based paging (page=N, 50/page).
  // When OFF we keep the legacy single-page-of-200 behaviour.
  const PAGE_SIZE = 50;
  const pageNumber = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const skip = paginationEnabled ? (pageNumber - 1) * PAGE_SIZE : 0;
  const take = paginationEnabled ? PAGE_SIZE : 200;

  const [tasks, totalActive, verticals, priorities, ownerRoles] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ priority: { rank: "asc" } }, { updatedAt: "desc" }],
      include: { vertical: true, priority: true, ownerRole: true, subVertical: true },
      skip,
      take,
    }),
    paginationEnabled ? prisma.task.count({ where }) : Promise.resolve(0),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
    prisma.ownerRole.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = paginationEnabled ? Math.max(1, Math.ceil(totalActive / PAGE_SIZE)) : 1;

  // Preserve filters when building pagination + export links
  const queryString = new URLSearchParams();
  if (searchParams.vertical) queryString.set("vertical", searchParams.vertical);
  if (searchParams.priority) queryString.set("priority", searchParams.priority);
  if (searchParams.status) queryString.set("status", searchParams.status);
  if (searchParams.q) queryString.set("q", searchParams.q);
  if (searchParams.dateType) queryString.set("dateType", searchParams.dateType);
  if (searchParams.dateValue) queryString.set("dateValue", searchParams.dateValue);
  const baseQs = queryString.toString();

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
        description={
          paginationEnabled
            ? `${totalActive} active task${totalActive === 1 ? "" : "s"} · page ${pageNumber} of ${totalPages}`
            : `${tasks.length} active task${tasks.length === 1 ? "" : "s"}`
        }
        action={
          <div className="flex flex-wrap gap-2">
            {csvEnabled && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/api/export/tasks${baseQs ? `?${baseQs}` : ""}`}>
                  <Download className="h-4 w-4" /> Export CSV
                </Link>
              </Button>
            )}
            <Button asChild size="lg">
              <Link href="/sm/new-task"><Plus className="h-4 w-4" /> New task</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <form className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            </div>

            {/* Date filter row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end rounded-lg border border-dashed border-border bg-muted/30 p-3">
              <div className="space-y-1">
                <Label>Filter by date</Label>
                <Select name="dateType" defaultValue={searchParams.dateType || ""}>
                  <option value="">— Select type —</option>
                  <option value="assigned">Assigned Date</option>
                  <option value="deadline_exact">Deadline Date</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Pick a date</Label>
                <Input name="dateValue" type="date" defaultValue={searchParams.dateValue || ""} />
              </div>
              {searchParams.dateType && searchParams.dateValue && (
                <div className="col-span-2 text-xs text-muted-foreground self-end pb-1">
                  Showing tasks where {searchParams.dateType === "assigned" ? "assigned on" : "deadline is"}{" "}
                  <span className="font-semibold text-foreground">{searchParams.dateValue}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button asChild variant="outline" size="sm"><Link href="/sm/tasks">Reset</Link></Button>
              <Button type="submit" size="sm">Apply filters</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <BulkTaskList
        tasks={rows}
        ownerRoles={ownerRoles.map((r) => ({ id: r.id, name: r.name }))}
        bulkActionsEnabled={bulkActionsEnabled}
        dropReasonEnabled={dropReasonEnabled}
      />

      {paginationEnabled && totalPages > 1 && (
        <nav className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm" aria-label="Pagination">
          <div className="text-xs text-muted-foreground">
            Showing {skip + 1}–{Math.min(skip + tasks.length, totalActive)} of {totalActive}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" disabled={pageNumber <= 1}>
              <Link
                href={`/sm/tasks?${new URLSearchParams({ ...(baseQs ? Object.fromEntries(new URLSearchParams(baseQs)) : {}), page: String(Math.max(1, pageNumber - 1)) }).toString()}`}
                aria-disabled={pageNumber <= 1}
              >
                ← Previous
              </Link>
            </Button>
            <span className="text-xs font-semibold">
              {pageNumber} / {totalPages}
            </span>
            <Button asChild variant="outline" size="sm" disabled={pageNumber >= totalPages}>
              <Link
                href={`/sm/tasks?${new URLSearchParams({ ...(baseQs ? Object.fromEntries(new URLSearchParams(baseQs)) : {}), page: String(Math.min(totalPages, pageNumber + 1)) }).toString()}`}
                aria-disabled={pageNumber >= totalPages}
              >
                Next →
              </Link>
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
