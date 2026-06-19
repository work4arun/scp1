"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { sendEmail } from "@/lib/email";
import { getOrCreateToken } from "@/lib/token-auth";
import type { InterventionFlag } from "@prisma/client";

type TriggerEmailParams = {
  taskId: string;
  note: string;
  toTeamIds: string[];
  toMemberIds: string[];
  ccTeamIds: string[];
  ccMemberIds: string[];
  bccTeamIds: string[];
  bccMemberIds: string[];
};

type TriggerEmailResult = { success: true } | { success: false; error: string };

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

export async function triggerEmailAction(params: TriggerEmailParams): Promise<TriggerEmailResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: "Permission denied." };
  }

  const task = await prisma.task.findUnique({
    where: { id: params.taskId },
    select: {
      code: true, title: true,
      priority: { select: { code: true, label: true, colorHex: true } },
      deadline: true, expectedOutput: true, intervention: true,
      status: true,
    },
  });
  if (!task) return { success: false, error: "Task not found." };

  const membersOf = async (tids: string[]): Promise<{ id: string; name: string; email: string }[]> => {
    if (tids.length === 0) return [];
    return prisma.teamMember.findMany({
      where: { teamId: { in: tids }, active: true },
      select: { id: true, name: true, email: true },
    });
  };
  const membersById = async (mids: string[]): Promise<{ id: string; name: string; email: string }[]> => {
    if (mids.length === 0) return [];
    return prisma.teamMember.findMany({
      where: { id: { in: mids }, active: true },
      select: { id: true, name: true, email: true },
    });
  };

  const toMembers = [...(await membersOf(params.toTeamIds)), ...(await membersById(params.toMemberIds))];
  if (toMembers.length === 0) return { success: false, error: "No recipients selected." };

  const ccMembers = [...(await membersOf(params.ccTeamIds)), ...(await membersById(params.ccMemberIds))];
  const bccMembers = [...(await membersOf(params.bccTeamIds)), ...(await membersById(params.bccMemberIds))];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const priorityDisplay = `${task.priority.code} — ${task.priority.label}`;

  const subject = `[SCP] Update: ${task.code} — ${task.title}`;

  // Generate tokens for each TO recipient
  const tokenMap = new Map<string, string>();
  for (const m of toMembers) {
    const member = await prisma.teamMember.findFirst({ where: { email: m.email, active: true } });
    if (member) {
      tokenMap.set(m.email, await getOrCreateToken(member.id, params.taskId));
    }
  }

  const toEmails = toMembers.map((m) => m.email);
  const ccEmails = ccMembers.map((m) => m.email);
  const bccEmails = bccMembers.map((m) => m.email);

  const sent = new Set<string>();
  for (const e of toEmails) {
    if (sent.has(e)) continue;
    sent.add(e);

    const token = tokenMap.get(e) || "";
    const html = `
      <h2 style="margin-bottom:12px">Task Update</h2>
      <p style="margin-bottom:16px;color:#374151">The task <strong>${task.code}</strong> — <strong>${task.title}</strong> has been updated.</p>
      <table style="border-collapse:collapse;width:100%;max-width:600px;font-size:14px">
        <tr><td style="padding:8px 10px;font-weight:bold;width:140px;background:#f9fafb;border:1px solid #e5e7eb">Task Code</td><td style="padding:8px 10px;border:1px solid #e5e7eb"><strong>${task.code}</strong></td></tr>
        <tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Title</td><td style="padding:8px 10px;border:1px solid #e5e7eb">${task.title}</td></tr>
        <tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Priority</td><td style="padding:8px 10px;border:1px solid #e5e7eb"><span style="display:inline-block;padding:2px 10px;border-radius:4px;background:${task.priority.colorHex || '#6b7280'};color:#fff;font-weight:600;font-size:13px">${priorityDisplay}</span></td></tr>
        <tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Status</td><td style="padding:8px 10px;border:1px solid #e5e7eb">${task.status.replace(/_/g, " ")}</td></tr>
        ${task.deadline ? `<tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Deadline</td><td style="padding:8px 10px;border:1px solid #e5e7eb">${new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>` : ""}
        ${task.expectedOutput ? `<tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Expected Output</td><td style="padding:8px 10px;border:1px solid #e5e7eb">${task.expectedOutput}</td></tr>` : ""}
        <tr><td style="padding:8px 10px;font-weight:bold;background:#f9fafb;border:1px solid #e5e7eb">Dr. BN Intervention</td><td style="padding:8px 10px;border:1px solid #e5e7eb"><span style="font-weight:700;color:${interventionColor(task.intervention)}">${interventionLabel(task.intervention)}</span></td></tr>
      </table>
      ${params.note ? `<div style="margin-top:16px;padding:12px 14px;background:#f3f4f6;border-radius:6px;border-left:3px solid #4f46e5"><div style="font-weight:600;font-size:12px;color:#4f46e5;margin-bottom:6px">Message:</div><div style="font-style:italic;color:#374151">${params.note.replace(/\n/g, "<br>")}</div></div>` : ""}
      <p style="margin-top:20px">
        <a href="${appUrl}/external/token?token=${token}" style="background:#4f46e5;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;display:inline-block">
          View Task →
        </a>
      </p>
    `;

    const result = await sendEmail({
      to: e,
      cc: toEmails.indexOf(e) === 0 ? ccEmails : [],
      bcc: toEmails.indexOf(e) === 0 ? bccEmails : [],
      subject,
      html,
    });

    await prisma.emailLog.create({
      data: { taskId: params.taskId, recipient: e, subject, status: result.success ? "sent" : "failed", errorMsg: result.error || null, ...(result.messageId ? { listmonkId: result.messageId } : {}) },
    });
  }

  return { success: true };
}