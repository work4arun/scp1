"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function ensureAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");
  return session.user.id;
}

export async function upsertVerticalAction(formData: FormData) {
  const adminId = await ensureAdmin();

  const id = (formData.get("id") as string) || null;
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const description = (formData.get("description") as string) || null;
  const colorHex = (formData.get("colorHex") as string) || "#4f46e5";
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!code || !name) return;

  if (id) {
    await prisma.vertical.update({
      where: { id },
      data: { code, name, description, colorHex, sortOrder },
    });
    await prisma.auditLog.create({ data: { userId: adminId, action: "vertical.update", entity: "Vertical", entityId: id, note: name } });
  } else {
    const v = await prisma.vertical.create({
      data: { code, name, description, colorHex, sortOrder },
    });
    await prisma.auditLog.create({ data: { userId: adminId, action: "vertical.create", entity: "Vertical", entityId: v.id, note: `${code} — ${name}` } });
  }

  revalidatePath("/admin/verticals");
  revalidatePath("/admin");
  revalidatePath("/cbo/verticals");
}

export async function deleteVerticalAction(id: string) {
  const adminId = await ensureAdmin();
  const count = await prisma.task.count({ where: { verticalId: id } });
  if (count > 0) throw new Error("Vertical has tasks; cannot delete.");
  const v = await prisma.vertical.findUnique({ where: { id }, select: { name: true, code: true } });
  await prisma.vertical.delete({ where: { id } });
  await prisma.auditLog.create({ data: { userId: adminId, action: "vertical.delete", entity: "Vertical", entityId: id, note: v ? `${v.code} — ${v.name}` : null } });
  revalidatePath("/admin/verticals");
}

export async function toggleVerticalActiveAction(id: string) {
  await ensureAdmin();
  const v = await prisma.vertical.findUnique({ where: { id }, select: { active: true } });
  if (!v) return;
  await prisma.vertical.update({ where: { id }, data: { active: !v.active } });
  revalidatePath("/admin/verticals");
}
