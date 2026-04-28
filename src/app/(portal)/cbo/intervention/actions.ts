"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCBO } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function resolveInterventionAction(id: string, note: string) {
  const session = await auth();
  if (!isCBO(session?.user.systemRole)) throw new Error("Forbidden");

  await prisma.intervention.update({
    where: { id },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolutionNote: note?.trim() || null,
    },
  });

  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");
  revalidatePath("/cbo/daily");
}
