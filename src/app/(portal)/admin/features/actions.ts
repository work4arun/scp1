"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { FLAG_REGISTRY, type FlagKey, getFlagDefinition } from "@/lib/features";

async function ensureAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) {
    throw new Error("Forbidden");
  }
  return session.user.id;
}

/**
 * Idempotently bootstraps every flag from FLAG_REGISTRY into the database.
 * Called from the page on first visit so an operator never has to remember
 * to run a seed script.
 */
export async function ensureFlagsSeeded() {
  await ensureAdmin();
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
  revalidatePath("/admin/features");
}

export async function toggleFeatureAction(key: string, enabled: boolean) {
  const adminId = await ensureAdmin();

  // Make sure the key is one we know about.
  const def = getFlagDefinition(key as FlagKey);
  if (!def) throw new Error(`Unknown feature flag: ${key}`);

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

  revalidatePath("/admin/features");
  // The whole app may render differently — bust the layout cache.
  revalidatePath("/", "layout");
}
