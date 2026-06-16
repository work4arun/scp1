"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { validateEmail } from "@/lib/validation";
import { friendlyPrismaError } from "@/lib/prisma-errors";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

async function ensureAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) {
    return { ok: false, error: FORBIDDEN_MSG };
  }
  return { ok: true, userId: session.user.id };
}

export type TeamResult = { success: true } | { success: false; error: string };

// ────────── Team CRUD ──────────
export async function upsertTeamAction(formData: FormData): Promise<TeamResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  const id = (formData.get("id") as string) || null;
  const name = String(formData.get("name") || "").trim();
  const description = (formData.get("description") as string) || null;

  if (!name) return { success: false, error: "Team name is required." };

  try {
    if (id) {
      await prisma.team.update({ where: { id }, data: { name, description } });
    } else {
      await prisma.team.create({ data: { name, description } });
    }
  } catch (err) {
    console.error("[upsertTeamAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not save the team. Please try again." };
  }

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function deleteTeamAction(id: string): Promise<TeamResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  try {
    await prisma.team.delete({ where: { id } });
  } catch (err) {
    console.error("[deleteTeamAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not delete the team. Please try again." };
  }

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function toggleTeamActiveAction(id: string): Promise<TeamResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  try {
    const t = await prisma.team.findUnique({ where: { id }, select: { active: true } });
    if (!t) return { success: false, error: "Team not found." };
    await prisma.team.update({ where: { id }, data: { active: !t.active } });
  } catch (err) {
    console.error("[toggleTeamActiveAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not update the team. Please try again." };
  }

  revalidatePath("/admin/teams");
  return { success: true };
}

// ────────── Member CRUD ──────────
export type MemberResult = { success: true } | { success: false; error: string };

export async function addMemberAction(formData: FormData): Promise<MemberResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  const teamId = String(formData.get("teamId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const designation = (formData.get("designation") as string) || null;

  if (!teamId) return { success: false, error: "Team is required." };
  if (!name) return { success: false, error: "Member name is required." };
  const emailErr = validateEmail(email);
  if (emailErr) return { success: false, error: emailErr };

  try {
    await prisma.teamMember.create({ data: { teamId, name, email, designation } });
  } catch (err) {
    console.error("[addMemberAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not add the member. Email may be duplicated." };
  }

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function updateMemberAction(formData: FormData): Promise<MemberResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const designation = (formData.get("designation") as string) || null;

  if (!id) return { success: false, error: "Member ID is required." };
  if (!name) return { success: false, error: "Member name is required." };
  const emailErr = validateEmail(email);
  if (emailErr) return { success: false, error: emailErr };

  try {
    await prisma.teamMember.update({ where: { id }, data: { name, email, designation } });
  } catch (err) {
    console.error("[updateMemberAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not update the member. Email may be duplicated." };
  }

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function removeMemberAction(id: string): Promise<MemberResult> {
  const authed = await ensureAdmin();
  if (!authed.ok) return { success: false, error: authed.error };

  try {
    await prisma.teamMember.delete({ where: { id } });
  } catch (err) {
    console.error("[removeMemberAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not remove the member. Please try again." };
  }

  revalidatePath("/admin/teams");
  return { success: true };
}