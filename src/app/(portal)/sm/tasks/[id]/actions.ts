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

  if (!rawNote && !newStatus) return { success: true };
  const note =
    rawNote ||
    (newStatus
      ? `🔄 Status → ${String(newStatus).replace(/_/g, " ")}`
      : "");

  try {
    await prisma.taskUpdate.create({
      data: {
        taskId,
        authorId: session.user.id,
        note,
        newStatus: newStatus || null,
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
