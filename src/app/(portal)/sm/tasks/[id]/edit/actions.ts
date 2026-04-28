"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks, canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TaskSource, InterventionFlag, TaskStatus } from "@prisma/client";

const HUMAN_FIELD: Record<string, string> = {
  title: "Title",
  verticalId: "Vertical",
  subVerticalId: "Sub-vertical",
  priorityId: "Priority",
  ownerRoleId: "Owner role",
  deadline: "Deadline",
  frequency: "Frequency",
  source: "Source",
  expectedOutput: "Expected output",
  supportNeeded: "Support needed",
  nextAction: "Next action",
  intervention: "Dr. BN intervention",
  status: "Status",
};

async function ensureSm() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");
  return session.user.id;
}

// ────────── EDIT ──────────
export async function updateTaskAction(taskId: string, formData: FormData) {
  const userId = await ensureSm();

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { vertical: true, subVertical: true, priority: true, ownerRole: true },
  });
  if (!existing) throw new Error("Task not found");

  // Build the patch
  const patch: Partial<{
    title: string;
    verticalId: string;
    subVerticalId: string | null;
    priorityId: string;
    ownerRoleId: string | null;
    deadline: Date | null;
    frequency: string | null;
    source: TaskSource;
    expectedOutput: string | null;
    supportNeeded: string | null;
    nextAction: string | null;
    intervention: InterventionFlag;
    status: TaskStatus;
    lastUpdateAt: Date;
  }> = {
    title: String(formData.get("title") || "").trim(),
    verticalId: String(formData.get("verticalId") || ""),
    subVerticalId: (formData.get("subVerticalId") as string) || null,
    priorityId: String(formData.get("priorityId") || ""),
    ownerRoleId: (formData.get("ownerRoleId") as string) || null,
    frequency: (formData.get("frequency") as string) || null,
    source: ((formData.get("source") as string) || existing.source) as TaskSource,
    expectedOutput: (formData.get("expectedOutput") as string) || null,
    supportNeeded: (formData.get("supportNeeded") as string) || null,
    nextAction: (formData.get("nextAction") as string) || null,
    intervention: ((formData.get("intervention") as string) || "NO") as InterventionFlag,
    status: ((formData.get("status") as string) || existing.status) as TaskStatus,
    lastUpdateAt: new Date(),
  };
  const deadlineStr = (formData.get("deadline") as string) || "";
  patch.deadline = deadlineStr ? new Date(deadlineStr) : null;

  // Compute diff for the audit trail (resolve foreign keys to human names where helpful)
  const labels = await resolveLabels(patch, existing);
  const diffs = buildDiff(existing, patch, labels);

  await prisma.task.update({ where: { id: taskId }, data: patch });

  if (diffs.length > 0) {
    await prisma.taskUpdate.create({
      data: {
        taskId,
        authorId: userId,
        note: `📝 Edit:\n${diffs.join("\n")}`,
        newStatus: patch.status !== existing.status ? patch.status : null,
      },
    });
  }

  revalidatePath(`/sm/tasks/${taskId}`);
  revalidatePath("/sm/tasks");
  revalidatePath("/sm");
  revalidatePath("/cbo");
  redirect(`/sm/tasks/${taskId}`);
}

// ────────── SOFT DELETE (drop) ──────────
export async function softDeleteTaskAction(taskId: string, reason: string) {
  const userId = await ensureSm();
  const session = await auth();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { interventions: { where: { resolved: false } } },
  });
  if (!task) throw new Error("Task not found");

  // Block delete if there's an open escalation — unless Super Admin
  if (task.interventions.length > 0 && !canConfigureSystem(session?.user.systemRole)) {
    throw new Error("This task has an open escalation to Dr. BN. Resolve the intervention first, or ask Super Admin to delete.");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "DROPPED", droppedAt: new Date() },
  });

  await prisma.taskUpdate.create({
    data: {
      taskId,
      authorId: userId,
      note: `🗑️ Dropped — Reason: ${reason || "(none given)"}`,
      newStatus: "DROPPED",
    },
  });

  revalidatePath(`/sm/tasks/${taskId}`);
  revalidatePath("/sm/tasks");
  revalidatePath("/sm/dropped");
  revalidatePath("/cbo");
}

