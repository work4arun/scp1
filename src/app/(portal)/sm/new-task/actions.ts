"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import type { TaskSource, InterventionFlag } from "@prisma/client";
import { writeAudit } from "@/lib/audit";
import { friendlyPrismaError } from "@/lib/prisma-errors";
import { computeNextTaskCode } from "@/lib/task-code";
import { sendEmail } from "@/lib/email";
import { getOrCreateToken } from "@/lib/token-auth";

export type CreateTaskResult =
  | { success: true; id: string }
  | { success: false; error: string };

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

export async function createTaskAction(formData: FormData): Promise<CreateTaskResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: "Your session is no longer valid or you don't have permission to add tasks." };
  }

  const verticalId   = String(formData.get("verticalId") || "").trim();
  const priorityId   = String(formData.get("priorityId") || "").trim();
  const title        = String(formData.get("title") || "").trim();
  const deadlineStr  = (formData.get("deadline") as string) || "";
  const frequency    = (formData.get("frequency") as string) || null;
  const source       = ((formData.get("source") as string) || "SELF_STRATEGY") as TaskSource;
  const expectedOutput = (formData.get("expectedOutput") as string) || null;
  const supportNeeded  = (formData.get("supportNeeded") as string) || null;
  const nextAction     = (formData.get("nextAction") as string) || null;
  const intervention   = ((formData.get("intervention") as string) || "NO") as InterventionFlag;
  const extraMessage   = (formData.get("extraMessage") as string) || "";

  const teamIds = parseIdList(String(formData.get("teamIds") || ""));
  const memberIds = parseIdList(String(formData.get("memberIds") || ""));
  const ccTeamIds = parseIdList(String(formData.get("ccTeamIds") || ""));
  const ccMemberIds = parseIdList(String(formData.get("ccMemberIds") || ""));
  const bccTeamIds = parseIdList(String(formData.get("bccTeamIds") || ""));
  const bccMemberIds = parseIdList(String(formData.get("bccMemberIds") || ""));

  const teamSendEmailMap = new Map<string, boolean>();
  for (const tid of teamIds) {
    const sendVal = formData.get(`teamsend_${tid}`);
    teamSendEmailMap.set(tid, sendVal !== "false");
  }
  const memberSendEmailMap = new Map<string, boolean>();
  for (const mid of memberIds) {
    const sendVal = formData.get(`membersend_${mid}`);
    memberSendEmailMap.set(mid, sendVal !== "false");
  }

  if (!title)      return { success: false, error: "Task title is required." };
  if (!verticalId) return { success: false, error: "Please select a vertical." };
  if (!priorityId) return { success: false, error: "Please select a priority." };
  if (teamIds.length === 0 && memberIds.length === 0) {
    return { success: false, error: "Please assign at least one team or member." };
  }

  const vertical = await prisma.vertical.findUnique({ where: { id: verticalId } });
  if (!vertical) return { success: false, error: "Selected vertical was not found." };

  const priority = await prisma.priority.findUnique({ where: { id: priorityId }, select: { code: true, label: true, colorHex: true } });
  if (!priority) return { success: false, error: "Selected priority was not found." };

  let created;
  const MAX_ATTEMPTS = 5;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      created = await prisma.$transaction(async (tx) => {
        const code = await computeNextTaskCode(tx, verticalId, vertical.code);
        const task = await tx.task.create({
          data: {
            code, title, verticalId, priorityId,
            createdById: session.user.id,
            deadline: deadlineStr ? new Date(deadlineStr) : null,
            frequency, source, expectedOutput, supportNeeded, nextAction, intervention,
            lastUpdateAt: new Date(),
          },
        });

        if (teamIds.length > 0) {
          await tx.taskTeamAssignment.createMany({
            data: teamIds.map((tid) => ({ taskId: task.id, teamId: tid, sendEmail: teamSendEmailMap.get(tid) ?? true })),
          });
        }
        if (memberIds.length > 0) {
          await tx.taskAssignment.createMany({
            data: memberIds.map((mid) => ({ taskId: task.id, memberId: mid, sendEmail: memberSendEmailMap.get(mid) ?? true })),
          });
        }
        return task;
      }, { maxWait: 30_000, timeout: 30_000 });
      lastErr = null; break;
    } catch (err: unknown) {
      lastErr = err;
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") continue;
      console.error("[createTaskAction] DB error", err);
      return { success: false, error: friendlyPrismaError(err) ?? "Could not create the task." };
    }
  }
  if (!created) {
    console.error("[createTaskAction] exhausted retries", lastErr);
    return { success: false, error: "Could not generate a unique task code." };
  }

  revalidatePath("/sm"); revalidatePath("/sm/tasks"); revalidatePath("/cbo");

  // ── Resolve all recipients ────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const priorityDisplay = `${priority.code} — ${priority.label}`;

  // Resolve member emails from team IDs (for TO, CC, BCC)
  const membersOf = async (tids: string[]): Promise<{ id: string; name: string; email: string; teamId: string }[]> => {
    if (tids.length === 0) return [];
    return prisma.teamMember.findMany({
      where: { teamId: { in: tids }, active: true },
      select: { id: true, name: true, email: true, teamId: true },
    });
  };
  const membersById = async (mids: string[]): Promise<{ id: string; name: string; email: string }[]> => {
    if (mids.length === 0) return [];
    return prisma.teamMember.findMany({
      where: { id: { in: mids }, active: true },
      select: { id: true, name: true, email: true },
    });
  };

  const toMembers: { email: string; name: string }[] = [];
  for (const m of await membersOf(teamIds)) {
    const sendForThisTeam = teamSendEmailMap.get(m.teamId) ?? true;
    if (sendForThisTeam) toMembers.push({ email: m.email, name: m.name });
  }
  for (const m of await membersById(memberIds)) {
    if (memberSendEmailMap.get(m.id) !== false) toMembers.push({ email: m.email, name: m.name });
  }

  // CC recipients
  const ccAll: { email: string; name: string }[] = [];
  for (const m of await membersOf(ccTeamIds)) ccAll.push({ email: m.email, name: m.name });
  for (const m of await membersById(ccMemberIds)) ccAll.push({ email: m.email, name: m.name });

  // BCC recipients
  const bccAll: { email: string; name: string }[] = [];
  for (const m of await membersOf(bccTeamIds)) bccAll.push({ email: m.email, name: m.name });
  for (const m of await membersById(bccMemberIds)) bccAll.push({ email: m.email, name: m.name });

  // Generate tokens for each TO recipient
  const toTokenMap = new Map<string, string>();
  for (const m of toMembers) {
    const member = await prisma.teamMember.findFirst({ where: { email: m.email, active: true } });
    if (member) {
      toTokenMap.set(m.email, await getOrCreateToken(member.id, created.id));
    }
  }

  const toEmails = toMembers.map((m) => m.email);
  const ccEmails = ccAll.map((m) => m.email);
  const bccEmails = bccAll.map((m) => m.email);

  // Build email
  const subject = `[SCP] New Task: ${created.code} — ${created.title}`;
  const html = `
    <h2 style="margin-bottom:12px">New Task Assigned</h2>
    <p style="margin-bottom:16px;color:#374151">The following task has been assigned to you:</p>
    <table style="border-collapse:collapse;width:100%;max-width:600px;font-size:14px">
      <tr><td style="padding:8px 10px;font-weight:bold;width:140px;background:#f9fafb;border:1px solid #e5e7eb">Task Code</td><td style="padding:8px 10px;border:1px solid #e5e7eb"><strong>${created.code}</strong></td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Title</td><td style="padding:8px 10px;border:1px solid #e5e7eb">${created.title}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Priority</td><td style="padding:8px 10px;border:1px solid #e5e7eb"><span style="display:inline-block;padding:2px 10px;border-radius:4px;background:${priority.colorHex || '#6b7280'};color:#fff;font-weight:600;font-size:13px">${priorityDisplay}</span></td></tr>
      ${deadlineStr ? `<tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Deadline</td><td style="padding:8px 10px;border:1px solid #e5e7eb">${new Date(deadlineStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>` : ""}
      ${expectedOutput ? `<tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Expected Output</td><td style="padding:8px 10px;border:1px solid #e5e7eb">${expectedOutput}</td></tr>` : ""}
      <tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Dr. BN Intervention</td><td style="padding:8px 10px;border:1px solid #e5e7eb"><span style="font-weight:700;color:${interventionColor(intervention)}">${interventionLabel(intervention)}</span></td></tr>
    </table>
    ${extraMessage ? `<div style="margin-top:16px;padding:12px 14px;background:#f3f4f6;border-radius:6px;border-left:3px solid #4f46e5"><div style="font-weight:600;font-size:12px;color:#4f46e5;margin-bottom:6px">Message:</div><div style="font-style:italic;color:#374151">${extraMessage.replace(/\n/g, "<br>")}</div></div>` : ""}
    <p style="margin-top:20px">
      <a href="${appUrl}/external/token?token=\${TOKEN_PLACEHOLDER}&taskId=${created.id}" style="background:#4f46e5;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;display:inline-block">
        View Task →
      </a>
    </p>
  `;

  if (toEmails.length > 0) {
    // Send individual emails with personalized tokens
    for (const e of toEmails) {
      const token = toTokenMap.get(e);
      const personalizedHtml = html.replace("${TOKEN_PLACEHOLDER}", token || "");
      const result = await sendEmail({ to: e, cc: ccEmails.length > 0 && toEmails.indexOf(e) === 0 ? ccEmails : [], bcc: bccEmails.length > 0 && toEmails.indexOf(e) === 0 ? bccEmails : [], subject, html: personalizedHtml });
      await prisma.emailLog.create({ data: { taskId: created.id, recipient: e, subject, status: result.success ? "sent" : "failed", errorMsg: result.error || null, ...(result.messageId ? { listmonkId: result.messageId } : {}) } });
    }
  }

  await writeAudit({ actorId: session.user.id, action: "task.create", entity: "Task", entityId: created.id, after: created, note: `Created ${created.code}` });
  return { success: true, id: created.id };
}