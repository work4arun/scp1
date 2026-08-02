"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { saveDashboardUrl } from "@/lib/app-config";

export async function saveConfigAction(formData: FormData) {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) {
    return { success: false, error: "Unauthorized" };
  }

  const dashboardUrl = String(formData.get("dashboardUrl") || "").trim();
  if (!dashboardUrl) {
    return { success: false, error: "Dashboard URL is required." };
  }

  try {
    await saveDashboardUrl(dashboardUrl, session.user.id);
  } catch {
    return { success: false, error: "Failed to save configuration." };
  }

  revalidatePath("/admin/config");
  return { success: true };
}
