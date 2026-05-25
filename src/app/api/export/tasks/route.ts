// CSV export of the task register. Honours the same filters as /sm/tasks.
// Gated by the `csv_export` feature flag — returns 403 when the flag is off.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isEnabled } from "@/lib/features";
import type { Prisma } from "@prisma/client";
import { writeAudit } from "@/lib/audit";
import { buildTaskWhere } from "@/app/(portal)/cbo/task-filter-utils";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!(await isEnabled("csv_export"))) {
    return new NextResponse(
      "CSV export is disabled. Enable the feature flag at /admin/features.",
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const sp = url.searchParams;

  // Re-use the same shared filter builder as /sm/tasks and /cbo so that all
  // filter dimensions (including date range) are honoured identically.
  const filterWhere = buildTaskWhere({
    q:            sp.get("q")           ?? undefined,
    vertical:     sp.get("vertical")    ?? undefined,
    subVertical:  sp.get("subVertical") ?? undefined,
    priority:     sp.get("priority")    ?? undefined,
    status:       sp.get("status")      ?? undefined,
    ownerRole:    sp.get("ownerRole")   ?? undefined,
    ownerUser:    sp.get("ownerUser")   ?? undefined,
    source:       sp.get("source")      ?? undefined,
    intervention: sp.get("intervention")?? undefined,
    deadline:     sp.get("deadline")    ?? undefined,
    dateType:     sp.get("dateType")    ?? undefined,
    dateValue:    sp.get("dateValue")   ?? undefined,
    dateFrom:     sp.get("dateFrom")    ?? undefined,
    dateTo:       sp.get("dateTo")      ?? undefined,
  });

  // Always exclude DROPPED tasks unless a specific status filter was applied.
  const where: Prisma.TaskWhereInput = sp.get("status")
    ? filterWhere
    : { ...filterWhere, status: { not: "DROPPED" } };

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ priority: { rank: "asc" } }, { updatedAt: "desc" }],
    include: {
      vertical: true,
      subVertical: true,
      priority: true,
      ownerRole: true,
      ownerUser: true,
      subOwner: true,
    },
    // We allow the full result here because this is a one-off batch export.
    take: 10000,
  });

  const headers = [
    "Code",
    "Title",
    "Vertical",
    "Sub-Vertical",
    "Priority",
    "Status",
    "Owner Role",
    "Owner",
    "Sub-Owner",
    "Source",
    "Deadline",
    "SLA Due",
    "SLA Breached",
    "Last Update",
    "Created",
    "Intervention",
  ];
  const rows = tasks.map((t) => [
    t.code,
    t.title,
    t.vertical.name,
    t.subVertical?.name ?? "",
    `${t.priority.code} — ${t.priority.label}`,
    t.status,
    t.ownerRole?.name ?? "",
    t.ownerUser ? `${t.ownerUser.name} <${t.ownerUser.email}>` : "",
    t.subOwner ? `${t.subOwner.name} <${t.subOwner.email}>` : "",
    t.source,
    t.deadline ? t.deadline.toISOString().slice(0, 10) : "",
    t.slaDueAt ? t.slaDueAt.toISOString() : "",
    t.slaBreachedAt ? t.slaBreachedAt.toISOString() : "",
    t.lastUpdateAt ? t.lastUpdateAt.toISOString() : "",
    t.createdAt.toISOString(),
    t.intervention,
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const filename = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;

  await writeAudit({
    actorId: session.user.id,
    action: "task.export_csv",
    entity: "Task",
    after: {
      count: tasks.length,
      filters: Object.fromEntries([...sp.entries()]),
    },
    note: `Exported ${tasks.length} task(s) as CSV`,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
