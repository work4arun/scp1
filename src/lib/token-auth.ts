/**
 * Token-based passwordless authentication for external task access.
 * Generates and validates access tokens tied to team members.
 */
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface TokenUser {
  memberId: string;
  memberName: string;
  memberEmail: string;
  teamId: string;
  teamName: string;
  token: string;
}

/** Generate a secure random token and store it in DB */
export async function createAccessToken(memberId: string, taskId?: string, expiresInDays = 30): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  await prisma.externalAccessToken.create({
    data: { token, memberId, taskId, expiresAt },
  });

  return token;
}

/** Validate a token and return the associated member info */
export async function validateToken(token: string): Promise<TokenUser | null> {
  const record = await prisma.externalAccessToken.findUnique({
    where: { token },
    include: {
      member: { include: { team: { select: { id: true, name: true } } } },
    },
  });

  if (!record) return null;

  // Check expiry
  if (record.expiresAt && record.expiresAt < new Date()) {
    await prisma.externalAccessToken.delete({ where: { id: record.id } });
    return null;
  }

  // Check member still active
  if (!record.member.active) return null;

  // Update last used
  await prisma.externalAccessToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    memberId: record.member.id,
    memberName: record.member.name,
    memberEmail: record.member.email,
    teamId: record.member.team.id,
    teamName: record.member.team.name,
    token: record.token,
  };
}

/** Get or create a token for a member (reuse existing valid token if available) */
export async function getOrCreateToken(memberId: string, taskId?: string): Promise<string> {
  // Look for existing valid token
  const existing = await prisma.externalAccessToken.findFirst({
    where: {
      memberId,
      ...(taskId ? { taskId } : {}),
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await prisma.externalAccessToken.update({
      where: { id: existing.id },
      data: { lastUsedAt: new Date() },
    });
    return existing.token;
  }

  return createAccessToken(memberId, taskId);
}