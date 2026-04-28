"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { notifyAllCBO } from "@/lib/notify";
import type { TaskSource } from "@prisma/client";

export async function captureBossInstructionAction(formData: FormData) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");

  const instruction = String(formData.get("instruction") || "").trim();
  const source = ((formData.get("source") as string) || "BOSS_INSTRUCTION") as TaskSource;
  const verticalId = (formData.get("verticalId") as string) || null;
  const responseGiven = (formData.get("responseGiven") as string) || null;
  if (!instruction) return;

  await prisma.bossInstruction.create({
    data: {
      instruction,
      source,
      verticalId,
      responseGiven,
      capturedById: session.user.id,
    },
  });

  revalidatePath("/sm/boss");
  revalidatePath("/cbo/daily");

  await notifyAllCBO({
    kind: "boss.captured",
    title: "📥 Boss instruction captured",
    body: instruction.length > 120 ? instruction.slice(0, 120) + "…" : instruction,
    link: "/cbo/daily",
    senderId: session.user.id,
  });
}
