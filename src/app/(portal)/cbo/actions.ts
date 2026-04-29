"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCBO } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/features";
import { writeAudit } from "@/lib/audit";
import { computeSlaDueAt } from "@/lib/sla";

async function ensureCbo() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");
  return session.user.id;
}

// ────────── Mark "seen" — powers the since-last-visit feed ──────────
export async function markSeenAction() {
  const userId = await ensureCbo();
  try {
    await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  } catch {
    // Column may not exist yet if `prisma db push` hasn't run. Ignore silently.
  }
}

// ────────── Resolve intervention with decision type + note ──────────
export async function resolveInterventionRichAction(id: string, decisionType: string, note: string) {
  await ensureCbo();
  await prisma.intervention.update({
    where: { id },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      decisionType,
      resolutionNote: note?.trim() || null,
      snoozedUntil: null,
    },
  });
  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");
  revalidatePath("/cbo/daily");
}

// ────────── Snooze intervention ──────────
export async function snoozeInterventionAction(id: string, hours: number) {
  await ensureCbo();
  const until = new Date(Date.now() + hours * 60 * 60 * 1000);
  await prisma.intervention.update({ where: { id }, data: { snoozedUntil: until } });
  revalidatePath("/cbo/intervention");
  revalidatePath("/cbo");
}

// ────────── Drop private note for SM (no escalation) ──────────
export async function setInterventionCboNoteAction(id: string, note: string) {
  await ensureCbo();
  await prisma.intervention.update({ where: { id }, data: { cboNote: note?.trim() || null } });
  revalidatePath("/cbo/intervention");
}

// ────────── Pin / unpin items ──────────
export async function togglePinAction(kind: "task" | "intervention" | "vertical", refId: string) {
  const userId = await ensureCbo();
  const existing = await prisma.pin.findUnique({
    where: { userId_kind_refId: { userId, kind, refId } },
  });
  if (existing) await prisma.pin.delete({ where: { id: existing.id } });
  else await prisma.pin.create({ data: { userId, kind, refId } });
  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");
}

// ─────────────────────────────────────────────────────────────────────────────
//  Parking Lot → Task auto-promote (gated by `parking_auto_promote`)
// ─────────────────────────────────────────────────────────────────────────────
//  When CBO sets a Parking Lot decision to Activate, this action drafts a
//  fresh Task pre-filled from the idea + impact + urgency. The link is
//  preserved on Task.sourceParkingId so the lineage is auditable.

export async function activateParkingItemAsTaskAction(
  parkingId: string,
  formData: FormData,
): Promise<{ taskId: string; taskCode: string }> {
  await requireFeature("parking_auto_promote");
  const userId = await ensureCbo();

  const parking = await prisma.parkingLot.findUnique({ where: { id: parkingId } });
  if (!parking) throw new Error("Parking item not found");

  const verticalId = String(formData.get("verticalId") || parking.verticalId || "");
  const priorityId = String(formData.get("priorityId") || "");
  const titleRaw = String(formData.get("title") || "").trim();
  const deadlineStr = String(formData.get("deadline") || "");

  if (!verticalId) throw new Error("Vertical is required to activate this parking item.");
  if (!priorityId) throw new Error("Priority is required.");

  const vertical = await prisma.vertical.findUnique({ where: { id: verticalId } });
  if (!vertical) throw new Error("Vertical not found");
  const priority = await prisma.priority.findUnique({ where: { id: priorityId } });
  if (!priority) throw new Error("Priority not found");

  const title =
    titleRaw ||
    (parking.idea.length > 60 ? parking.idea.slice(0, 57) + "…" : parking.idea);

  const slaDueAt = await computeSlaDueAt(priority.code);

  const created = await prisma.$transaction(async (tx) => {
    const count = await tx.task.count({ where: { verticalId } });
    const newCode = `${vertical.code}-${String(count + 1).padStart(3, "0")}`;
    const t = await tx.task.create({
      data: {
        code: newCode,
        title,
        description: [
          parking.idea,
          parking.suggestedBy ? `Suggested by: ${parking.suggestedBy}` : null,
          parking.expectedImpact ? `Impact: ${parking.expectedImpact}` : null,
          parking.urgency ? `Urgency: ${parking.urgency}` : null,
          parking.remarks ? `Remarks: ${parking.remarks}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        verticalId,
        priorityId,
        status: "NOT_STARTED",
        source: "NEW_IDEA",
        createdById: userId,
        deadline: deadlineStr ? new Date(deadlineStr) : null,
        slaDueAt,
        sourceParkingId: parking.id,
      },
    });
    await tx.parkingLot.update({
      where: { id: parkingId },
      data: { decision: "Activate" },
    });
    return t;
  });

  await writeAudit({
    actorId: userId,
    action: "parking.activated_as_task",
    entity: "ParkingLot",
    entityId: parkingId,
    after: { taskId: created.id, taskCode: created.code },
    note: `Activated as task ${created.code}`,
  });

  revalidatePath("/cbo/parking");
  revalidatePath("/sm/parking");
  revalidatePath("/sm/tasks");
  revalidatePath("/cbo");
  return { taskId: created.id, taskCode: created.code };
}
