"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
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

export type AdminResult = { success: true } | { success: false; error: string };
export type TempPasswordResult = { success: true; temp: string } | { success: false; error: string };

// ────────── Reset password to a chosen value ──────────
export async function resetUserPasswordAction(userId: string, newPassword: string): Promise<AdminResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await prisma.auditLog.create({
      data: { userId: authed.userId, action: "user.password_reset", entity: "User", entityId: userId, note: "Password reset by admin" },
    });
  } catch (err) {
    console.error("[resetUserPasswordAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not reset the password. Please try again." };
  }
  revalidatePath("/admin/users");
  return { success: true };
}

// ────────── Generate temporary password (one-time, returned to admin) ──────────
export async function generateTempPasswordAction(userId: string): Promise<TempPasswordResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };
  try {
    const temp = randomBytes(6).toString("base64").replace(/[+/=]/g, "").slice(0, 10);
    const passwordHash = await bcrypt.hash(temp, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await prisma.auditLog.create({
      data: { userId: authed.userId, action: "user.temp_password", entity: "User", entityId: userId, note: "Temporary password generated" },
    });
    revalidatePath("/admin/users");
    return { success: true, temp };
  } catch (err) {
    console.error("[generateTempPasswordAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not generate a temp password. Please try again." };
  }
}

// ────────── Reorder verticals (move up/down) ──────────
export async function moveVerticalAction(verticalId: string, direction: "up" | "down"): Promise<AdminResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };
  try {
    const list = await prisma.vertical.findMany({ orderBy: { sortOrder: "asc" } });
    const idx = list.findIndex((v) => v.id === verticalId);
    if (idx === -1) return { success: true }; // no-op
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return { success: true }; // already at boundary
    const a = list[idx]; const b = list[swap];
    await prisma.$transaction([
      prisma.vertical.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
      prisma.vertical.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
    ]);
  } catch (err) {
    console.error("[moveVerticalAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not reorder verticals. Please try again." };
  }
  revalidatePath("/admin/verticals");
  revalidatePath("/admin");
  revalidatePath("/cbo");
  return { success: true };
}

// ────────── Reorder priorities ──────────
export async function movePriorityAction(priorityId: string, direction: "up" | "down"): Promise<AdminResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };
  try {
    const list = await prisma.priority.findMany({ orderBy: { rank: "asc" } });
    const idx = list.findIndex((p) => p.id === priorityId);
    if (idx === -1) return { success: true }; // no-op
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return { success: true }; // already at boundary
    const a = list[idx]; const b = list[swap];
    await prisma.$transaction([
      prisma.priority.update({ where: { id: a.id }, data: { rank: b.rank } }),
      prisma.priority.update({ where: { id: b.id }, data: { rank: a.rank } }),
    ]);
  } catch (err) {
    console.error("[movePriorityAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not reorder priorities. Please try again." };
  }
  revalidatePath("/admin/priorities");
  return { success: true };
}
