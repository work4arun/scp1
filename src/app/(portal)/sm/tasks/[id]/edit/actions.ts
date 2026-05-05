"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks, canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TaskSource, InterventionFlag, TaskStatus } from "@prisma/client";
import { sendTaskEmailToOwners } from "@/lib/email";
import { notifyAllCBO } from "@/lib/notify";
import { writeAudit } from "@/lib/audit";
import { isEnabled } from "@/lib/features";

const HUMAN_FIELD: Record<string, string> = {
  title: "Title",
  verticalId: "Vertical",
  subVerticalId: "Sub-vertical",
  priorityId: "Priority",
  ownerRoleId: "Owner role",
  ownerUserId: "Owner",
  subOwnerId: "Sub-owner",
  deadline: "Deadline",
  frequency: "Frequency",
  source: "Source",
  expectedOutput: "Expected output",
  supportNeeded: "Support needed",
  delayReason: "Delay reason",
  nextAction: "Next action",
  intervention: "Dr. BN intervention",
  status: "Status",
};

export type UpdateTaskResult = { success: false; error: string } | { success: true };

async function ensureSm() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");
  return session.user.id;
}

// ────────── EDIT ──────────
export async function updateTaskAction(taskId: string, formData: FormData): Promise<UpdateTaskResult> {
  const session = await auth();
  const userId = await ensureSm();

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      vertical: true,
      subVertical: true,
      priority: true,
      ownerRole: true,
      ownerUser: true,
      subOwner: true,
    },
  });
  if (!existing) throw new Error("Task not found");

  // ── Resolve owner by email ──
  const ownerEmailInput = ((formData.get("ownerEmail") as string) || "").trim().toLowerCase();
  let ownerUserId: string | null = existing.ownerUserId;
  let newOwnerUser: { id: string; name: string; email: string } | null = null;

  if (ownerEmailInput === "") {
    ownerUserId = null;
  } else if (ownerEmailInput !== (existing.ownerUser?.email ?? "")) {
    const found = await prisma.user.findUnique({
      where: { email: ownerEmailInput },
      select: { id: true, name: true, email: true, active: true },
    });
    if (!found || !found.active) {
      return { success: false, error: `No active user found with email "${ownerEmailInput}". Please check and try again.` };
    }
    ownerUserId = found.id;
    newOwnerUser = found;
  }

  // ── Resolve sub-owner by email ──
  const subOwnerEmailInput = ((formData.get("subOwnerEmail") as string) || "").trim().toLowerCase();
  let subOwnerId: string | null = existing.subOwnerId;
  let newSubOwnerUser: { id: string; name: string; email: string } | null = null;

  if (subOwnerEmailInput === "") {
    subOwnerId = null;
  } else if (subOwnerEmailInput !== (existing.subOwner?.email ?? "")) {
    const found = await prisma.user.findUnique({
      where: { email: subOwnerEmailInput },
      select: { id: true, name: true, email: true, active: true },
    });
    if (!found || !found.active) {
      return { success: false, error: `No active user found with email "${subOwnerEmailInput}". Please check and try again.` };
    }
    subOwnerId = found.id;
    newSubOwnerUser = found;
  }

  // Build the patch
  const patch: Partial<{
    title: string;
    verticalId: string;
    subVerticalId: string | null;
    priorityId: string;
    ownerRoleId: string | null;
    ownerUserId: string | null;
    subOwnerId: string | null;
    deadline: Date | null;
    frequency: string | null;
    source: TaskSource;
    expectedOutput: string | null;
    supportNeeded: string | null;
    delayReason: string | null;
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
    ownerUserId,
    subOwnerId,
    frequency: (formData.get("frequency") as string) || null,
    source: ((formData.get("source") as string) || existing.source) as TaskSource,
    expectedOutput: (formData.get("expectedOutput") as string) || null,
    supportNeeded: (formData.get("supportNeeded") as string) || null,
    delayReason: (formData.get("delayReason") as string) || null,
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

  // ── Email notifications ──
  const updaterName = session?.user.name || "Strategic Manager";
  const changedSummary = diffs.join("\n");

  const taskDeadline = deadlineStr || (existing.deadline ? existing.deadline.toISOString().slice(0, 10) : null);
  const priorityLabel = existing.priority ? `${existing.priority.code} — ${existing.priority.label}` : "Unknown";
  const taskTitle = patch.title || existing.title;

  // ── Email: newly assigned owner / sub-owner ──
  if (newOwnerUser || newSubOwnerUser) {
    await sendTaskEmailToOwners({
      owner: newOwnerUser,
      subOwner: newSubOwnerUser,
      taskCode: existing.code,
      taskTitle,
      taskId,
      verticalName: existing.vertical.name,
      priorityLabel,
      deadline: taskDeadline,
      eventType: "assigned",
      updatedByName: updaterName,
    });
  }

  // ── Email: notify OLD owner that they've been removed ──
  const ownerWasRemoved = existing.ownerUser && ownerUserId !== existing.ownerUserId;
  const subOwnerWasRemoved = existing.subOwner && subOwnerId !== existing.subOwnerId;
  if (ownerWasRemoved && existing.ownerUser) {
    await sendTaskEmailToOwners({
      owner: { email: existing.ownerUser.email, name: existing.ownerUser.name },
      subOwner: subOwnerWasRemoved && existing.subOwner ? { email: existing.subOwner.email, name: existing.subOwner.name } : null,
      taskCode: existing.code,
      taskTitle,
      taskId,
      verticalName: existing.vertical.name,
      priorityLabel,
      deadline: taskDeadline,
      eventType: "unassigned" as "updated",   // reuse "updated" event type
      updatedByName: updaterName,
      changedSummary: "You have been removed as owner of this task.",
    });
  } else if (subOwnerWasRemoved && existing.subOwner && !ownerWasRemoved) {
    await sendTaskEmailToOwners({
      owner: null,
      subOwner: { email: existing.subOwner.email, name: existing.subOwner.name },
      taskCode: existing.code,
      taskTitle,
      taskId,
      verticalName: existing.vertical.name,
      priorityLabel,
      deadline: taskDeadline,
      eventType: "updated",
      updatedByName: updaterName,
      changedSummary: "You have been removed as sub-owner of this task.",
    });
  }

  // ── Email: existing (unchanged) owner/sub-owner on other field changes ──
  if (diffs.length > 0) {
    const retainedOwner = ownerUserId && ownerUserId === existing.ownerUserId && existing.ownerUser && !newOwnerUser
      ? { email: existing.ownerUser.email, name: existing.ownerUser.name }
      : null;
    const retainedSubOwner = subOwnerId && subOwnerId === existing.subOwnerId && existing.subOwner && !newSubOwnerUser
      ? { email: existing.subOwner.email, name: existing.subOwner.name }
      : null;

    if (retainedOwner || retainedSubOwner) {
      await sendTaskEmailToOwners({
        owner: retainedOwner,
        subOwner: retainedSubOwner,
        taskCode: existing.code,
        taskTitle,
        taskId,
        verticalName: existing.vertical.name,
        priorityLabel,
        deadline: taskDeadline,
        eventType: "updated",
        updatedByName: updaterName,
        changedSummary,
      });
    }
  }

  // ── In-app CBO notification ──
  await notifyAllCBO({
    kind: "task.updated",
    title: `Task updated in ${existing.vertical.name}`,
    body: `${existing.code} · ${taskTitle}`,
    link: `/cbo/verticals/${existing.vertical.code}`,
    refId: taskId,
    senderId: userId,
  });

  redirect(`/sm/tasks/${taskId}`);
}

