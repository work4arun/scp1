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
import { sendEmail } from "@/lib/email";
import { getOrCreateToken } from "@/lib/token-auth";

const HUMAN_FIELD: Record<string, string> = { title: "Title", verticalId: "Vertical", priorityId: "Priority", deadline: "Deadline", frequency: "Frequency", source: "Source", expectedOutput: "Expected output", supportNeeded: "Support needed", delayReason: "Delay reason", nextAction: "Next action", intervention: "Dr. BN intervention", status: "Status" };
export type UpdateTaskResult = { success: false; error: string } | { success: true; redirectTo?: string };
export type DeleteTaskResult = { success: false; error: string } | { success: true };
export type DuplicateTaskResult = { success: false; error: string } | { success: true; id: string };
export type BulkUpdateResult = { success: false; error: string } | { success: true; count: number };
const FORBIDDEN_MSG = "Your session is no longer valid or you don't have permission.";
type Authed = { ok: true; userId: string; userName: string; systemRole: SystemRole } | { ok: false; error: string };
async function checkSm(): Promise<Authed> { const session = await auth(); if (!canManageTasks(session?.user.systemRole) || !session?.user.id) return { ok: false, error: FORBIDDEN_MSG }; return { ok: true, userId: session.user.id, userName: session.user.name || "Strategic Manager", systemRole: session.user.systemRole as SystemRole }; }

function parseIdList(value: string): string[] {
  return value ? value.split(",").map((id) => id.trim()).filter(Boolean) : [];
}

function interventionColor(flag: InterventionFlag) {
  if (flag === "YES") return "#dc2626";
  if (flag === "ONLY_IF_DELAYED") return "#2563eb";
  return "#16a34a";
}
function interventionLabel(flag: InterventionFlag) {
  if (flag === "YES") return "Yes";
  if (flag === "ONLY_IF_DELAYED") return "Only if delayed";
  return "No";
}

export async function updateTaskAction(taskId: string, formData: FormData): Promise<UpdateTaskResult> {
  const authed = await checkSm(); if (!authed.ok) return { success: false, error: authed.error };
  const existing = await prisma.task.findUnique({ where: { id: taskId }, include: { vertical: true, priority: true, teamAssignments: { include: { team: true } } } });
  if (!existing) return { success: false, error: "Task not found." };
  const patch: Record<string, unknown> = { title: String(formData.get("title") || "").trim(), verticalId: String(formData.get("verticalId") || ""), priorityId: String(formData.get("priorityId") || ""), frequency: (formData.get("frequency") as string) || null, source: ((formData.get("source") as string) || existing.source) as TaskSource, expectedOutput: (formData.get("expectedOutput") as string) || null, supportNeeded: (formData.get("supportNeeded") as string) || null, delayReason: (formData.get("delayReason") as string) || null, nextAction: (formData.get("nextAction") as string) || null, intervention: ((formData.get("intervention") as string) || "NO") as InterventionFlag, status: ((formData.get("status") as string) || existing.status) as TaskStatus, lastUpdateAt: new Date() };
  const deadlineStr = (formData.get("deadline") as string) || ""; patch.deadline = deadlineStr ? new Date(deadlineStr) : null;
  const memberIds = parseIdList(String(formData.get("memberIds") || ""));
  const teamIds = parseIdList(String(formData.get("teamIds") || ""));
  const ccTeamIds = parseIdList(String(formData.get("ccTeamIds") || ""));
  const ccMemberIds = parseIdList(String(formData.get("ccMemberIds") || ""));
  const bccTeamIds = parseIdList(String(formData.get("bccTeamIds") || ""));
  const bccMemberIds = parseIdList(String(formData.get("bccMemberIds") || ""));
  const extraMessage = (formData.get("extraMessage") as string) || "";
  const shouldSendEmail = String(formData.get("sendEmail") || "false") === "true";

  const teamSendEmailMap = new Map<string, boolean>();
  for (const tid of teamIds) { const sendVal = formData.get(`teamsend_${tid}`); teamSendEmailMap.set(tid, sendVal !== "false"); }
  const memberSendEmailMap = new Map<string, boolean>();
  for (const mid of memberIds) { const sendVal = formData.get(`membersend_${mid}`); memberSendEmailMap.set(mid, sendVal !== "false"); }

  if (teamIds.length === 0 && memberIds.length === 0) return { success: false, error: "Please assign at least one team or member." };

  const labels = await resolveLabels(patch, existing as any);
  const diffs = buildDiff(existing as Record<string, unknown>, patch, labels);

  try {
    await prisma.$transaction(async (tx) => { await tx.task.update({ where: { id: taskId }, data: patch }); await tx.taskAssignment.deleteMany({ where: { taskId } }); await tx.taskTeamAssignment.deleteMany({ where: { taskId } });
      if (memberIds.length > 0) await tx.taskAssignment.createMany({ data: memberIds.map((mid) => ({ taskId, memberId: mid, sendEmail: memberSendEmailMap.get(mid) ?? true })) });
      if (teamIds.length > 0) await tx.taskTeamAssignment.createMany({ data: teamIds.map((tid) => ({ taskId, teamId: tid, sendEmail: teamSendEmailMap.get(tid) ?? true })) });
    });
    if (diffs.length > 0) await prisma.taskUpdate.create({ data: { taskId, authorId: authed.userId, note: `📝 Edit:
${diffs.join("\n")}`, newStatus: (patch.status as TaskStatus) !== existing.status ? (patch.status as TaskStatus) : null } });
  } catch (err) { return { success: false, error: friendlyPrismaError(err) ?? "Could not save." }; }

  revalidatePath(`/sm/tasks/${taskId}`); revalidatePath("/sm/tasks"); revalidatePath("/sm"); revalidatePath("/cbo");

  if (shouldSendEmail) {
    await sendEditEmail(taskId, existing, patch, teamIds, memberIds, ccTeamIds, ccMemberIds, bccTeamIds, bccMemberIds, teamSendEmailMap, memberSendEmailMap, extraMessage, authed, diffs);
  }

  return { success: true, redirectTo: `/sm/tasks/${taskId}` };
}

