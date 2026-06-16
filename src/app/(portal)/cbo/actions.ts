"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCBO } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { friendlyPrismaError } from "@/lib/prisma-errors";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

type Authed = { ok: true; userId: string } | { ok: false; error: string };

async function ensureCbo(): Promise<Authed> {
  const session = await auth();
  if (!isCBO(session?.user.systemRole) || !session?.user.id) {
    return { ok: false, error: FORBIDDEN_MSG };
  }
  return { ok: true, userId: session.user.id };
}

export type SimpleResult = { success: true } | { success: false; error: string };

// ────────── Pin / unpin items ──────────
export async function togglePinAction(
  kind: "task" | "vertical",
  refId: string,
): Promise<SimpleResult> {
  const authed = await ensureCbo();
  if (!authed.ok) return { success: false, error: authed.error };
  const { userId } = authed;

  try {
    const existing = await prisma.pin.findUnique({
      where: { userId_kind_refId: { userId, kind, refId } },
    });
    if (existing) await prisma.pin.delete({ where: { id: existing.id } });
    else await prisma.pin.create({ data: { userId, kind, refId } });
  } catch (err) {
    console.error("[togglePinAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not update pin. Please try again.",
    };
  }

  revalidatePath("/cbo");
  return { success: true };
}