"use server";

import { prisma } from "@/lib/prisma";

export async function sendMessageAction(formData: FormData) {
  const taskId = String(formData.get("taskId") || "");
  const memberId = String(formData.get("memberId") || "");
  const text = String(formData.get("text") || "").trim();
  const audioFile = formData.get("audio") as File | null;
  const audioMime = String(formData.get("audioMime") || "");

  if (!taskId || !memberId) return { success: false };

  // Verify member is assigned to this task
  const assignment = await prisma.taskAssignment.findUnique({
    where: { taskId_memberId: { taskId, memberId } },
  });
  if (!assignment) return { success: false };

  let audioBytes: Buffer | null = null;
  if (audioFile && audioFile.size > 0) {
    const arrayBuffer = await audioFile.arrayBuffer();
    audioBytes = Buffer.from(arrayBuffer);
  }

  if (!text && !audioBytes) return { success: false };

  await prisma.taskMessage.create({
    data: {
      taskId,
      authorId: memberId,
      authorRole: "member",
      text: text || null,
      audioBytes: audioBytes || null,
      audioMime: audioMime || null,
    },
  });

  return { success: true };
}