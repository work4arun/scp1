"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import type { TaskSource, InterventionFlag } from "@prisma/client";
import { writeAudit } from "@/lib/audit";
import { friendlyPrismaError } from "@/lib/prisma-errors";
import { computeNextTaskCode } from "@/lib/task-code";

export type CreateTaskResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createTaskAction(formData: FormData): Promise<CreateTaskResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: "Your session is no longer valid or you don't have permission to add tasks." };
  }

  const verticalId   = String(formData.get("verticalId") || "").trim();
  const subVerticalId = (formData.get("subVerticalId") as string) || null;
  const priorityId   = String(formData.get("priorityId") || "").trim();
  const title        = String(formData.get("title") || "").trim();
  const deadlineStr  = (formData.get("deadline") as string) || "";
  const frequency    = (formData.get("frequency") as string) || null;
  const source       = ((formData.get("source") as string) || "SELF_STRATEGY") as TaskSource;
  const expectedOutput = (formData.get("expectedOutput") as string) || null;
  const supportNeeded  = (formData.get("supportNeeded") as string) || null;
  const nextAction     = (formData.get("nextAction") as string) || null;
  const intervention   = ((formData.get("intervention") as string) || "NO") as InterventionFlag;

  // Multi-team IDs (comma-separated)
  const teamIdsRaw = (formData.get("teamIds") as string) || "";
  const teamIds = teamIdsRaw ? teamIdsRaw.split(",").map((id) => id.trim()).filter(Boolean) : [];
  // Per-team email toggles: teamId_sendEmail fields
  const teamSendEmailMap = new Map<string, boolean>();
  for (const tid of teamIds) {
    const sendVal = formData.get(`teamsend_${tid}`);
    teamSendEmailMap.set(tid, sendVal !== "false"); // default true if not present
  }

  // Individual member IDs (comma-separated)  
  const memberIdsRaw = (formData.get("memberIds") as string) || "";
  const memberIds = memberIdsRaw ? memberIdsRaw.split(",").map((id) => id.trim()).filter(Boolean) : [];
  const memberSendEmailMap = new Map<string, boolean>();
  for (const mid of memberIds) {
    const sendVal = formData.get(`membersend_${mid}`);
    memberSendEmailMap.set(mid, sendVal !== "false");
  }

  if (!title)      return { success: false, error: "Task title is required." };
  if (!verticalId) return { success: false, error: "Please select a vertical." };
  if (!priorityId) return { success: false, error: "Please select a priority." };

  if (teamIds.length === 0 && memberIds.length === 0) {
    return { success: false, error: "Please assign at least one team or member." };
  }

  const vertical = await prisma.vertical.findUnique({ where: { id: verticalId } });
  if (!vertical) return { success: false, error: "Selected vertical was not found." };

  let created;
  const MAX_ATTEMPTS = 5;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      created = await prisma.$transaction(async (tx) => {
        const code = await computeNextTaskCode(tx, verticalId, vertical.code);
        const task = await tx.task.create({
          data: {
            code,
            title,
            verticalId,
            subVerticalId: subVerticalId || null,
            priorityId,
            createdById: session.user.id,
            deadline: deadlineStr ? new Date(deadlineStr) : null,
            frequency,
            source,
            expectedOutput,
            supportNeeded,
            nextAction,
            intervention,
            lastUpdateAt: new Date(),
          },
        });

        // Create team assignments
        if (teamIds.length > 0) {
          await tx.taskTeamAssignment.createMany({
            data: teamIds.map((tid) => ({
              taskId: task.id,
              teamId: tid,
              sendEmail: teamSendEmailMap.get(tid) ?? true,
            })),
          });
        }

        // Create individual member assignments
        if (memberIds.length > 0) {
          await tx.taskAssignment.createMany({
            data: memberIds.map((mid) => ({
              taskId: task.id,
              memberId: mid,
              sendEmail: memberSendEmailMap.get(mid) ?? true,
            })),
          });
        }

        return task;
      }, { maxWait: 30_000, timeout: 30_000 });
      lastErr = null;
      break;
    } catch (err: unknown) {
      lastErr = err;
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") continue;
      console.error("[createTaskAction] DB error", err);
      return { success: false, error: friendlyPrismaError(err) ?? "Could not create the task." };
    }
  }
  if (!created) {
    console.error("[createTaskAction] exhausted retries", lastErr);
    return { success: false, error: "Could not generate a unique task code." };
  }

  revalidatePath("/sm"); revalidatePath("/sm/tasks"); revalidatePath("/cbo");

  await writeAudit({ actorId: session.user.id, action: "task.create", entity: "Task", entityId: created.id, after: created, note: `Created ${created.code}` });

  return { success: true, id: created.id };
}