async function sendEditEmail(
  taskId: string, existing: any, patch: Record<string, unknown>,
  teamIds: string[], memberIds: string[],
  ccTeamIds: string[], ccMemberIds: string[],
  bccTeamIds: string[], bccMemberIds: string[],
  teamSendEmailMap: Map<string, boolean>, memberSendEmailMap: Map<string, boolean>,
  extraMessage: string, authed: { userId: string; userName: string }, diffs: string[],
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const membersOf = async (tids: string[]) => tids.length === 0 ? [] : prisma.teamMember.findMany({ where: { teamId: { in: tids }, active: true }, select: { id: true, name: true, email: true, teamId: true } });
  const membersById = async (mids: string[]) => mids.length === 0 ? [] : prisma.teamMember.findMany({ where: { id: { in: mids }, active: true }, select: { id: true, name: true, email: true } });

  const toMembers: { email: string; name: string }[] = [];
  for (const m of await membersOf(teamIds)) { if ((teamSendEmailMap.get(m.teamId) ?? true)) toMembers.push({ email: m.email, name: m.name }); }
  for (const m of await membersById(memberIds)) { if (memberSendEmailMap.get(m.id) !== false) toMembers.push({ email: m.email, name: m.name }); }

  const ccAll: { email: string; name: string }[] = [];
  for (const m of await membersOf(ccTeamIds)) ccAll.push({ email: m.email, name: m.name });
  for (const m of await membersById(ccMemberIds)) ccAll.push({ email: m.email, name: m.name });

  const bccAll: { email: string; name: string }[] = [];
  for (const m of await membersOf(bccTeamIds)) bccAll.push({ email: m.email, name: m.name });
  for (const m of await membersById(bccMemberIds)) bccAll.push({ email: m.email, name: m.name });

  const toEmails = toMembers.map((m) => m.email);
  const ccEmails = ccAll.map((m) => m.email);
  const bccEmails = bccAll.map((m) => m.email);
  const hasCCBCC = ccAll.length > 0 || bccAll.length > 0;

  if (toEmails.length === 0) return;

  const toTokenMap = new Map<string, string>();
  for (const m of toMembers) {
    const member = await prisma.teamMember.findFirst({ where: { email: m.email, active: true } });
    if (member) toTokenMap.set(m.email, await getOrCreateToken(member.id, taskId));
  }

  const priorityDisplay = `${existing.priority.code} — ${existing.priority.label}`;
  const diffLines = diffs.length > 0 ? diffs.map((d) => `<li>${d}</li>`).join("") : "<li>Fields updated by ${authed.userName}</li>";

  const subject = `[SCP] Task Updated: ${existing.code} — ${existing.title}`;
  const html = `
    <h2 style="margin-bottom:12px">Task Updated</h2>
    <p style="margin-bottom:16px;color:#374151">The following task has been updated:</p>
    <table style="border-collapse:collapse;width:100%;max-width:600px;font-size:14px">
      <tr><td style="padding:8px 10px;font-weight:bold;width:140px;background:#f9fafb;border:1px solid #e5e7eb">Task Code</td><td style="padding:8px 10px;border:1px solid #e5e7eb"><strong>${existing.code}</strong></td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Title</td><td style="padding:8px 10px;border:1px solid #e5e7eb">${existing.title}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Priority</td><td style="padding:8px 10px;border:1px solid #e5e7eb"><span style="display:inline-block;padding:2px 10px;border-radius:4px;background:${existing.priority.colorHex || '#6b7280'};color:#fff;font-weight:600;font-size:13px">${priorityDisplay}</span></td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Status</td><td style="padding:8px 10px;border:1px solid #e5e7eb"><strong>${String(patch.status || existing.status).replace(/_/g, " ")}</strong></td></tr>
    </table>
    ${diffs.length > 0 ? `<div style="margin-top:14px"><div style="font-weight:600;font-size:13px;margin-bottom:6px">Changes:</div><ul style="margin:0;padding-left:20px;font-size:13px;color:#374151">${diffLines}</ul></div>` : ""}
    ${extraMessage ? `<div style="margin-top:14px;padding:12px 14px;background:#f3f4f6;border-radius:6px;border-left:3px solid #4f46e5"><div style="font-weight:600;font-size:12px;color:#4f46e5;margin-bottom:6px">Message from ${authed.userName}:</div><div style="font-style:italic;color:#374151">${extraMessage.replace(/\n/g, "<br>")}</div></div>` : ""}
    ${!hasCCBCC ? `<p style="margin-top:20px">
      <a href="${appUrl}/external/token?token=\${TOKEN_PLACEHOLDER}&taskId=${taskId}" style="background:#4f46e5;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;display:inline-block">
        View Task →
      </a>
    </p>` : ""}
  `;

  for (const e of toEmails) {
    const token = toTokenMap.get(e);
    const personalizedHtml = html.replace("${TOKEN_PLACEHOLDER}", token || "");
    const result = await sendEmail({ to: e, cc: ccEmails.length > 0 && toEmails.indexOf(e) === 0 ? ccEmails : [], bcc: bccEmails.length > 0 && toEmails.indexOf(e) === 0 ? bccEmails : [], subject, html: personalizedHtml });
    await prisma.emailLog.create({ data: { taskId, recipient: e, subject, status: result.success ? "sent" : "failed", errorMsg: result.error || null, ...(result.messageId ? { listmonkId: result.messageId } : {}) } });
  }
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