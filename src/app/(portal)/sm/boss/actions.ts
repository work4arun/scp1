"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { notifyAllCBO } from "@/lib/notify";
import type { TaskSource, BossInstructionStatus, Task } from "@prisma/client";
import { isEnabled, requireFeature } from "@/lib/features";
import { writeAudit } from "@/lib/audit";
import { computeSlaDueAt } from "@/lib/sla";
import { computeNextTaskCode } from "@/lib/task-code";
import { friendlyPrismaError } from "@/lib/prisma-errors";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

export type CaptureResult = { success: true } | { success: false; error: string };

export async function captureBossInstructionAction(formData: FormData): Promise<CaptureResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: FORBIDDEN_MSG };
  }

  const instruction = String(formData.get("instruction") || "").trim();
  const source = ((formData.get("source") as string) || "BOSS_INSTRUCTION") as TaskSource;
  const verticalId = (formData.get("verticalId") as string) || null;
  const responseGiven = (formData.get("responseGiven") as string) || null;
  if (!instruction) return { success: false, error: "Instruction text is required." };

  try {
    await prisma.bossInstruction.create({
      data: {
        instruction,
        source,
        verticalId,
        responseGiven,
        capturedById: session.user.id,
      },
    });
  } catch (err) {
    console.error("[captureBossInstructionAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not save the instruction. Please try again.",
    };
  }

  revalidatePath("/sm/boss");
  revalidatePath("/cbo/daily");

  // notifyAllCBO swallows its own errors — no try/catch needed here.
  await notifyAllCBO({
    kind: "boss.captured",
    title: "📥 Boss instruction captured",
    body: instruction.length > 120 ? instruction.slice(0, 120) + "…" : instruction,
    link: "/cbo/daily",
    senderId: session.user.id,
  });

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Boss Instruction Activation Workflow (gated by `boss_instruction_workflow`)
// ─────────────────────────────────────────────────────────────────────────────

type Authed = { ok: true; userId: string } | { ok: false; error: string };

async function ensureSm(): Promise<Authed> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return { ok: false, error: FORBIDDEN_MSG };
  }
  return { ok: true, userId: session.user.id };
}

const STATUS_TO_LEGACY: Record<BossInstructionStatus, string> = {
  CAPTURED: "Captured",
  ACTIVATED: "Activated",
  PARKED: "Parked",
  CLOSED: "Closed",
};

export type SetStateResult = { success: true } | { success: false; error: string };

export async function setInstructionStateAction(
  instructionId: string,
  state: BossInstructionStatus,
): Promise<SetStateResult> {
  try {
    await requireFeature("boss_instruction_workflow");
  } catch {
    return { success: false, error: "This feature is currently disabled. Ask a Super Admin to enable 'boss_instruction_workflow'." };
  }

  const authed = await ensureSm();
  if (!authed.ok) return { success: false, error: authed.error };
  const { userId } = authed;

  const before = await prisma.bossInstruction.findUnique({ where: { id: instructionId } });
  if (!before) return { success: false, error: "Instruction not found — it may have been deleted. Please refresh." };

  try {
    const after = await prisma.bossInstruction.update({
      where: { id: instructionId },
      data: {
        state,
        status: STATUS_TO_LEGACY[state],
        activatedAt: state === "ACTIVATED" ? new Date() : before.activatedAt,
      },
    });

    // writeAudit swallows its own errors — no try/catch needed.
    await writeAudit({
      actorId: userId,
      action: `boss.${state.toLowerCase()}`,
      entity: "BossInstruction",
      entityId: instructionId,
      before,
      after,
    });
  } catch (err) {
    console.error("[setInstructionStateAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not update the instruction state. Please try again.",
    };
  }

  revalidatePath("/sm/boss");
  revalidatePath("/cbo/daily");
  return { success: true };
}

/**
 * Promote a captured Boss Instruction to a draft Task. Sets
 * BossInstruction.linkedTaskId + state=ACTIVATED so the lineage is preserved.
 *
 * Required form fields: priorityId
 * Optional: verticalId (falls back to instruction.verticalId), title (falls
 * back to a 60-char excerpt of the instruction text), deadline.
 */
export type ActivateResult =
  | { success: true; taskId: string; taskCode: string }
  | { success: false; error: string };

