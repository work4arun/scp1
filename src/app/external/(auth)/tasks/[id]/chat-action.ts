"use server";

import { prisma } from "@/lib/prisma";

export async function sendMessageAction(formData: FormData) {
  const taskId = String(formData.get("taskId") || "");
  const memberId = String(formData.get("memberId") || "");
  const text = String(formData.get("text") || "").trim();
  const audioFile = formData.get("audio") as File | null;
  const audioMime = String(formData.get("audioMime") || "");

  if (!taskId || !memberId) return { success: false };

  // Check individual assignment
  const individualAssignment = await prisma.taskAssignment.findUnique({
    where: { taskId_memberId: { taskId, memberId } },
  });
  if (!individualAssignment) {
    // Check team assignment — user in a team assigned to this task can also chat
    const member = await prisma.teamMember.findUnique({ where: { id: memberId }, select: { teamId: true } });
    if (member) {
      const teamAssignment = await prisma.taskTeamAssignment.findUnique({
        where: { taskId_teamId: { taskId, teamId: member.teamId } },
      });
      if (!teamAssignment) return { success: false };
    } else {
      return { success: false };
    }
  }

  let audioBytes: Buffer | null = null;
  if (audioFile && audioFile.size > 0) {
    const arrayBuffer = await audioFile.arrayBuffer();
    audioBytes = Buffer.from(arrayBuffer);
  }

  if (!text && !audioBytes) return { success: false };

  const member = await prisma.teamMember.findUnique({ where: { id: memberId }, select: { name: true } });

  await prisma.taskMessage.create({
    data: {
      taskId,
      authorId: memberId,
      authorName: member?.name || "Member",
      authorRole: "member",
      text: text || null,
      audioBytes: audioBytes || null,
      audioMime: audioMime || null,
    },
  });

  return { success: true };
}