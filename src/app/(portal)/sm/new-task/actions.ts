"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { notifyAllCBO, notifyUser } from "@/lib/notify";
import { sendTaskEmailToOwners } from "@/lib/email";
import type { TaskSource, InterventionFlag } from "@prisma/client";
import { computeSlaDueAt } from "@/lib/sla";
import { writeAudit } from "@/lib/audit";
import { friendlyPrismaError } from "@/lib/prisma-errors";
import { computeNextTaskCode } from "@/lib/task-code";

export type CreateTaskResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createTaskAction(formData: FormData): Promise<CreateTaskResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    // Return — do NOT throw. Thrown server-action errors become opaque
    // `digest:` blobs in production and the user sees nothing useful.
    return {
      success: false,
      error: "Your session is no longer valid or you don't have permission to add tasks. Please sign in again.",
    };
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

  // ── Resolve owner by email ──────────────────────────────────────────────────
  // ownerEmail is the contact address stored on the OwnerRole (set by admin in
  // the Roles page). It does NOT need to be a system login. We attempt to find
  // a matching User so we can link ownerUserId (enabling in-app notifications),
  // but if no User exists we still create the task and send the email directly.
  let ownerUserId: string | null = null;
  // ownerNotify — used for the email notification; may be a non-system contact.
  let ownerNotify: { name: string; email: string } | null = null;
  if (ownerEmail) {
    const found = await prisma.user.findUnique({
      where: { email: ownerEmail },
      select: { id: true, name: true, email: true, active: true },
    });
    if (found && found.active) {
      // Matched a system user — link them for in-app notifications too.
      ownerUserId = found.id;
      ownerNotify = { name: found.name, email: found.email };
    } else {
      // Not a system user (e.g. a role contact without a login).
      // Proceed without ownerUserId; still send the notification email.
      // Try to get the contact name from the role record.
      const roleName = ownerRoleId
        ? (await prisma.ownerRole.findUnique({ where: { id: ownerRoleId }, select: { ownerName: true } }))?.ownerName
        : null;
      ownerNotify = { name: roleName || ownerEmail, email: ownerEmail };
    }
  }

  // ── Resolve sub-owner by email ───────────────────────────────────────────
  let subOwnerId: string | null = null;
  let subOwnerNotify: { name: string; email: string } | null = null;
  if (subOwnerEmail) {
    const found = await prisma.user.findUnique({
      where: { email: subOwnerEmail },
      select: { id: true, name: true, email: true, active: true },
    });
    if (found && found.active) {
      subOwnerId = found.id;
      subOwnerNotify = { name: found.name, email: found.email };
    } else {
      // Not a system user — still notify via email, skip the FK link.
      subOwnerNotify = { name: subOwnerEmail, email: subOwnerEmail };
    }
  }

  const priority = await prisma.priority.findUnique({
    where: { id: priorityId },
    select: { code: true, label: true },
  });

  // ── Compute SLA due-at if SLA engine is on ──
  const slaDueAt = priority ? await computeSlaDueAt(priority.code) : null;

  // ── Atomic code generation + task creation ──
  //
  // The next per-vertical code is computed by `computeNextTaskCode`, which
  // takes a per-vertical Postgres advisory lock and parses the numeric suffix
  // of existing codes IN JAVASCRIPT — not via a SQL regex. (A `\d` regex
  // inside a Prisma `$queryRaw` template literal is silently cooked down to
  // `d`, which made the old query always return 1 and collide forever. See
  // src/lib/task-code.ts for the full history.)
  //
  // The retry loop is a belt-and-suspenders defence: if some out-of-band
  // insert (manual SQL, data import) ever causes a P2002, the next attempt
  // recomputes the max from freshly committed data and moves past it.
  let created;
  const MAX_ATTEMPTS = 5;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      created = await prisma.$transaction(async (tx) => {
        const code = await computeNextTaskCode(tx, verticalId, vertical.code);

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
      lastErr = null;
      break; // success
    } catch (err: unknown) {
      lastErr = err;
      // P2002 = unique constraint violation. Retry — recompute on next attempt.
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        continue;
      }
      // Any other Prisma/DB error: convert to a returned result so the user
      // sees the actual problem instead of an opaque "An unexpected error".
      console.error("[createTaskAction] DB error", err);
      return {
        success: false,
        error: friendlyPrismaError(err) ?? "Could not create the task because of a database error. Please contact support.",
      };
    }
  }
  if (!created) {
    console.error("[createTaskAction] exhausted retries", lastErr);
    return {
      success: false,
      error: "Could not generate a unique task code after several attempts. Please refresh and try again.",
    };
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

  // Personal in-app notifications — owner, sub-owner, AND creator each get
  // a bell update. Without this the assigned owner had no idea a task was
  // pinned to them, and the creator had no confirmation of the create.
  // De-dup so the same user (e.g. SM is both creator and owner) gets one row.
  const personalRecipients = new Set<string>();
  if (ownerUserId) personalRecipients.add(ownerUserId);
  if (subOwnerId) personalRecipients.add(subOwnerId);
  personalRecipients.add(session.user.id);
  await Promise.all(
    Array.from(personalRecipients).map((recipientId) =>
      notifyUser(recipientId, {
        kind: "task.created",
        title: `New task in ${vertical.name}`,
        body: `${created!.code} · ${title}`,
        link: `/sm/tasks/${created!.id}`,
        refId: created!.id,
        senderId: session.user.id,
      })
    )
  );

  const creatorName = session.user.name || "Strategic Manager";
  await sendTaskEmailToOwners({
    owner: ownerNotify,
    subOwner: subOwnerNotify,
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
