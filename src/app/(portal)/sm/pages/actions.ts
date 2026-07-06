"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";

export async function deletePageAction(pageId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !canManageTasks(session.user.systemRole)) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    await prisma.staticPage.delete({ where: { id: pageId } });
    revalidatePath("/sm/pages");
    revalidatePath("/cbo/pages");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Delete failed" };
  }
}