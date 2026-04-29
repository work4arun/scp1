"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { notifyAllCBO } from "@/lib/notify";
import { sendTaskEmailToOwners } from "@/lib/email";
import type { TaskSource, InterventionFlag } from "@prisma/client";
import { computeSlaDueAt } from "@/lib/sla";
import { writeAudit } from "@/lib/audit";

export type CreateTaskResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createTaskAction(formData: FormData): Promise<CreateTaskResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    throw new Error("Forbidden");
  }

  const verticalId   = String(formData.get("verticalId") || "").trim();
  const subVerticalId = (formData.get("subVerticalId") as string) || null;
  const priorityId   = String(formData.get("priorityId") || "").trim();
  const ownerRoleId  = (formData.get("ownerRoleId") as string) || null;
  const title        = String(formData.get("title") || "").trim();
  const deadlineStr  = (formData.get("deadline") as string) || "";
  const frequency    = (formData.get("frequency") as string) || null;
  const source       = ((formData.get("source") as string) || "SELF_STRATEGY") as TaskSource;
  const expectedOutput = (formData.get("expectedOutput") as string) || null;
  const supportNeeded  = (formData.get("supportNeeded") as string) || null;
  const nextAction     = (formData.get("nextAction") as string) || null;
  const intervention   = ((formData.get("intervention") as string) || "NO") as InterventionFlag;
  const ownerEmail     = ((formData.get("ownerEmail") as string) || "").trim().toLowerCase();
  const subOwnerEmail  = ((formData.get("subOwnerEmail") as string) || "").trim().toLowerCase();

  // ── Validation ──
  if (!title)      return { success: false, error: "Task title is required." };
  if (!verticalId) return { success: false, error: "Please select a vertical." };
  if (!priorityId) return { success: false, error: "Please select a priority." };

  // ── Resolve vertical ──
  const vertical = await prisma.vertical.findUnique({ where: { id: verticalId } });
  if (!vertical) return { success: false, error: "Selected vertical was not found. Please refresh and try again." };

  // ── Resolve owner by email ──
  let ownerUserId: string | null = null;
  let ownerUser: { id: string; name: string; email: string } | null = null;
  if (ownerEmail) {
    const found = await prisma.user.findUnique({
      where: { email: ownerEmail },
      select: { id: true, name: true, email: true, active: true },
    });
    if (!found || !found.active) {
      return { success: false, error: `No active user found with email "${ownerEmail}". Please check and try again.` };
    }
    ownerUserId = found.id;
    ownerUser = found;
  }

  // ── Resolve sub-owner by email ──
  let subOwnerId: string | null = null;
  let subOwnerUser: { id: string; name: string; email: string } | null = null;
  if (subOwnerEmail) {
    const found = await prisma.user.findUnique({
      where: { email: subOwnerEmail },
      select: { id: true, name: true, email: true, active: true },
    });
    if (!found || !found.active) {
      return { success: false, error: `No active user found with email "${subOwnerEmail}". Please check and try again.` };
    }
    subOwnerId = found.id;
    subOwnerUser = found;
  }

  const priority = await prisma.priority.findUnique({
    where: { id: priorityId },
    select: { code: true, label: true },
  });

  // ── Compute SLA due-at if SLA engine is on ──
  const slaDueAt = priority ? await computeSlaDueAt(priority.code) : null;

  // ── Atomic code generation + task creation ──
  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const count = await tx.task.count({ where: { verticalId } });
      const code  = `${vertical.code}-${String(count + 1).padStart(3, "0")}`;
      return tx.task.create({
        data: {
          code,
          title,
          verticalId,
          subVerticalId: subVerticalId || null,
          priorityId,
          ownerRoleId: ownerRoleId || null,
          ownerUserId,
          subOwnerId,
          createdById: session.user.id,
          deadline: deadlineStr ? new Date(deadlineStr) : null,
          frequency,
          source,
          expectedOutput,
          supportNeeded,
          nextAction,
          intervention,
          slaDueAt,
          lastUpdateAt: new Date(),
        },
      });
    });
  } catch (err: unknown) {
    // P2002 = unique constraint violation (duplicate code from a race condition)
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return { success: false, error: "Another task was created at the same moment. Please try again." };
    }
    throw err;
  }

  revalidatePath("/sm");
  revalidatePath("/sm/tasks");
  revalidatePath("/cbo");

  await notifyAllCBO({
    kind: "task.created",
    title: `New task in ${vertical.name}`,
    body: `${created.code} · ${title}`,
    link: `/cbo/verticals/${vertical.code}`,
    refId: created.id,
    senderId: session.user.id,
  });

  const creatorName = session.user.name || "Strategic Manager";
  await sendTaskEmailToOwners({
    owner: ownerUser,
    subOwner: subOwnerUser,
    taskCode: created.code,
    taskTitle: title,
    taskId: created.id,
    verticalName: vertical.name,
    priorityLabel: priority ? `${priority.code} — ${priority.label}` : priorityId,
    deadline: deadlineStr || null,
    eventType: "assigned",
    updatedByName: creatorName,
  });

  await writeAudit({
    actorId: session.user.id,
    action: "task.create",
    entity: "Task",
    entityId: created.id,
    after: created,
    note: `Created ${created.code}`,
  });

  return { success: true, id: created.id };
}
