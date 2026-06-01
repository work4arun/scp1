"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCBO } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/features";
import { writeAudit } from "@/lib/audit";
import { computeSlaDueAt } from "@/lib/sla";
import { computeNextTaskCode } from "@/lib/task-code";
import { friendlyPrismaError } from "@/lib/prisma-errors";
import type { Task } from "@prisma/client";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

type Authed = { ok: true; userId: string } | { ok: false; error: string };

async function ensureCbo(): Promise<Authed> {
  const session = await auth();
  if (!isCBO(session?.user.systemRole) || !session?.user.id) {
    return { ok: false, error: FORBIDDEN_MSG };
  }
  return { ok: true, userId: session.user.id };
}

// ────────── Mark "seen" — powers the since-last-visit feed ──────────
// Fire-and-forget; errors are intentionally swallowed (column may not exist
// yet on a fresh deploy). No result type needed since the client never awaits
// the error path.
export async function markSeenAction() {
  const authed = await ensureCbo();
  if (!authed.ok) return; // silently skip — not worth an error banner for a background ping
  try {
    await prisma.user.update({ where: { id: authed.userId }, data: { lastSeenAt: new Date() } });
  } catch {
    // Column may not exist yet if `prisma db push` hasn't run. Ignore silently.
  }
}

// ────────── Resolve intervention with decision type + note ──────────
export type SimpleResult = { success: true } | { success: false; error: string };

export async function resolveInterventionRichAction(
  id: string,
  decisionType: string,
  note: string,
): Promise<SimpleResult> {
  const authed = await ensureCbo();
  if (!authed.ok) return { success: false, error: authed.error };

  try {
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
  } catch (err) {
    console.error("[resolveInterventionRichAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not resolve the intervention. Please try again.",
    };
  }

  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");
  revalidatePath("/cbo/daily");
  return { success: true };
}

// ────────── Snooze intervention ──────────
export async function snoozeInterventionAction(id: string, hours: number): Promise<SimpleResult> {
  const authed = await ensureCbo();
  if (!authed.ok) return { success: false, error: authed.error };

  const until = new Date(Date.now() + hours * 60 * 60 * 1000);
  try {
    await prisma.intervention.update({ where: { id }, data: { snoozedUntil: until } });
  } catch (err) {
    console.error("[snoozeInterventionAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not snooze the intervention. Please try again.",
    };
  }

  revalidatePath("/cbo/intervention");
  revalidatePath("/cbo");
  return { success: true };
}

// ────────── Drop private note for SM (no escalation) ──────────
export async function setInterventionCboNoteAction(id: string, note: string): Promise<SimpleResult> {
  const authed = await ensureCbo();
  if (!authed.ok) return { success: false, error: authed.error };

  try {
    await prisma.intervention.update({ where: { id }, data: { cboNote: note?.trim() || null } });
  } catch (err) {
    console.error("[setInterventionCboNoteAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not save the note. Please try again.",
    };
  }

  revalidatePath("/cbo/intervention");
  return { success: true };
}

// ────────── Pin / unpin items ──────────
export async function togglePinAction(
  kind: "task" | "intervention" | "vertical",
  refId: string,
): Promise<SimpleResult> {
  const authed = await ensureCbo();
  if (!authed.ok) return { success: false, error: authed.error };
  const { userId } = authed;

  try {
    const existing = await prisma.pin.findUnique({
      where: { userId_kind_refId: { userId, kind, refId } },
    });
    if (existing) await prisma.pin.delete({ where: { id: existing.id } });
    else await prisma.pin.create({ data: { userId, kind, refId } });
  } catch (err) {
    console.error("[togglePinAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not update pin. Please try again.",
    };
  }

  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Parking Lot → Task auto-promote (gated by `parking_auto_promote`)
// ─────────────────────────────────────────────────────────────────────────────
//  When CBO sets a Parking Lot decision to Activate, this action drafts a
//  fresh Task pre-filled from the idea + impact + urgency. The link is
//  preserved on Task.sourceParkingId so the lineage is auditable.

export type ActivateParkingResult =
  | { success: true; taskId: string; taskCode: string }
  | { success: false; error: string };

export async function activateParkingItemAsTaskAction(
  parkingId: string,
  formData: FormData,
): Promise<ActivateParkingResult> {
  try {
    await requireFeature("parking_auto_promote");
  } catch {
    return { success: false, error: "This feature is currently disabled. Ask a Super Admin to enable 'parking_auto_promote'." };
  }

  const authed = await ensureCbo();
  if (!authed.ok) return { success: false, error: authed.error };
  const { userId } = authed;

  const parking = await prisma.parkingLot.findUnique({ where: { id: parkingId } });
  if (!parking) return { success: false, error: "Parking item not found — it may have been deleted. Please refresh." };

  const verticalId = String(formData.get("verticalId") || parking.verticalId || "");
  const priorityId = String(formData.get("priorityId") || "");
  const titleRaw = String(formData.get("title") || "").trim();
  const deadlineStr = String(formData.get("deadline") || "");

  if (!verticalId) return { success: false, error: "Vertical is required to activate this parking item." };
  if (!priorityId) return { success: false, error: "Priority is required." };

  const vertical = await prisma.vertical.findUnique({ where: { id: verticalId } });
  if (!vertical) return { success: false, error: "Selected vertical was not found. Please refresh and try again." };
  const priority = await prisma.priority.findUnique({ where: { id: priorityId } });
  if (!priority) return { success: false, error: "Selected priority was not found. Please refresh and try again." };

  const title =
    titleRaw ||
    (parking.idea.length > 60 ? parking.idea.slice(0, 57) + "…" : parking.idea);

  const slaDueAt = await computeSlaDueAt(priority.code);

  // ── Atomic code generation + task creation ──
  // computeNextTaskCode (advisory lock + JS suffix parsing — see
  // src/lib/task-code.ts) replaces the old `count() + 1` formula, which
  // collided with a P2002 unique-constraint error whenever a task in the
  // vertical had been hard-deleted. The retry loop recomputes from freshly
  // committed data.
  let created: Task | null = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      created = await prisma.$transaction(async (tx) => {
        const newCode = await computeNextTaskCode(tx, verticalId, vertical.code);
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
      }, { maxWait: 30_000, timeout: 30_000 });
      lastErr = null;
      break;
    } catch (err: unknown) {
      lastErr = err;
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        continue; // code collided — recompute from committed data and retry
      }
      console.error("[activateParkingItemAsTaskAction] DB error", err);
      return {
        success: false,
        error: friendlyPrismaError(err) ?? "Could not create the task due to a database error. Please try again.",
      };
    }
  }
  if (!created) {
    console.error("[activateParkingItemAsTaskAction] exhausted retries", lastErr);
    return {
      success: false,
      error: "Could not generate a unique task code after several attempts. Please refresh and try again.",
    };
  }

  // writeAudit swallows its own errors.
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
  return { success: true, taskId: created.id, taskCode: created.code };
}
