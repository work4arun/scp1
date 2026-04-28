"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function addParkingLotAction(formData: FormData) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");

  const idea = String(formData.get("idea") || "").trim();
  const suggestedBy = String(formData.get("suggestedBy") || "").trim();
  const verticalId = (formData.get("verticalId") as string) || null;
  const expectedImpact = (formData.get("expectedImpact") as string) || null;
  const urgency = (formData.get("urgency") as string) || null;
  const decision = (formData.get("decision") as string) || "Park";
  const reviewDateStr = (formData.get("reviewDate") as string) || "";
  const remarks = (formData.get("remarks") as string) || null;

  if (!idea || !suggestedBy) return;

  await prisma.parkingLot.create({
    data: {
      idea,
      suggestedBy,
      verticalId,
      expectedImpact,
      urgency,
      decision,
      reviewDate: reviewDateStr ? new Date(reviewDateStr) : null,
      remarks,
      capturedById: session.user.id,
    },
  });

  revalidatePath("/sm/parking");
  revalidatePath("/cbo/parking");
}