// ────────── RESTORE (within 30 days) ──────────
export async function restoreTaskAction(taskId: string) {
  const userId = await ensureSm();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (task.status !== "DROPPED" || !task.droppedAt) throw new Error("Task is not dropped");

  const ageMs = Date.now() - task.droppedAt.getTime();
  const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (days > 30) throw new Error("Restore window expired (> 30 days). Duplicate it instead.");

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "NOT_STARTED", droppedAt: null, lastUpdateAt: new Date() },
  });
  await prisma.taskUpdate.create({
    data: {
      taskId,
      authorId: userId,
      note: "♻️ Restored from Dropped Archive.",
      newStatus: "NOT_STARTED",
    },
  });
  revalidatePath(`/sm/tasks/${taskId}`);
  revalidatePath("/sm/dropped");
  revalidatePath("/sm/tasks");
}

// ────────── DUPLICATE ──────────
export async function duplicateTaskAction(taskId: string): Promise<string> {
  const userId = await ensureSm();
  const original = await prisma.task.findUnique({ where: { id: taskId } });
  if (!original) throw new Error("Task not found");

  const vertical = await prisma.vertical.findUnique({ where: { id: original.verticalId } });
  if (!vertical) throw new Error("Vertical not found");
  const count = await prisma.task.count({ where: { verticalId: vertical.id } });
  const newCode = `${vertical.code}-${String(count + 1).padStart(3, "0")}`;

  const created = await prisma.task.create({
    data: {
      code: newCode,
      title: `${original.title} (copy)`,
      description: original.description,
      verticalId: original.verticalId,
      subVerticalId: original.subVerticalId,
      priorityId: original.priorityId,
      ownerRoleId: original.ownerRoleId,
      ownerUserId: original.ownerUserId,
      createdById: userId,
      deadline: null,
      frequency: original.frequency,
      source: original.source,
      supportNeeded: original.supportNeeded,
      nextAction: original.nextAction,
      intervention: "NO",
      expectedOutput: original.expectedOutput,
      status: "NOT_STARTED",
      lastUpdateAt: new Date(),
    },
  });

  await prisma.taskUpdate.create({
    data: { taskId: created.id, authorId: userId, note: `📑 Duplicated from ${original.code}.` },
  });

  revalidatePath("/sm/tasks");
  return created.id;
}

// ────────── BULK ACTIONS ──────────
export async function bulkUpdateAction(
  ids: string[],
  patch: { status?: TaskStatus; ownerRoleId?: string | null; action?: "drop" }
) {
  const userId = await ensureSm();
  if (ids.length === 0) return;
  const session = await auth();

  if (patch.action === "drop") {
    // Block drop on any task with open escalation (unless super admin)
    if (!canConfigureSystem(session?.user.systemRole)) {
      const blocked = await prisma.task.count({
        where: { id: { in: ids }, interventions: { some: { resolved: false } } },
      });
      if (blocked > 0) throw new Error(`${blocked} of the selected tasks have open escalations. Resolve them first.`);
    }
    await prisma.task.updateMany({
      where: { id: { in: ids } },
      data: { status: "DROPPED", droppedAt: new Date() },
    });
    await prisma.taskUpdate.createMany({
      data: ids.map((id) => ({ taskId: id, authorId: userId, note: "🗑️ Bulk dropped.", newStatus: "DROPPED" as TaskStatus })),
    });
  } else {
    const data: { status?: TaskStatus; ownerRoleId?: string | null; lastUpdateAt: Date } = { lastUpdateAt: new Date() };
    if (patch.status) data.status = patch.status;
    if (patch.ownerRoleId !== undefined) data.ownerRoleId = patch.ownerRoleId;
    await prisma.task.updateMany({ where: { id: { in: ids } }, data });
    await prisma.taskUpdate.createMany({
      data: ids.map((id) => ({
        taskId: id,
        authorId: userId,
        note: `🔄 Bulk update — ${[
          patch.status ? `status → ${patch.status.replace(/_/g, " ")}` : null,
          patch.ownerRoleId !== undefined ? "owner reassigned" : null,
        ].filter(Boolean).join(", ")}`,
        newStatus: patch.status ?? null,
      })),
    });
  }

  revalidatePath("/sm/tasks");
  revalidatePath("/sm");
  revalidatePath("/cbo");
}

