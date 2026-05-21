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

export async function captureBossInstructionAction(formData: FormData) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");

  const instruction = String(formData.get("instruction") || "").trim();
  const source = ((formData.get("source") as string) || "BOSS_INSTRUCTION") as TaskSource;
  const verticalId = (formData.get("verticalId") as string) || null;
  const responseGiven = (formData.get("responseGiven") as string) || null;
  if (!instruction) return;

  await prisma.bossInstruction.create({
    data: {
      instruction,
      source,
      verticalId,
      responseGiven,
      capturedById: session.user.id,
    },
  });

  revalidatePath("/sm/boss");
  revalidatePath("/cbo/daily");

  await notifyAllCBO({
    kind: "boss.captured",
    title: "📥 Boss instruction captured",
    body: instruction.length > 120 ? instruction.slice(0, 120) + "…" : instruction,
    link: "/cbo/daily",
    senderId: session.user.id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Boss Instruction Activation Workflow (gated by `boss_instruction_workflow`)
// ─────────────────────────────────────────────────────────────────────────────

async function ensureSm() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    throw new Error("Forbidden");
  }
  return session.user.id;
}

const STATUS_TO_LEGACY: Record<BossInstructionStatus, string> = {
  CAPTURED: "Captured",
  ACTIVATED: "Activated",
  PARKED: "Parked",
  CLOSED: "Closed",
};

export async function setInstructionStateAction(
  instructionId: string,
  state: BossInstructionStatus,
) {
  await requireFeature("boss_instruction_workflow");
  const userId = await ensureSm();

  const before = await prisma.bossInstruction.findUnique({ where: { id: instructionId } });
  if (!before) throw new Error("Instruction not found");

  const after = await prisma.bossInstruction.update({
    where: { id: instructionId },
    data: {
      state,
      status: STATUS_TO_LEGACY[state],
      activatedAt: state === "ACTIVATED" ? new Date() : before.activatedAt,
    },
  });

  await writeAudit({
    actorId: userId,
    action: `boss.${state.toLowerCase()}`,
    entity: "BossInstruction",
    entityId: instructionId,
    before,
    after,
  });

  revalidatePath("/sm/boss");
  revalidatePath("/cbo/daily");
}

/**
 * Promote a captured Boss Instruction to a draft Task. Sets
 * BossInstruction.linkedTaskId + state=ACTIVATED so the lineage is preserved.
 *
 * Required form fields: priorityId
 * Optional: verticalId (falls back to instruction.verticalId), title (falls
 * back to a 60-char excerpt of the instruction text), deadline.
 */
export async function activateInstructionAsTaskAction(
  instructionId: string,
  formData: FormData,
): Promise<{ taskId: string; taskCode: string }> {
  await requireFeature("boss_instruction_workflow");
  const userId = await ensureSm();

  const instruction = await prisma.bossInstruction.findUnique({ where: { id: instructionId } });
  if (!instruction) throw new Error("Instruction not found");
  if (instruction.linkedTaskId) {
    throw new Error("This instruction has already been activated as a task.");
  }

  const verticalId = String(formData.get("verticalId") || instruction.verticalId || "");
  const priorityId = String(formData.get("priorityId") || "");
  if (!verticalId) throw new Error("Vertical is required to activate this instruction.");
  if (!priorityId) throw new Error("Priority is required to activate this instruction.");

  const titleRaw = String(formData.get("title") || "").trim();
  const title =
    titleRaw ||
    (instruction.instruction.length > 60
      ? instruction.instruction.slice(0, 57) + "…"
      : instruction.instruction);
  const deadlineStr = String(formData.get("deadline") || "");
  const deadline = deadlineStr ? new Date(deadlineStr) : null;

  const vertical = await prisma.vertical.findUnique({ where: { id: verticalId } });
  if (!vertical) throw new Error("Vertical not found");

  const priority = await prisma.priority.findUnique({ where: { id: priorityId } });
  if (!priority) throw new Error("Priority not found");

  const slaDueAt = await computeSlaDueAt(priority.code);

  // ── Atomic code generation + task creation ──
  // The next per-vertical code comes from computeNextTaskCode (advisory lock +
  // JS suffix parsing — see src/lib/task-code.ts). The previous `count() + 1`
  // formula collided with a P2002 unique-constraint error whenever any task in
  // the vertical had been hard-deleted (count would be 5 even though MKT-006
  // already existed). The retry loop recomputes from freshly committed data.
  let created: Task | null = null;
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
      break;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        continue; // code collided — recompute from committed data and retry
      }
      throw err;
    }
  }
  if (!created) {
    throw new Error("Could not generate a unique task code after several attempts. Please refresh and try again.");
  }

  await writeAudit({
    actorId: userId,
    action: "boss.activated_as_task",
    entity: "BossInstruction",
    entityId: instructionId,
    after: { taskId: created.id, taskCode: created.code },
    note: `Activated as task ${created.code}`,
  });

  // Notify CBO so they can see the new task in their daily summary.
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
  return { taskId: created.id, taskCode: created.code };
}
