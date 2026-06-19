"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";

export async function sendSmMessageAction(formData: FormData) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) return { success: false };

  const taskId = String(formData.get("taskId") || "");
  const text = String(formData.get("text") || "").trim();
  const audioFile = formData.get("audio") as File | null;
  const audioMime = String(formData.get("audioMime") || "");

  if (!taskId) return { success: false };

  let audioBytes: Buffer | null = null;
  if (audioFile && audioFile.size > 0) {
    const arrayBuffer = await audioFile.arrayBuffer();
    audioBytes = Buffer.from(arrayBuffer);
  }

  if (!text && !audioBytes) return { success: false };

  await prisma.taskMessage.create({
    data: {
      taskId,
      authorId: session.user.id, // SM/CBO user ID from User table
      authorRole: "sm",
      text: text || null,
      audioBytes: audioBytes || null,
      audioMime: audioMime || null,
    },
  });

  return { success: true };
}