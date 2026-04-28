"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function ensureAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) throw new Error("Forbidden");
}

export async function upsertPriorityAction(formData: FormData) {
  await ensureAdmin();
  const id = (formData.get("id") as string) || null;
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const label = String(formData.get("label") || "").trim();
  const description = (formData.get("description") as string) || null;
  const reviewCadence = (formData.get("reviewCadence") as string) || null;
  const colorHex = (formData.get("colorHex") as string) || "#6b7280";
  const rank = Number(formData.get("rank") || 0);
  if (!code || !label) return;

  if (id) {
    await prisma.priority.update({ where: { id }, data: { code, label, description, reviewCadence, colorHex, rank } });
  } else {
    await prisma.priority.create({ data: { code, label, description, reviewCadence, colorHex, rank } });
  }
  revalidatePath("/admin/priorities");
}

export async function deletePriorityAction(id: string) {
  await ensureAdmin();
  const count = await prisma.task.count({ where: { priorityId: id } });
  if (count > 0) throw new Error("Priority is used by tasks; cannot delete.");
  await prisma.priority.delete({ where: { id } });
  revalidatePath("/admin/priorities");
}
