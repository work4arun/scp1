"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function ensureAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) throw new Error("Forbidden");
}

export async function upsertOwnerRoleAction(formData: FormData) {
  await ensureAdmin();
  const id = (formData.get("id") as string) || null;
  const name = String(formData.get("name") || "").trim();
  const description = (formData.get("description") as string) || null;
  if (!name) return;

  if (id) {
    await prisma.ownerRole.update({ where: { id }, data: { name, description } });
  } else {
    await prisma.ownerRole.create({ data: { name, description } });
  }
  revalidatePath("/admin/roles");
}

export async function deleteOwnerRoleAction(id: string) {
  await ensureAdmin();
  const [taskCount, userCount] = await Promise.all([
    prisma.task.count({ where: { ownerRoleId: id } }),
    prisma.user.count({ where: { ownerRoleId: id } }),
  ]);
  if (taskCount > 0 || userCount > 0) throw new Error("Role is in use; cannot delete.");
  await prisma.ownerRole.delete({ where: { id } });
  revalidatePath("/admin/roles");
}
