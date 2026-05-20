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
  //
  // Previous implementation used `tx.task.count() + 1` which is racy by
  // construction: two concurrent transactions (or a single double-submit) read
  // the same count and produced the same code, hitting the `code @unique`
  // constraint (P2002). It also failed silently when dropped/legacy rows left
  // a gap that count() didn't see — count = 5 even though MKT-006 exists.
  //
  // Correct approach:
  //   1. Take a Postgres advisory transaction lock keyed on verticalId so
  //      concurrent creates against the same vertical serialize. Different
  //      verticals do not block each other. We cast hashtext()'s int4 result
  //      to bigint explicitly so PgBouncer / RDS Proxy don't mis-resolve the
  //      overload as the (int, int) form.
  //   2. Compute the next sequence by parsing the numeric suffix of the
  //      maximum existing code for this vertical (including dropped rows,
  //      so we never recycle a code).
  //   3. Wrap in a small retry loop as belt-and-suspenders defence against
  //      any out-of-band inserts.
  let created;
  const MAX_ATTEMPTS = 3;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      created = await prisma.$transaction(async (tx) => {
        // 1) Per-vertical advisory lock — released automatically on tx commit/rollback.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${verticalId})::bigint)`;

        // 2) Next number = MAX(numeric suffix of existing codes for this vertical) + 1.
        //    SUBSTRING ... '\d+$' extracts the trailing number of e.g. "MKT-007" -> "7".
        const rows = await tx.$queryRaw<{ next: bigint | number | null }[]>`
          SELECT COALESCE(MAX(CAST(SUBSTRING("code" FROM '\d+$') AS INTEGER)), 0) + 1 AS next
          FROM "Task" WHERE "verticalId" = ${verticalId}
        `;
        const nextNum = rows[0]?.next ? Number(rows[0].next) : 1;
        const code = `${vertical.code}-${String(nextNum).padStart(3, "0")}`;

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
      // P2002 = unique constraint violation. Retry — the advisory lock should
      // make this impossible, but if a manual insert slipped through we
      // recompute MAX(code)+1 on the next attempt.
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
