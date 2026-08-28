"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { isEnabled } from "@/lib/features";

type Result = { success: boolean; error?: string };

// Marks that this SM has completed a full database backup download today.
// Called by the SM backup progress tab when the file reaches 100% client-side.
// Only the completion (not a started/aborted download) records "downloaded today".
export async function markBackupComplete(): Promise<Result> {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: "Unauthorized" };
  }
  if (!(await isEnabled("backup_restore"))) {
    return { success: false, error: "Backup is disabled." };
  }
  try {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "system.backup_download_completed",
        entity: "Database",
        note: "SM completed a full backup download.",
      },
    });
    revalidatePath("/sm");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Could not record backup completion." };
  }
}