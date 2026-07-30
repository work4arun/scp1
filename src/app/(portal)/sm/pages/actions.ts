"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { friendlyPrismaError } from "@/lib/prisma-errors";

type Result = { success: boolean; error?: string };

async function requireSm(): Promise<{ ok: true; userId: string; userName: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id || !canManageTasks(session.user.systemRole)) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true, userId: session.user.id, userName: session.user.name || session.user.id };
}

function revalidatePages() {
  revalidatePath("/sm/pages");
  revalidatePath("/cbo/pages");
}

export async function deletePageAction(pageId: string): Promise<Result> {
  const authed = await requireSm();
  if (!authed.ok) return { success: false, error: authed.error };
  try {
    await prisma.staticPage.delete({ where: { id: pageId } });
    revalidatePages();
    return { success: true };
  } catch (err) {
    return { success: false, error: friendlyPrismaError(err) ?? "Delete failed" };
  }
}

export async function createFolderAction(name: string, parentId: string | null): Promise<Result & { id?: string }> {
  const authed = await requireSm();
  if (!authed.ok) return { success: false, error: authed.error };
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Folder name is required." };
  if (trimmed.length > 120) return { success: false, error: "Folder name is too long." };
  try {
    // Reject a parent that doesn't exist, rather than silently creating a root folder.
    if (parentId) {
      const parent = await prisma.staticFolder.findUnique({ where: { id: parentId }, select: { id: true } });
      if (!parent) return { success: false, error: "The parent folder no longer exists. Please refresh." };
    }
    const folder = await prisma.staticFolder.create({
      data: { name: trimmed, parentId: parentId ?? null, createdBy: authed.userName },
    });
    revalidatePages();
    return { success: true, id: folder.id };
  } catch (err) {
    return { success: false, error: friendlyPrismaError(err) ?? "Could not create the folder." };
  }
}

export async function renameFolderAction(folderId: string, name: string): Promise<Result> {
  const authed = await requireSm();
  if (!authed.ok) return { success: false, error: authed.error };
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Folder name is required." };
  if (trimmed.length > 120) return { success: false, error: "Folder name is too long." };
  try {
    await prisma.staticFolder.update({ where: { id: folderId }, data: { name: trimmed } });
    revalidatePages();
    return { success: true };
  } catch (err) {
    return { success: false, error: friendlyPrismaError(err) ?? "Could not rename the folder." };
  }
}

export async function deleteFolderAction(folderId: string): Promise<Result> {
  const authed = await requireSm();
  if (!authed.ok) return { success: false, error: authed.error };
  try {
    // Subfolders and contained pages cascade via the schema relations.
    await prisma.staticFolder.delete({ where: { id: folderId } });
    revalidatePages();
    return { success: true };
  } catch (err) {
    return { success: false, error: friendlyPrismaError(err) ?? "Could not delete the folder." };
  }
}