// ───────────────────────── helpers ─────────────────────────
type ExistingTask = Awaited<ReturnType<typeof prisma.task.findUnique<{ where: { id: string }, include: { vertical: true; subVertical: true; priority: true; ownerRole: true } }>>>;
type Patch = Record<string, unknown>;

async function resolveLabels(patch: Patch, existing: ExistingTask) {
  const labels: Record<string, { from?: string | null; to?: string | null }> = {};
  if (!existing) return labels;

  if (patch.verticalId && patch.verticalId !== existing.verticalId) {
    const v = await prisma.vertical.findUnique({ where: { id: patch.verticalId as string }, select: { name: true } });
    labels.verticalId = { from: existing.vertical?.name, to: v?.name };
  }
  if ((patch.subVerticalId ?? null) !== (existing.subVerticalId ?? null)) {
    let toName: string | null = null;
    if (patch.subVerticalId) {
      const sv = await prisma.subVertical.findUnique({ where: { id: patch.subVerticalId as string }, select: { name: true } });
      toName = sv?.name ?? null;
    }
    labels.subVerticalId = { from: existing.subVertical?.name ?? null, to: toName };
  }
  if (patch.priorityId && patch.priorityId !== existing.priorityId) {
    const p = await prisma.priority.findUnique({ where: { id: patch.priorityId as string }, select: { code: true, label: true } });
    labels.priorityId = { from: `${existing.priority.code} ${existing.priority.label}`, to: p ? `${p.code} ${p.label}` : null };
  }
  if ((patch.ownerRoleId ?? null) !== (existing.ownerRoleId ?? null)) {
    let toName: string | null = null;
    if (patch.ownerRoleId) {
      const r = await prisma.ownerRole.findUnique({ where: { id: patch.ownerRoleId as string }, select: { name: true } });
      toName = r?.name ?? null;
    }
    labels.ownerRoleId = { from: existing.ownerRole?.name ?? null, to: toName };
  }
  return labels;
}

function buildDiff(existing: NonNullable<ExistingTask>, patch: Patch, labels: Record<string, { from?: string | null; to?: string | null }>) {
  const lines: string[] = [];
  for (const key of Object.keys(patch)) {
    if (key === "lastUpdateAt") continue;

    if (labels[key]) {
      lines.push(`• ${HUMAN_FIELD[key] ?? key}: ${fmt(labels[key].from)} → ${fmt(labels[key].to)}`);
      continue;
    }

    const before = (existing as unknown as Record<string, unknown>)[key];
    const after = (patch as Record<string, unknown>)[key];

    if (key === "deadline") {
      const a = before instanceof Date ? before.toISOString().slice(0, 10) : null;
      const b = after instanceof Date ? after.toISOString().slice(0, 10) : null;
      if (a !== b) lines.push(`• Deadline: ${fmt(a)} → ${fmt(b)}`);
      continue;
    }

    if (typeof before === "object" || typeof after === "object") continue; // skip relations
    if ((before ?? null) !== (after ?? null)) {
      const human = HUMAN_FIELD[key] ?? key;
      lines.push(`• ${human}: ${fmt(before)} → ${fmt(after)}`);
    }
  }
  return lines;
}

function fmt(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v).replace(/_/g, " ");
}
