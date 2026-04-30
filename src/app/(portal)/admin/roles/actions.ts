"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";

async function ensureAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) throw new Error("Forbidden");
  return session.user.id;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Owner Role CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertOwnerRoleAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensureAdmin();
    const id = (formData.get("id") as string) || null;
    const name = String(formData.get("name") || "").trim();
    const description = (formData.get("description") as string) || null;
    if (!name) return { ok: false, error: "Role name is required." };

    if (id) {
      await prisma.ownerRole.update({ where: { id }, data: { name, description } });
    } else {
      await prisma.ownerRole.create({ data: { name, description } });
    }
    revalidatePath("/admin/roles");
    return { ok: true };
  } catch (err: any) {
    if (err.code === "P2002") {
      return { ok: false, error: "A role with this name already exists." };
    }
    return { ok: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function deleteOwnerRoleAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensureAdmin();
    const [taskCount, userCount] = await Promise.all([
      prisma.task.count({ where: { ownerRoleId: id } }),
      prisma.user.count({ where: { ownerRoleId: id } }),
    ]);
    if (taskCount > 0 || userCount > 0) return { ok: false, error: "Role is in use; cannot delete." };
    await prisma.ownerRole.delete({ where: { id } });
    revalidatePath("/admin/roles");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "An unexpected error occurred." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Owner Contact (NOT a login account)
// ─────────────────────────────────────────────────────────────────────────────
//  Records the name + email of the person currently holding a role. This is a
//  pure contact record stored on OwnerRole.ownerName / ownerEmail. No User
//  account is created. The email is used as a recipient for task notifications
//  routed to that role.
//
//  The website is operated only via the three system roles — SM, CBO, and
//  Super Admin — which are managed at /admin/users.
// ─────────────────────────────────────────────────────────────────────────────

export type SetOwnerContactResult =
  | { ok: true; ownerName: string | null; ownerEmail: string | null }
  | { ok: false; error: string };

export async function setRoleOwnerContactAction(
  roleId: string,
  formData: FormData,
): Promise<SetOwnerContactResult> {
  const adminId = await ensureAdmin();

  const role = await prisma.ownerRole.findUnique({ where: { id: roleId } });
  if (!role) return { ok: false, error: "Role not found." };

  const name = String(formData.get("ownerName") || "").trim();
  const emailRaw = String(formData.get("ownerEmail") || "").trim().toLowerCase();

  if (!name && !emailRaw) {
    return { ok: false, error: "Enter a name and/or email, or use Remove to clear the contact." };
  }
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return { ok: false, error: "Email is not in a valid format." };
  }

  const updated = await prisma.ownerRole.update({
    where: { id: roleId },
    data: {
      ownerName: name || null,
      ownerEmail: emailRaw || null,
    },
    select: { ownerName: true, ownerEmail: true },
  });

  await writeAudit({
    actorId: adminId,
    action: "role.contact_set",
    entity: "OwnerRole",
    entityId: roleId,
    before: { ownerName: role.ownerName, ownerEmail: role.ownerEmail },
    after: updated,
    note: `Set owner contact for ${role.name}: ${updated.ownerName || "—"}${updated.ownerEmail ? ` <${updated.ownerEmail}>` : ""}`,
  });

  revalidatePath("/admin/roles");
  return { ok: true, ownerName: updated.ownerName, ownerEmail: updated.ownerEmail };
}

export async function clearRoleOwnerContactAction(roleId: string) {
  const adminId = await ensureAdmin();
  const role = await prisma.ownerRole.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found");

  await prisma.ownerRole.update({
    where: { id: roleId },
    data: { ownerName: null, ownerEmail: null },
  });

  await writeAudit({
    actorId: adminId,
    action: "role.contact_cleared",
    entity: "OwnerRole",
    entityId: roleId,
    before: { ownerName: role.ownerName, ownerEmail: role.ownerEmail },
    note: `Cleared owner contact for ${role.name}`,
  });

  revalidatePath("/admin/roles");
}
