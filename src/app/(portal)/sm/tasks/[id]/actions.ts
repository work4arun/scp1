"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { notifyAllCBO } from "@/lib/notify";
import { sendFullTaskNotification } from "@/lib/email";
import { friendlyPrismaError } from "@/lib/prisma-errors";
import type { TaskStatus } from "@prisma/client";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

export type AddUpdateResult = { success: true } | { success: false; error: string };
export type EscalateResult = { success: true } | { success: false; error: string };

export async function addUpdateAction(taskId: string, formData: FormData): Promise<AddUpdateResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: FORBIDDEN_MSG };
  }

  const rawNote = String(formData.get("note") || "").trim();
  const newStatus = formData.get("status") as TaskStatus | "";
  const delayReason = (formData.get("delayReason") as string || "").trim() || null;

  // Allow status-only updates: if the user only picked a new status without
  // writing a note, auto-generate one for the audit trail.
  if (!rawNote && !newStatus) return { success: true }; // nothing to do — not an error
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
        // Persist delay reason when provided; clear it when status moves away from DELAYED
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

  // Fetch full task details for notifications (email + CBO bell).
  // Done after DB writes so we always read committed data.
  const t = await prisma.task.findUnique({
    where: { id: taskId },
    include: { vertical: true, priority: true, ownerUser: true, subOwner: true },
  });

  if (t) {
    // ── CBO in-app bell (status changes only, to avoid noise) ──
    if (newStatus) {
      await notifyAllCBO({
        kind: "task.updated",
        title: `Status → ${String(newStatus).replace(/_/g, " ")}`,
        body: `${t.code} · ${t.title}`,
        link: `/cbo/verticals/${t.vertical.code}`,
        refId: t.id,
        senderId: session.user.id,
      });
    }

    // ── Email on any status change or comment ──
    // sendFullTaskNotification resolves the recipient itself (ownerUser OR
    // ownerRole.ownerEmail), so no recipient check is needed here.
    const updaterName = session.user.name || "Strategic Manager";
    const summaryParts: string[] = [];
    if (newStatus) summaryParts.push(`Status → ${String(newStatus).replace(/_/g, " ")}`);
    if (rawNote)   summaryParts.push(`Comment: ${rawNote}`);

    await sendFullTaskNotification({
      taskId: t.id,
      eventType: "updated",
      updatedByName: updaterName,
      changedSummary: summaryParts.join("\n") || undefined,
    });
  }

  return { success: true };
}

export async function escalateTaskAction(taskId: string, formData: FormData): Promise<EscalateResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: FORBIDDEN_MSG };
  }

  const issue = String(formData.get("issue") || "").trim();
  const whyNeeded = String(formData.get("whyNeeded") || "").trim();
  const decisionRequired = String(formData.get("decisionRequired") || "").trim();
  const deadlineStr = String(formData.get("deadline") || "").trim();
  const noteAttached = formData.get("noteAttached") === "on";

  if (!issue || !whyNeeded || !decisionRequired) {
    return { success: false, error: "Issue, reason, and decision required fields must all be filled in." };
  }

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { verticalId: true } });
  if (!task) return { success: false, error: "Task not found — it may have been deleted. Please refresh." };

  try {
    await prisma.intervention.create({
      data: {
        taskId,
        verticalId: task.verticalId,
        issue,
        whyNeeded,
        decisionRequired,
        deadline: deadlineStr ? new Date(deadlineStr) : null,
        noteAttached,
        raisedById: session.user.id,
      },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { intervention: "YES" },
    });
  } catch (err) {
    console.error("[escalateTaskAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not submit the escalation. Please try again.",
    };
  }

  revalidatePath(`/sm/tasks/${taskId}`);
  revalidatePath("/sm/intervention");
  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");

  // notifyAllCBO swallows its own errors.
  await notifyAllCBO({
    kind: "task.escalated",
    title: "🚨 New escalation",
    body: issue,
    link: "/cbo/intervention",
    refId: taskId,
    senderId: session.user.id,
  });

  return { success: true };
}
