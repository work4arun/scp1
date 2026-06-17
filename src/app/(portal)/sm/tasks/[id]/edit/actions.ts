"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import type { TaskSource, InterventionFlag, TaskStatus, SystemRole } from "@prisma/client";
import { writeAudit } from "@/lib/audit";
import { isEnabled } from "@/lib/features";
import { friendlyPrismaError } from "@/lib/prisma-errors";
import { computeNextTaskCode } from "@/lib/task-code";

const HUMAN_FIELD: Record<string, string> = { title: "Title", verticalId: "Vertical", priorityId: "Priority", deadline: "Deadline", frequency: "Frequency", source: "Source", expectedOutput: "Expected output", supportNeeded: "Support needed", delayReason: "Delay reason", nextAction: "Next action", intervention: "Dr. BN intervention", status: "Status" };
export type UpdateTaskResult = { success: false; error: string } | { success: true; redirectTo?: string };
export type DeleteTaskResult = { success: false; error: string } | { success: true };
export type DuplicateTaskResult = { success: false; error: string } | { success: true; id: string };
export type BulkUpdateResult = { success: false; error: string } | { success: true; count: number };
const FORBIDDEN_MSG = "Your session is no longer valid or you don't have permission.";
type Authed = { ok: true; userId: string; userName: string; systemRole: SystemRole } | { ok: false; error: string };
async function checkSm(): Promise<Authed> { const session = await auth(); if (!canManageTasks(session?.user.systemRole) || !session?.user.id) return { ok: false, error: FORBIDDEN_MSG }; return { ok: true, userId: session.user.id, userName: session.user.name || "Strategic Manager", systemRole: session.user.systemRole as SystemRole }; }

export async function updateTaskAction(taskId: string, formData: FormData): Promise<UpdateTaskResult> {
  const authed = await checkSm(); if (!authed.ok) return { success: false, error: authed.error };
  const existing = await prisma.task.findUnique({ where: { id: taskId }, include: { vertical: true, priority: true, teamAssignments: { include: { team: true } } } });
  if (!existing) return { success: false, error: "Task not found." };
  const patch: Record<string, unknown> = { title: String(formData.get("title") || "").trim(), verticalId: String(formData.get("verticalId") || ""), priorityId: String(formData.get("priorityId") || ""), frequency: (formData.get("frequency") as string) || null, source: ((formData.get("source") as string) || existing.source) as TaskSource, expectedOutput: (formData.get("expectedOutput") as string) || null, supportNeeded: (formData.get("supportNeeded") as string) || null, delayReason: (formData.get("delayReason") as string) || null, nextAction: (formData.get("nextAction") as string) || null, intervention: ((formData.get("intervention") as string) || "NO") as InterventionFlag, status: ((formData.get("status") as string) || existing.status) as TaskStatus, lastUpdateAt: new Date() };
  const deadlineStr = (formData.get("deadline") as string) || ""; patch.deadline = deadlineStr ? new Date(deadlineStr) : null;
  const memberIdsRaw = (formData.get("memberIds") as string) || ""; const memberIds = memberIdsRaw ? memberIdsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const teamIdsRaw = (formData.get("teamIds") as string) || ""; const teamIds = teamIdsRaw ? teamIdsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const labels = await resolveLabels(patch, existing as any);
  const diffs = buildDiff(existing as Record<string, unknown>, patch, labels);

  try {
    await prisma.$transaction(async (tx) => { await tx.task.update({ where: { id: taskId }, data: patch }); await tx.taskAssignment.deleteMany({ where: { taskId } }); await tx.taskTeamAssignment.deleteMany({ where: { taskId } });
      if (memberIds.length > 0) await tx.taskAssignment.createMany({ data: memberIds.map((mid) => ({ taskId, memberId: mid, sendEmail: true })) });
      if (teamIds.length > 0) await tx.taskTeamAssignment.createMany({ data: teamIds.map((tid) => ({ taskId, teamId: tid, sendEmail: true })) });
    });
    if (diffs.length > 0) await prisma.taskUpdate.create({ data: { taskId, authorId: authed.userId, note: `📝 Edit:\n${diffs.join("\n")}`, newStatus: (patch.status as TaskStatus) !== existing.status ? (patch.status as TaskStatus) : null } });
  } catch (err) { return { success: false, error: friendlyPrismaError(err) ?? "Could not save." }; }
  revalidatePath(`/sm/tasks/${taskId}`); revalidatePath("/sm/tasks"); revalidatePath("/sm"); revalidatePath("/cbo");
  return { success: true, redirectTo: `/sm/tasks/${taskId}` };
}

export async function softDeleteTaskAction(taskId: string, reason: string): Promise<DeleteTaskResult> {
  const authed = await checkSm(); if (!authed.ok) return { success: false, error: authed.error };
  const task = await prisma.task.findUnique({ where: { id: taskId } }); if (!task) return { success: false, error: "Task not found." };
  await writeAudit({ actorId: authed.userId, action: "task.delete", entity: "Task", entityId: taskId, before: task, after: null, note: (reason || "").trim() || null });
  try { await prisma.task.delete({ where: { id: taskId } }); } catch (err) { return { success: false, error: friendlyPrismaError(err) ?? "Could not delete." }; }
  revalidatePath("/sm/tasks"); revalidatePath("/sm"); revalidatePath("/cbo"); return { success: true };
}

