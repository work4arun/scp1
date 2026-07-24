"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { friendlyPrismaError } from "@/lib/prisma-errors";
import type { TaskStatus } from "@prisma/client";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

export type AddUpdateResult = { success: true } | { success: false; error: string };

export async function addUpdateAction(taskId: string, formData: FormData): Promise<AddUpdateResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: FORBIDDEN_MSG };
  }

  const rawNote = String(formData.get("note") || "").trim();
  const newStatus = formData.get("status") as TaskStatus | "";
  const delayReason = (formData.get("delayReason") as string || "").trim() || null;

  // Optional attachments — any number, any type. Files alone (no note/status) are
  // a valid update. Bytes are read here and stored in TaskUpdateFile rows.
  const uploads = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const files = await Promise.all(
    uploads.map(async (f) => ({
      fileData: Buffer.from(await f.arrayBuffer()),
      fileName: f.name,
      fileMime: f.type || "application/octet-stream",
      fileSize: f.size,
    })),
  );

  if (!rawNote && !newStatus && files.length === 0) return { success: true };
  const note =
    rawNote ||
    (newStatus
      ? `🔄 Status → ${String(newStatus).replace(/_/g, " ")}`
      : files.length > 0
        ? `📎 Attached ${files.length} file${files.length === 1 ? "" : "s"}`
        : "");

  try {
    await prisma.taskUpdate.create({
      data: {
        taskId,
        authorId: session.user.id,
        note,
        newStatus: newStatus || null,
        ...(files.length > 0 ? { files: { create: files } } : {}),
      },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: {
        lastUpdateAt: new Date(),
        ...(newStatus ? { status: newStatus } : {}),
        ...(delayReason !== null ? { delayReason } : newStatus && newStatus !== "DELAYED" ? { delayReason: null } : {}),
      },
    });
  } catch (err) {
    console.error("[addUpdateAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not save the update. Please try again.",
    };
  }

  revalidatePath(`/sm/tasks/${taskId}`);
  revalidatePath("/sm");
  revalidatePath("/sm/tasks");

  return { success: true };
}
