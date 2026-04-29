// CSV export of the task register. Honours the same filters as /sm/tasks.
// Gated by the `csv_export` feature flag — returns 403 when the flag is off.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isEnabled } from "@/lib/features";
import type { TaskStatus, Prisma } from "@prisma/client";
import { writeAudit } from "@/lib/audit";

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
  const where: Prisma.TaskWhereInput = { status: { not: "DROPPED" } };
  const vertical = url.searchParams.get("vertical");
  const priority = url.searchParams.get("priority");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  if (vertical) where.vertical = { code: vertical };
  if (priority) where.priority = { code: priority };
  if (status) where.status = status as TaskStatus;
  if (q) where.title = { contains: q, mode: "insensitive" };

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
    after: { count: tasks.length, filters: { vertical, priority, status, q } },
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