export async function duplicateTaskAction(taskId: string): Promise<DuplicateTaskResult> {
  const authed = await checkSm(); if (!authed.ok) return { success: false, error: authed.error };
  const original = await prisma.task.findUnique({ where: { id: taskId } }); if (!original) return { success: false, error: "Original task not found." };
  const vertical = await prisma.vertical.findUnique({ where: { id: original.verticalId } }); if (!vertical) return { success: false, error: "Vertical not found." };
  let created: { id: string } | null = null; let lastErr: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try { created = await prisma.$transaction(async (tx) => { const newCode = await computeNextTaskCode(tx, vertical.id, vertical.code); return tx.task.create({ data: { code: newCode, title: `${original.title} (copy)`, description: original.description, verticalId: original.verticalId, priorityId: original.priorityId, createdById: authed.userId, deadline: null, frequency: original.frequency, source: original.source, supportNeeded: original.supportNeeded, nextAction: original.nextAction, intervention: "NO", expectedOutput: original.expectedOutput, status: "NOT_STARTED", lastUpdateAt: new Date() } }); }, { maxWait: 30_000, timeout: 30_000 }); lastErr = null; break; } catch (err: unknown) { lastErr = err; if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") continue; return { success: false, error: friendlyPrismaError(err) ?? "Could not duplicate." }; }
  } if (!created) return { success: false, error: "Could not generate unique code." };
  revalidatePath("/sm/tasks"); return { success: true, id: created.id };
}

export async function bulkUpdateAction(ids: string[], patch: { status?: TaskStatus; teamId?: string | null; action?: "drop"; reason?: string }): Promise<BulkUpdateResult> {
  const authed = await checkSm(); if (!authed.ok) return { success: false, error: authed.error }; if (ids.length === 0) return { success: true, count: 0 };
  if (!(await isEnabled("task_bulk_actions"))) return { success: false, error: "Bulk actions disabled." };
  try { if (patch.action === "drop") { const snap = await prisma.task.findMany({ where: { id: { in: ids } } }); await writeAudit({ actorId: authed.userId, action: "task.bulk_delete", entity: "Task", entityId: null, before: snap, after: { ids, count: ids.length }, note: `Bulk deleted ${ids.length} task(s)` }); await prisma.task.deleteMany({ where: { id: { in: ids } } }); } else { const data: { status?: TaskStatus; lastUpdateAt: Date } = { lastUpdateAt: new Date() }; if (patch.status) data.status = patch.status; await prisma.task.updateMany({ where: { id: { in: ids } }, data }); } } catch (err) { return { success: false, error: friendlyPrismaError(err) ?? "Could not apply bulk action." }; }
  revalidatePath("/sm/tasks"); revalidatePath("/sm"); revalidatePath("/cbo"); return { success: true, count: ids.length };
}

async function resolveLabels(patch: Record<string, unknown>, existing: any) { const labels: Record<string, { from?: string | null; to?: string | null }> = {}; if (!existing) return labels; if (patch.verticalId && patch.verticalId !== existing.verticalId) { const v = await prisma.vertical.findUnique({ where: { id: patch.verticalId as string }, select: { name: true } }); labels.verticalId = { from: existing.vertical?.name, to: v?.name }; } if (patch.priorityId && patch.priorityId !== existing.priorityId) { const p = await prisma.priority.findUnique({ where: { id: patch.priorityId as string }, select: { code: true, label: true } }); labels.priorityId = { from: existing.priority ? `${existing.priority.code} ${existing.priority.label}` : null, to: p ? `${p.code} ${p.label}` : null }; } return labels; }
function buildDiff(existing: Record<string, unknown>, patch: Record<string, unknown>, labels: Record<string, { from?: string | null; to?: string | null }>) { const lines: string[] = []; for (const key of Object.keys(patch)) { if (key === "lastUpdateAt") continue; if (labels[key]) { lines.push(`• ${HUMAN_FIELD[key] ?? key}: ${fmt(labels[key].from)} → ${fmt(labels[key].to)}`); continue; } const before = existing[key]; const after = patch[key]; if (key === "deadline") { const a = before instanceof Date ? (before as Date).toISOString().slice(0, 10) : null; const b = after instanceof Date ? (after as Date).toISOString().slice(0, 10) : null; if (a !== b) lines.push(`• Deadline: ${fmt(a)} → ${fmt(b)}`); continue; } if (typeof before === "object" || typeof after === "object") continue; if ((before ?? null) !== (after ?? null)) lines.push(`• ${HUMAN_FIELD[key] ?? key}: ${fmt(before)} → ${fmt(after)}`); } return lines; }
function fmt(v: unknown) { if (v === null || v === undefined || v === "") return "—"; return String(v).replace(/_/g, " "); }