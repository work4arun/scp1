"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { SystemRole } from "@prisma/client";
import { friendlyPrismaError } from "@/lib/prisma-errors";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

type Authed = { ok: true; userId: string } | { ok: false; error: string };

async function ensureAdmin(): Promise<Authed> {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) {
    return { ok: false, error: FORBIDDEN_MSG };
  }
  return { ok: true, userId: session.user.id };
}

export type UserActionResult = { success: true } | { success: false; error: string };

export async function upsertUserAction(formData: FormData): Promise<UserActionResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };
  const adminId = authed.userId;

  const id = (formData.get("id") as string) || null;
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const systemRole = (String(formData.get("systemRole") || "SM") as SystemRole);
  const ownerRoleId = (formData.get("ownerRoleId") as string) || null;

  if (!name || !email) return { success: false, error: "Name and email are required." };

  try {
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
      if (!password) return { success: false, error: "Password is required when creating a new user." };
      const passwordHash = await bcrypt.hash(password, 10);
      const created = await prisma.user.create({
        data: { name, email, passwordHash, systemRole, ownerRoleId },
      });
      await prisma.auditLog.create({ data: { userId: adminId, action: "user.create", entity: "User", entityId: created.id, note: `${name} (${systemRole})` } });
    }
  } catch (err) {
    console.error("[upsertUserAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not save the user. Please try again." };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUserAction(id: string): Promise<UserActionResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };
  if (authed.userId === id) return { success: false, error: "You cannot delete your own account." };

  try {
    const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
    await prisma.user.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: authed.userId, action: "user.delete", entity: "User", entityId: id, note: target?.email } });
  } catch (err) {
    console.error("[deleteUserAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not delete the user. Please try again." };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleUserActiveAction(id: string): Promise<UserActionResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  try {
    const u = await prisma.user.findUnique({ where: { id }, select: { active: true, email: true } });
    if (!u) return { success: false, error: "User not found." };
    await prisma.user.update({ where: { id }, data: { active: !u.active } });
    await prisma.auditLog.create({ data: { userId: authed.userId, action: u.active ? "user.disable" : "user.enable", entity: "User", entityId: id, note: u.email } });
  } catch (err) {
    console.error("[toggleUserActiveAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not update the user. Please try again." };
  }

  revalidatePath("/admin/users");
  return { success: true };
}
