"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { SystemRole } from "@prisma/client";

async function ensureAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");
  return session.user.id;
}

export async function upsertUserAction(formData: FormData) {
  const adminId = await ensureAdmin();
  const id = (formData.get("id") as string) || null;
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const systemRole = (String(formData.get("systemRole") || "SM") as SystemRole);
  const ownerRoleId = (formData.get("ownerRoleId") as string) || null;

  if (!name || !email) return;

  if (id) {
    const data: {
      name: string;
      email: string;
      systemRole: SystemRole;
      ownerRoleId: string | null;
      passwordHash?: string;
    } = { name, email, systemRole, ownerRoleId };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id }, data });
    await prisma.auditLog.create({ data: { userId: adminId, action: "user.update", entity: "User", entityId: id, note: email } });
  } else {
    if (!password) throw new Error("Password required for new user.");
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: { name, email, passwordHash, systemRole, ownerRoleId },
    });
    await prisma.auditLog.create({ data: { userId: adminId, action: "user.create", entity: "User", entityId: created.id, note: `${name} (${systemRole})` } });
  }
  revalidatePath("/admin/users");
}

export async function deleteUserAction(id: string) {
  const adminId = await ensureAdmin();
  if (adminId === id) throw new Error("You cannot delete yourself.");
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  await prisma.user.delete({ where: { id } });
  await prisma.auditLog.create({ data: { userId: adminId, action: "user.delete", entity: "User", entityId: id, note: target?.email } });
  revalidatePath("/admin/users");
}

export async function toggleUserActiveAction(id: string) {
  const adminId = await ensureAdmin();
  const u = await prisma.user.findUnique({ where: { id }, select: { active: true, email: true } });
  if (!u) return;
  await prisma.user.update({ where: { id }, data: { active: !u.active } });
  await prisma.auditLog.create({ data: { userId: adminId, action: u.active ? "user.disable" : "user.enable", entity: "User", entityId: id, note: u.email } });
  revalidatePath("/admin/users");
}
