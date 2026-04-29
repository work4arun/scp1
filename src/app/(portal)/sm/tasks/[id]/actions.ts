"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { notifyAllCBO } from "@/lib/notify";
import type { TaskStatus } from "@prisma/client";

export async function addUpdateAction(taskId: string, formData: FormData) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");

  const note = String(formData.get("note") || "").trim();
  const newStatus = formData.get("status") as TaskStatus | "";
  const delayReason = (formData.get("delayReason") as string || "").trim() || null;
  if (!note) return;

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

  revalidatePath(`/sm/tasks/${taskId}`);
  revalidatePath("/sm");
  revalidatePath("/sm/tasks");

  // Notify CBO only on a status change (not every comment) to avoid noise
  if (newStatus) {
    const t = await prisma.task.findUnique({ where: { id: taskId }, include: { vertical: true } });
    if (t) {
      await notifyAllCBO({
        kind: "task.updated",
        title: `Status → ${String(newStatus).replace(/_/g, " ")}`,
        body: `${t.code} · ${t.title}`,
        link: `/cbo/verticals/${t.vertical.code}`,
        refId: t.id,
        senderId: session.user.id,
      });
    }
  }
}

export async function escalateTaskAction(taskId: string, formData: FormData) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");

  const issue = String(formData.get("issue") || "").trim();
  const whyNeeded = String(formData.get("whyNeeded") || "").trim();
  const decisionRequired = String(formData.get("decisionRequired") || "").trim();
  const deadlineStr = String(formData.get("deadline") || "").trim();
  const noteAttached = formData.get("noteAttached") === "on";
  if (!issue || !whyNeeded || !decisionRequired) return;

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { verticalId: true } });
  if (!task) throw new Error("Task not found");

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

  revalidatePath(`/sm/tasks/${taskId}`);
  revalidatePath("/sm/intervention");
  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");

  await notifyAllCBO({
    kind: "task.escalated",
    title: "🚨 New escalation",
    body: issue,
    link: "/cbo/intervention",
    refId: taskId,
    senderId: session.user.id,
  });
}
