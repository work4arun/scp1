"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function ensureAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) throw new Error("Forbidden");
}

export async function upsertSubVerticalAction(formData: FormData) {
  await ensureAdmin();
  const id = (formData.get("id") as string) || null;
  const verticalId = String(formData.get("verticalId") || "");
  const name = String(formData.get("name") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!verticalId || !name) return;

  if (id) {
    await prisma.subVertical.update({ where: { id }, data: { verticalId, name, sortOrder } });
  } else {
    await prisma.subVertical.create({ data: { verticalId, name, sortOrder } });
  }
  revalidatePath("/admin/sub-verticals");
}

export async function deleteSubVerticalAction(id: string) {
  await ensureAdmin();
  const count = await prisma.task.count({ where: { subVerticalId: id } });
  if (count > 0) throw new Error("Sub-vertical has tasks; cannot delete.");
  await prisma.subVertical.delete({ where: { id } });
  revalidatePath("/admin/sub-verticals");
}
