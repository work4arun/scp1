"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { sendEmail } from "@/lib/email";

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

export async function triggerEmailAction(params: TriggerEmailParams): Promise<TriggerEmailResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: "Permission denied." };
  }

  const task = await prisma.task.findUnique({
    where: { id: params.taskId },
    select: { code: true, title: true, priority: { select: { code: true } } },
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
  const subject = `[SCP] Update: ${task.code} — ${task.title}`;
  const html = `
    <h2>Task Update</h2>
    <p>The task <strong>${task.code}</strong> — <strong>${task.title}</strong> has been updated.</p>
    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <tr><td style="padding:6px;font-weight:bold">Task Code</td><td style="padding:6px">${task.code}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Title</td><td style="padding:6px">${task.title}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Priority</td><td style="padding:6px">${task.priority.code}</td></tr>
    </table>
    ${params.note ? `<div style="margin-top:12px;padding:10px;background:#f3f4f6;border-radius:6px;font-style:italic">${params.note.replace(/\n/g, "<br>")}</div>` : ""}
    <p style="margin-top:16px">
      <a href="${appUrl}/sm/tasks/${params.taskId}" style="background:#4f46e5;color:white;padding:10px 20px;text-decoration:none;border-radius:6px">View Task</a>
    </p>
  `;

  const toEmails = toMembers.map((m) => m.email);
  const ccEmails = ccMembers.map((m) => m.email);
  const bccEmails = bccMembers.map((m) => m.email);

  const result = await sendEmail({ to: toEmails, cc: ccEmails, bcc: bccEmails, subject, html });

  const sent = new Set<string>();
  for (const e of toEmails) {
    if (sent.has(e)) continue; sent.add(e);
    await prisma.emailLog.create({
      data: { taskId: params.taskId, recipient: e, subject, status: result.success ? "sent" : "failed", errorMsg: result.error || null, ...(result.messageId ? { listmonkId: result.messageId } : {}) },
    });
  }

  if (!result.success) return { success: false, error: result.error || "Failed to send email." };
  return { success: true };
}