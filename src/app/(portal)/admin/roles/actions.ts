"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";

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

// ─────────────────────────────────────────────────────────────────────────────
//  Owner Role CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertOwnerRoleAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const authed = await ensureAdmin();
    if (!authed.ok) return { ok: false, error: authed.error };
    const id = (formData.get("id") as string) || null;
    const name = String(formData.get("name") || "").trim();
    const description = (formData.get("description") as string) || null;
    if (!name) return { ok: false, error: "Role name is required." };

    if (id) {
      // On rename, check the new name isn't taken by a *different* role.
      const conflict = await prisma.ownerRole.findFirst({
        where: { name, NOT: { id } },
        select: { id: true },
      });
      if (conflict) return { ok: false, error: "A role with this name already exists." };
      await prisma.ownerRole.update({ where: { id }, data: { name, description } });
    } else {
      // Pre-check avoids a P2002 unique-constraint error reaching Prisma's own
      // error logger (which logs before the application catch block runs).
      const existing = await prisma.ownerRole.findUnique({
        where: { name },
        select: { id: true },
      });
      if (existing) return { ok: false, error: "A role with this name already exists." };
      await prisma.ownerRole.create({ data: { name, description } });
    }
    revalidatePath("/admin/roles");
    return { ok: true };
  } catch (err: unknown) {
    // Always log the full error server-side so deployment issues (e.g. a
    // missing column from a forgotten `prisma db push`) are visible in the
    // container logs. The user-facing message stays short.
    console.error("[upsertOwnerRoleAction] failed:", err);

    const e = err as { code?: string; message?: string };
    if (e?.code === "P2002") return { ok: false, error: "A role with this name already exists." };
    if (e?.code === "P2021") {
      return {
        ok: false,
        error:
          "Database schema is out of date. An admin needs to run `prisma db push` against the live database.",
      };
    }
    if (e?.code === "P2022" || /column .* does not exist/i.test(e?.message || "")) {
      return {
        ok: false,
        error:
          "The OwnerRole table is missing newly-added columns. Run `npx prisma db push` inside the running container, then try again.",
      };
    }
    return { ok: false, error: e?.message || "An unexpected error occurred." };
  }
}

export async function deleteOwnerRoleAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const authed = await ensureAdmin();
    if (!authed.ok) return { ok: false, error: authed.error };
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
  const authed = await ensureAdmin();
  if (!authed.ok) return { ok: false, error: authed.error };
  const adminId = authed.userId;

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

export type ClearContactResult = { ok: true } | { ok: false; error: string };

export async function clearRoleOwnerContactAction(roleId: string): Promise<ClearContactResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { ok: false, error: authed.error };
  const adminId = authed.userId;

  const role = await prisma.ownerRole.findUnique({ where: { id: roleId } });
  if (!role) return { ok: false, error: "Role not found — it may have been deleted. Please refresh." };

  try {
    await prisma.ownerRole.update({
      where: { id: roleId },
      data: { ownerName: null, ownerEmail: null },
    });

    // writeAudit swallows its own errors.
    await writeAudit({
      actorId: adminId,
      action: "role.contact_cleared",
      entity: "OwnerRole",
      entityId: roleId,
      before: { ownerName: role.ownerName, ownerEmail: role.ownerEmail },
      note: `Cleared owner contact for ${role.name}`,
    });
  } catch (err) {
    console.error("[clearRoleOwnerContactAction] DB error", err);
    const e = err as { code?: string; message?: string };
    return { ok: false, error: e?.message || "Could not clear the contact. Please try again." };
  }

  revalidatePath("/admin/roles");
  return { ok: true };
}
