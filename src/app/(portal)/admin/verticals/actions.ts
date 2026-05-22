"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
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

export type VerticalResult = { success: true } | { success: false; error: string };

export async function upsertVerticalAction(formData: FormData): Promise<VerticalResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };
  const adminId = authed.userId;

  const id = (formData.get("id") as string) || null;
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const description = (formData.get("description") as string) || null;
  const colorHex = (formData.get("colorHex") as string) || "#4f46e5";
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!code || !name) return { success: false, error: "Code and name are required." };

  try {
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
  } catch (err) {
    console.error("[upsertVerticalAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not save the vertical. Please try again." };
  }

  revalidatePath("/admin/verticals");
  revalidatePath("/admin");
  revalidatePath("/cbo/verticals");
  return { success: true };
}

export async function deleteVerticalAction(id: string): Promise<VerticalResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  const count = await prisma.task.count({ where: { verticalId: id } });
  if (count > 0) {
    return { success: false, error: `This vertical has ${count} task(s). Reassign or delete them before removing the vertical.` };
  }

  try {
    const v = await prisma.vertical.findUnique({ where: { id }, select: { name: true, code: true } });
    await prisma.vertical.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: authed.userId, action: "vertical.delete", entity: "Vertical", entityId: id, note: v ? `${v.code} — ${v.name}` : null } });
  } catch (err) {
    console.error("[deleteVerticalAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not delete the vertical. Please try again." };
  }

  revalidatePath("/admin/verticals");
  return { success: true };
}

export async function toggleVerticalActiveAction(id: string): Promise<VerticalResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  try {
    const v = await prisma.vertical.findUnique({ where: { id }, select: { active: true } });
    if (!v) return { success: false, error: "Vertical not found." };
    await prisma.vertical.update({ where: { id }, data: { active: !v.active } });
  } catch (err) {
    console.error("[toggleVerticalActiveAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not update the vertical. Please try again." };
  }

  revalidatePath("/admin/verticals");
  return { success: true };
}
