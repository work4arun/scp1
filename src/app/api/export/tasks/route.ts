import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isEnabled } from "@/lib/features";
import type { Prisma } from "@prisma/client";
import { writeAudit } from "@/lib/audit";
import { buildTaskWhere } from "@/app/(portal)/cbo/task-filter-utils";

function csvEscape(value: unknown): string { if (value === null || value === undefined) return ""; const s = String(value); if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`; return s; }

export async function GET(req: Request) {
  const session = await auth(); if (!canManageTasks(session?.user.systemRole) || !session?.user.id) return new NextResponse("Forbidden", { status: 403 });
  if (!(await isEnabled("csv_export"))) return new NextResponse("CSV export is disabled.", { status: 403 });

  const url = new URL(req.url); const sp = url.searchParams;
  const filterWhere = buildTaskWhere({ q: sp.get("q") ?? undefined, vertical: sp.get("vertical") ?? undefined, priority: sp.get("priority") ?? undefined, status: sp.get("status") ?? undefined, team: sp.get("team") ?? undefined, intervention: sp.get("intervention") ?? undefined });
  const where: Prisma.TaskWhereInput = sp.get("status") ? filterWhere : { ...filterWhere, status: { not: "DROPPED" } };

  const tasks = await prisma.task.findMany({ where, orderBy: [{ priority: { rank: "asc" } }, { updatedAt: "desc" }], include: { vertical: true, priority: true, teamAssignments: { include: { team: true } }, assignees: { include: { member: true } } }, take: 10000 });

  const headers = ["Code", "Title", "Vertical", "Priority", "Status", "Assigned Teams", "Assigned Members", "Source", "Deadline", "Last Update", "Created", "Intervention"];
  const rows = tasks.map((t) => [t.code, t.title, t.vertical.name, `${t.priority.code} — ${t.priority.label}`, t.status, t.teamAssignments.map((ta) => ta.team.name).join("; "), t.assignees.map((a) => `${a.member.name} <${a.member.email}>`).join("; "), t.source, t.deadline ? t.deadline.toISOString().slice(0, 10) : "", t.lastUpdateAt ? t.lastUpdateAt.toISOString() : "", t.createdAt.toISOString(), t.intervention]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

  await writeAudit({ actorId: session.user.id, action: "task.export_csv", entity: "Task", after: { count: tasks.length }, note: `Exported ${tasks.length} task(s) as CSV` });
  return new NextResponse(csv, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="tasks-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}