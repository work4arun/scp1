"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

async function ensureAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");
  return session.user.id;
}

// ────────── Reset password to a chosen value ──────────
export async function resetUserPasswordAction(userId: string, newPassword: string) {
  const adminId = await ensureAdmin();
  if (!newPassword || newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.auditLog.create({
    data: { userId: adminId, action: "user.password_reset", entity: "User", entityId: userId, note: "Password reset by admin" },
  });
  revalidatePath("/admin/users");
}

// ────────── Generate temporary password (one-time, returned to admin) ──────────
export async function generateTempPasswordAction(userId: string): Promise<string> {
  const adminId = await ensureAdmin();
  const temp = randomBytes(6).toString("base64").replace(/[+/=]/g, "").slice(0, 10);
  const passwordHash = await bcrypt.hash(temp, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.auditLog.create({
    data: { userId: adminId, action: "user.temp_password", entity: "User", entityId: userId, note: "Temporary password generated" },
  });
  revalidatePath("/admin/users");
  return temp;
}

// ────────── Reorder verticals (move up/down) ──────────
export async function moveVerticalAction(verticalId: string, direction: "up" | "down") {
  await ensureAdmin();
  const list = await prisma.vertical.findMany({ orderBy: { sortOrder: "asc" } });
  const idx = list.findIndex((v) => v.id === verticalId);
  if (idx === -1) return;
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= list.length) return;
  const a = list[idx]; const b = list[swap];
  await prisma.$transaction([
    prisma.vertical.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.vertical.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
  revalidatePath("/admin/verticals");
  revalidatePath("/admin");
  revalidatePath("/cbo");
}

// ────────── Reorder priorities ──────────
export async function movePriorityAction(priorityId: string, direction: "up" | "down") {
  await ensureAdmin();
  const list = await prisma.priority.findMany({ orderBy: { rank: "asc" } });
  const idx = list.findIndex((p) => p.id === priorityId);
  if (idx === -1) return;
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= list.length) return;
  const a = list[idx]; const b = list[swap];
  await prisma.$transaction([
    prisma.priority.update({ where: { id: a.id }, data: { rank: b.rank } }),
    prisma.priority.update({ where: { id: b.id }, data: { rank: a.rank } }),
  ]);
  revalidatePath("/admin/priorities");
}
