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

export type PriorityResult = { success: true } | { success: false; error: string };

export async function upsertPriorityAction(formData: FormData): Promise<PriorityResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  const id = (formData.get("id") as string) || null;
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const label = String(formData.get("label") || "").trim();
  const description = (formData.get("description") as string) || null;
  const reviewCadence = (formData.get("reviewCadence") as string) || null;
  const colorHex = (formData.get("colorHex") as string) || "#6b7280";
  const rank = Number(formData.get("rank") || 0);
  if (!code || !label) return { success: false, error: "Code and label are required." };

  try {
    if (id) {
      await prisma.priority.update({ where: { id }, data: { code, label, description, reviewCadence, colorHex, rank } });
    } else {
      await prisma.priority.create({ data: { code, label, description, reviewCadence, colorHex, rank } });
    }
  } catch (err) {
    console.error("[upsertPriorityAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not save the priority. Please try again." };
  }

  revalidatePath("/admin/priorities");
  return { success: true };
}

export async function deletePriorityAction(id: string): Promise<PriorityResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  const count = await prisma.task.count({ where: { priorityId: id } });
  if (count > 0) {
    return { success: false, error: `This priority is used by ${count} task(s). Remove or reassign those tasks before deleting.` };
  }

  try {
    await prisma.priority.delete({ where: { id } });
  } catch (err) {
    console.error("[deletePriorityAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not delete the priority. Please try again." };
  }

  revalidatePath("/admin/priorities");
  return { success: true };
}
