"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageTasks } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { friendlyPrismaError } from "@/lib/prisma-errors";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

export type ParkingResult = { success: true } | { success: false; error: string };

export async function addParkingLotAction(formData: FormData): Promise<ParkingResult> {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: FORBIDDEN_MSG };
  }

  const idea = String(formData.get("idea") || "").trim();
  const suggestedBy = String(formData.get("suggestedBy") || "").trim();
  const verticalId = (formData.get("verticalId") as string) || null;
  const expectedImpact = (formData.get("expectedImpact") as string) || null;
  const urgency = (formData.get("urgency") as string) || null;
  const decision = (formData.get("decision") as string) || "Park";
  const reviewDateStr = (formData.get("reviewDate") as string) || "";
  const remarks = (formData.get("remarks") as string) || null;

  if (!idea) return { success: false, error: "Idea is required." };
  if (!suggestedBy) return { success: false, error: "Suggested by is required." };

  try {
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
  } catch (err) {
    console.error("[addParkingLotAction] DB error", err);
    return {
      success: false,
      error: friendlyPrismaError(err) ?? "Could not save the parking item. Please try again.",
    };
  }

  revalidatePath("/sm/parking");
  revalidatePath("/cbo/parking");
  return { success: true };
}
