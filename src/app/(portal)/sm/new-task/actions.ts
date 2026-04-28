"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { notifyAllCBO } from "@/lib/notify";
import type { TaskSource, InterventionFlag } from "@prisma/client";

export async function createTaskAction(formData: FormData): Promise<string | null> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");

  const verticalId = String(formData.get("verticalId") || "");
  const subVerticalId = (formData.get("subVerticalId") as string) || null;
  const priorityId = String(formData.get("priorityId") || "");
  const ownerRoleId = (formData.get("ownerRoleId") as string) || null;
  const title = String(formData.get("title") || "").trim();
  const deadlineStr = (formData.get("deadline") as string) || "";
  const frequency = (formData.get("frequency") as string) || null;
  const source = ((formData.get("source") as string) || "SELF_STRATEGY") as TaskSource;
  const expectedOutput = (formData.get("expectedOutput") as string) || null;
  const supportNeeded = (formData.get("supportNeeded") as string) || null;
  const nextAction = (formData.get("nextAction") as string) || null;
  const intervention = ((formData.get("intervention") as string) || "NO") as InterventionFlag;

  if (!verticalId || !priorityId || !title) return null;

  // Generate code: VERTICAL_CODE-NNN
  const vertical = await prisma.vertical.findUnique({ where: { id: verticalId } });
  if (!vertical) return null;
  const count = await prisma.task.count({ where: { verticalId } });
  const code = `${vertical.code}-${String(count + 1).padStart(3, "0")}`;

  const created = await prisma.task.create({
    data: {
      code,
      title,
      verticalId,
      subVerticalId: subVerticalId || null,
      priorityId,
      ownerRoleId: ownerRoleId || null,
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

  return created.id;
}
