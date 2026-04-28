"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCBO } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function ensureCbo() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");
  return session.user.id;
}

// ────────── Mark "seen" — powers the since-last-visit feed ──────────
export async function markSeenAction() {
  const userId = await ensureCbo();
  try {
    await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  } catch {
    // Column may not exist yet if `prisma db push` hasn't run. Ignore silently.
  }
}

// ────────── Resolve intervention with decision type + note ──────────
export async function resolveInterventionRichAction(id: string, decisionType: string, note: string) {
  await ensureCbo();
  await prisma.intervention.update({
    where: { id },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      decisionType,
      resolutionNote: note?.trim() || null,
      snoozedUntil: null,
    },
  });
  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");
  revalidatePath("/cbo/daily");
}

// ────────── Snooze intervention ──────────
export async function snoozeInterventionAction(id: string, hours: number) {
  await ensureCbo();
  const until = new Date(Date.now() + hours * 60 * 60 * 1000);
  await prisma.intervention.update({ where: { id }, data: { snoozedUntil: until } });
  revalidatePath("/cbo/intervention");
  revalidatePath("/cbo");
}

// ────────── Drop private note for SM (no escalation) ──────────
export async function setInterventionCboNoteAction(id: string, note: string) {
  await ensureCbo();
  await prisma.intervention.update({ where: { id }, data: { cboNote: note?.trim() || null } });
  revalidatePath("/cbo/intervention");
}

// ────────── Pin / unpin items ──────────
export async function togglePinAction(kind: "task" | "intervention" | "vertical", refId: string) {
  const userId = await ensureCbo();
  const existing = await prisma.pin.findUnique({
    where: { userId_kind_refId: { userId, kind, refId } },
  });
  if (existing) await prisma.pin.delete({ where: { id: existing.id } });
  else await prisma.pin.create({ data: { userId, kind, refId } });
  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");
}
