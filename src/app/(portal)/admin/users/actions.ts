"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { friendlyPrismaError } from "@/lib/prisma-errors";
import type { SystemRole } from "@prisma/client";

const FORBIDDEN_MSG = "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

async function ensureAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) return { ok: false, error: FORBIDDEN_MSG };
  return { ok: true, userId: session.user.id };
}

export type UserResult = { success: true } | { success: false; error: string };

export async function upsertUserAction(formData: FormData): Promise<UserResult> {
  const authed = await ensureAdmin(); if (!authed.ok) return { success: false, error: authed.error };
  const id = (formData.get("id") as string) || null;
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const systemRole = (formData.get("systemRole") as SystemRole) || "SM";
  const password = (formData.get("password") as string) || null;

  if (!name || !email) return { success: false, error: "Name and email are required." };
  if (!id && !password) return { success: false, error: "Password is required for new users." };

  try {
    if (id) {
      const data: { name: string; email: string; systemRole: SystemRole; passwordHash?: string } = { name, email, systemRole };
      if (password) data.passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({ where: { id }, data });
    } else {
      await prisma.user.create({
        data: { name, email, systemRole, passwordHash: await bcrypt.hash(password!, 10) },
      });
    }
  } catch (err) { console.error("[upsertUserAction] DB error", err); return { success: false, error: friendlyPrismaError(err) ?? "Could not save user." }; }
  revalidatePath("/admin/users"); return { success: true };
}

export async function deleteUserAction(id: string): Promise<UserResult> {
  const authed = await ensureAdmin(); if (!authed.ok) return { success: false, error: authed.error };
  try { await prisma.user.delete({ where: { id } }); } catch (err) { console.error("[deleteUserAction] DB error", err); return { success: false, error: friendlyPrismaError(err) ?? "Could not delete user." }; }
  revalidatePath("/admin/users"); return { success: true };
}

export async function toggleUserActiveAction(id: string): Promise<UserResult> {
  const authed = await ensureAdmin(); if (!authed.ok) return { success: false, error: authed.error };
  try { const u = await prisma.user.findUnique({ where: { id }, select: { active: true } }); if (!u) return { success: false, error: "User not found." }; await prisma.user.update({ where: { id }, data: { active: !u.active } }); } catch (err) { console.error("[toggleUserActiveAction] DB error", err); return { success: false, error: friendlyPrismaError(err) ?? "Could not update user." }; }
  revalidatePath("/admin/users"); return { success: true };
}