// ────────── HARD DELETE ──────────
// Tasks deleted from the SM portal are permanently removed — there is no
// soft-delete archive any more. The `Dropped` archive feature has been retired.
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

  const cleanedReason = (reason || "").trim();

  // Capture an audit trail before deletion (so we keep a record even though
  // the row itself is gone). `before` snapshots everything we had on the task.
  await writeAudit({
    actorId: userId,
    action: "task.delete",
    entity: "Task",
    entityId: taskId,
    before: task,
    after: null,
    note: cleanedReason || null,
  });

  // Detach interventions / appointments that reference this task before
  // deleting — those FKs are not declared `onDelete: Cascade` in the schema,
  // and we don't want to accidentally lose escalation history.
  await prisma.$transaction([
    prisma.intervention.updateMany({ where: { taskId }, data: { taskId: null } }),
    prisma.appointment.updateMany({ where: { taskId }, data: { taskId: null } }),
    // TaskUpdate is set to onDelete: Cascade in the schema, so it's removed
    // automatically when the parent task goes.
    prisma.task.delete({ where: { id: taskId } }),
  ]);

  revalidatePath("/sm/tasks");
  revalidatePath("/sm");
  revalidatePath("/cbo");
}

// ────────── DUPLICATE ──────────
export async function duplicateTaskAction(taskId: string): Promise<string> {
  const userId = await ensureSm();
  const original = await prisma.task.findUnique({ where: { id: taskId } });
  if (!original) throw new Error("Task not found");

  const vertical = await prisma.vertical.findUnique({ where: { id: original.verticalId } });
  if (!vertical) throw new Error("Vertical not found");

  // Wrap count + create in a transaction to prevent duplicate codes under concurrent requests
  const created = await prisma.$transaction(async (tx) => {
    const count = await tx.task.count({ where: { verticalId: vertical.id } });
    const newCode = `${vertical.code}-${String(count + 1).padStart(3, "0")}`;
    return tx.task.create({
      data: {
        code: newCode,
        title: `${original.title} (copy)`,
        description: original.description,
        verticalId: original.verticalId,
        subVerticalId: original.subVerticalId,
        priorityId: original.priorityId,
        ownerRoleId: original.ownerRoleId,
        ownerUserId: original.ownerUserId,
        subOwnerId: original.subOwnerId,
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
  patch: { status?: TaskStatus; ownerRoleId?: string | null; action?: "drop"; reason?: string }
) {
  const userId = await ensureSm();
  if (ids.length === 0) return;
  // Bulk endpoint is feature-flagged. When task_bulk_actions is OFF the
  // toolbar is hidden and we additionally refuse the action server-side so
  // the API surface stays consistent.
  if (!(await isEnabled("task_bulk_actions"))) {
    throw new Error("Bulk actions are disabled. Enable the feature flag at /admin/features.");
  }
  const session = await auth();

  if (patch.action === "drop") {
    // The "drop" action now performs a hard delete — the Dropped Archive has
    // been retired. We keep the action name "drop" for backwards-compat with
    // existing callers (BulkTaskList) but the effect is permanent removal.

    // Block delete on any task with open escalation (unless super admin)
    if (!canConfigureSystem(session?.user.systemRole)) {
      const blocked = await prisma.task.count({
        where: { id: { in: ids }, interventions: { some: { resolved: false } } },
      });
      if (blocked > 0) throw new Error(`${blocked} of the selected tasks have open escalations. Resolve them first.`);
    }

    const cleanedReason = (patch.reason || "").trim();

    // Snapshot for the audit trail before we remove the rows.
    const snapshot = await prisma.task.findMany({ where: { id: { in: ids } } });

    await writeAudit({
      actorId: userId,
      action: "task.bulk_delete",
      entity: "Task",
      entityId: null,
      before: snapshot,
      after: { ids, count: ids.length, reason: cleanedReason || null },
      note: `Bulk deleted ${ids.length} task(s)`,
    });

    await prisma.$transaction([
      prisma.intervention.updateMany({ where: { taskId: { in: ids } }, data: { taskId: null } }),
      prisma.appointment.updateMany({ where: { taskId: { in: ids } }, data: { taskId: null } }),
      prisma.task.deleteMany({ where: { id: { in: ids } } }),
    ]);
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

    await writeAudit({
      actorId: userId,
      action: "task.bulk_update",
      entity: "Task",
      entityId: null,
      after: { ids, count: ids.length, patch: { status: patch.status, ownerRoleId: patch.ownerRoleId } },
      note: `Bulk updated ${ids.length} task(s)`,
    });
  }

  revalidatePath("/sm/tasks");
  revalidatePath("/sm");
  revalidatePath("/cbo");
}

// ───────────────────────── helpers ─────────────────────────
type ExistingTask = Awaited<ReturnType<typeof prisma.task.findUnique<{
  where: { id: string };
  include: { vertical: true; subVertical: true; priority: true; ownerRole: true; ownerUser: true; subOwner: true };
}>>>;
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
  if ((patch.ownerUserId ?? null) !== (existing.ownerUserId ?? null)) {
    let toName: string | null = null;
    if (patch.ownerUserId) {
      const u = await prisma.user.findUnique({ where: { id: patch.ownerUserId as string }, select: { name: true, email: true } });
      toName = u ? `${u.name} (${u.email})` : null;
    }
    labels.ownerUserId = {
      from: existing.ownerUser ? `${existing.ownerUser.name} (${existing.ownerUser.email})` : null,
      to: toName,
    };
  }
  if ((patch.subOwnerId ?? null) !== (existing.subOwnerId ?? null)) {
    let toName: string | null = null;
    if (patch.subOwnerId) {
      const u = await prisma.user.findUnique({ where: { id: patch.subOwnerId as string }, select: { name: true, email: true } });
      toName = u ? `${u.name} (${u.email})` : null;
    }
    labels.subOwnerId = {
      from: existing.subOwner ? `${existing.subOwner.name} (${existing.subOwner.email})` : null,
      to: toName,
    };
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
