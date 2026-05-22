"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { FLAG_REGISTRY, type FlagKey, getFlagDefinition } from "@/lib/features";
import { friendlyPrismaError } from "@/lib/prisma-errors";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

type Authed = { ok: true; userId: string } | { ok: false; error: string };

async function ensureAdmin(): Promise<Authed> {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) {
    return { ok: false, error: FORBIDDEN_MSG };
  }
  return { ok: true, userId: session.user.id };
}

export type FeatureResult = { success: true } | { success: false; error: string };

/**
 * Idempotently bootstraps every flag from FLAG_REGISTRY into the database.
 * Called from the page on first visit so an operator never has to remember
 * to run a seed script.
 */
export async function ensureFlagsSeeded(): Promise<FeatureResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  try {
    for (const def of FLAG_REGISTRY) {
      await prisma.featureFlag.upsert({
        where: { key: def.key },
        update: { label: def.label, description: def.description, category: def.category },
        create: {
          key: def.key,
          label: def.label,
          description: def.description,
          category: def.category,
          enabled: def.defaultEnabled ?? false,
        },
      });
    }
  } catch (err) {
    console.error("[ensureFlagsSeeded] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not seed feature flags. Please try again." };
  }

  revalidatePath("/admin/features");
  return { success: true };
}

export async function toggleFeatureAction(key: string, enabled: boolean): Promise<FeatureResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };
  const { userId: adminId } = authed;

  // Make sure the key is one we know about.
  const def = getFlagDefinition(key as FlagKey);
  if (!def) return { success: false, error: `Unknown feature flag: "${key}". It may have been removed from the registry.` };

  try {
    const before = await prisma.featureFlag.findUnique({ where: { key } });
    const after = await prisma.featureFlag.upsert({
      where: { key },
      update: { enabled, updatedById: adminId },
      create: {
        key,
        enabled,
        label: def.label,
        description: def.description,
        category: def.category,
        updatedById: adminId,
      },
    });

    // writeAudit swallows its own errors — no try/catch needed.
    // The audit_log_v2 flag itself is a special case — its toggle is always
    // recorded (force: true) because that's the most security-relevant change.
    await writeAudit({
      actorId: adminId,
      action: enabled ? "feature.enable" : "feature.disable",
      entity: "FeatureFlag",
      entityId: key,
      before: before ?? undefined,
      after,
      note: def.label,
      force: true,
    });
  } catch (err) {
    console.error("[toggleFeatureAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not toggle the feature flag. Please try again." };
  }

  revalidatePath("/admin/features");
  // The whole app may render differently — bust the layout cache.
  revalidatePath("/", "layout");
  return { success: true };
}
