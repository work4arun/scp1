"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCBO } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { friendlyPrismaError } from "@/lib/prisma-errors";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

export type ResolveResult = { success: true } | { success: false; error: string };

export async function resolveInterventionAction(id: string, note: string): Promise<ResolveResult> {
  const session = await auth();
  if (!isCBO(session?.user.systemRole)) {
    return { success: false, error: FORBIDDEN_MSG };
  }

  try {
    await prisma.intervention.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolutionNote: note?.trim() || null,
      },
    });
  } catch (err) {
    console.error("[resolveInterventionAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not resolve the intervention. Please try again.",
    };
  }

  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");
  revalidatePath("/cbo/daily");
  return { success: true };
}