export async function activateInstructionAsTaskAction(
  instructionId: string,
  formData: FormData,
): Promise<ActivateResult> {
  try {
    await requireFeature("boss_instruction_workflow");
  } catch {
    return { success: false, error: "This feature is currently disabled. Ask a Super Admin to enable 'boss_instruction_workflow'." };
  }

  const authed = await ensureSm();
  if (!authed.ok) return { success: false, error: authed.error };
  const { userId } = authed;

  const instruction = await prisma.bossInstruction.findUnique({ where: { id: instructionId } });
  if (!instruction) return { success: false, error: "Instruction not found — it may have been deleted. Please refresh." };
  if (instruction.linkedTaskId) {
    return { success: false, error: "This instruction has already been activated as a task." };
  }

  const verticalId = String(formData.get("verticalId") || instruction.verticalId || "");
  const priorityId = String(formData.get("priorityId") || "");
  if (!verticalId) return { success: false, error: "Vertical is required to activate this instruction." };
  if (!priorityId) return { success: false, error: "Priority is required to activate this instruction." };

  const titleRaw = String(formData.get("title") || "").trim();
  const title =
    titleRaw ||
    (instruction.instruction.length > 60
      ? instruction.instruction.slice(0, 57) + "…"
      : instruction.instruction);
  const deadlineStr = String(formData.get("deadline") || "");
  const deadline = deadlineStr ? new Date(deadlineStr) : null;

  const vertical = await prisma.vertical.findUnique({ where: { id: verticalId } });
  if (!vertical) return { success: false, error: "Selected vertical was not found. Please refresh and try again." };

  const priority = await prisma.priority.findUnique({ where: { id: priorityId } });
  if (!priority) return { success: false, error: "Selected priority was not found. Please refresh and try again." };

  const slaDueAt = await computeSlaDueAt(priority.code);

  // ── Atomic code generation + task creation ──
  // The next per-vertical code comes from computeNextTaskCode (advisory lock +
  // JS suffix parsing — see src/lib/task-code.ts). The previous `count() + 1`
  // formula collided with a P2002 unique-constraint error whenever any task in
  // the vertical had been hard-deleted (count would be 5 even though MKT-006
  // already existed). The retry loop recomputes from freshly committed data.
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
            description: instruction.instruction,
            verticalId,
            priorityId,
            status: "NOT_STARTED",
            source: "BOSS_INSTRUCTION",
            createdById: userId,
            deadline,
            slaDueAt,
            sourceInstructionId: instruction.id,
          },
        });
        await tx.bossInstruction.update({
          where: { id: instructionId },
          data: {
            state: "ACTIVATED",
            status: "Activated",
            activatedAt: new Date(),
            linkedTaskId: t.id,
          },
        });
        return t;
      });
      lastErr = null;
      break;
    } catch (err: unknown) {
      lastErr = err;
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        continue; // code collided — recompute from committed data and retry
      }
      console.error("[activateInstructionAsTaskAction] DB error", err);
      return {
        success: false,
        error: friendlyPrismaError(err) ?? "Could not create the task due to a database error. Please try again.",
      };
    }
  }
  if (!created) {
    console.error("[activateInstructionAsTaskAction] exhausted retries", lastErr);
    return {
      success: false,
      error: "Could not generate a unique task code after several attempts. Please refresh and try again.",
    };
  }

  // writeAudit and notifyAllCBO swallow their own errors.
  await writeAudit({
    actorId: userId,
    action: "boss.activated_as_task",
    entity: "BossInstruction",
    entityId: instructionId,
    after: { taskId: created.id, taskCode: created.code },
    note: `Activated as task ${created.code}`,
  });

  if (await isEnabled("audit_log_v2")) {
    await notifyAllCBO({
      kind: "task.created",
      title: `🎯 Task activated from boss instruction`,
      body: `${created.code} · ${created.title}`,
      link: `/cbo/verticals/${vertical.code}`,
      refId: created.id,
      senderId: userId,
    });
  }

  revalidatePath("/sm/boss");
  revalidatePath("/sm/tasks");
  revalidatePath("/cbo");
  return { success: true, taskId: created.id, taskCode: created.code };
}
