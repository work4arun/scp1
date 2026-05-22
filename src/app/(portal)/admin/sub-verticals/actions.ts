"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { friendlyPrismaError } from "@/lib/prisma-errors";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

async function ensureAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) return { ok: false, error: FORBIDDEN_MSG };
  return { ok: true };
}

export type SubVerticalResult = { success: true } | { success: false; error: string };

export async function upsertSubVerticalAction(formData: FormData): Promise<SubVerticalResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  const id = (formData.get("id") as string) || null;
  const verticalId = String(formData.get("verticalId") || "");
  const name = String(formData.get("name") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!verticalId || !name) return { success: false, error: "Vertical and name are required." };

  try {
    if (id) {
      await prisma.subVertical.update({ where: { id }, data: { verticalId, name, sortOrder } });
    } else {
      await prisma.subVertical.create({ data: { verticalId, name, sortOrder } });
    }
  } catch (err) {
    console.error("[upsertSubVerticalAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not save the sub-vertical. Please try again." };
  }

  revalidatePath("/admin/sub-verticals");
  return { success: true };
}

export async function deleteSubVerticalAction(id: string): Promise<SubVerticalResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  const count = await prisma.task.count({ where: { subVerticalId: id } });
  if (count > 0) {
    return { success: false, error: `This sub-vertical has ${count} task(s). Reassign or remove them before deleting.` };
  }

  try {
    await prisma.subVertical.delete({ where: { id } });
  } catch (err) {
    console.error("[deleteSubVerticalAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not delete the sub-vertical. Please try again." };
  }

  revalidatePath("/admin/sub-verticals");
  return { success: true };
}
