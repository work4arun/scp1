// ─────────────────────────────────────────────────────────────────────────────
//  SLA Engine
// ─────────────────────────────────────────────────────────────────────────────
//  When the `sla_engine` flag is on, every task gets a computed slaDueAt based
//  on priority code at creation time, and slaBreachedAt is back-filled when a
//  scheduled job (or any read of `getSlaSummary`) detects the breach.
//
//  Defaults (overridable later via priority.reviewCadence parsing):
//     P1 → 24h        P2 → 72h        P3 → 7 days        P4 → 14 days
//  Anything else falls back to 14 days.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { isEnabled } from "@/lib/features";
import type { Task } from "@prisma/client";

const HOURS = 1000 * 60 * 60;
const DAYS = 24 * HOURS;

export const SLA_BY_PRIORITY_CODE: Record<string, number> = {
  P1: 24 * HOURS,
  P2: 72 * HOURS,
  P3: 7 * DAYS,
  P4: 14 * DAYS,
};

export function slaWindowFor(priorityCode: string): number {
  return SLA_BY_PRIORITY_CODE[priorityCode] ?? 14 * DAYS;
}

/**
 * Compute the slaDueAt for a newly-created task. Returns null when the SLA
 * engine is disabled so the field is left unset.
 */
export async function computeSlaDueAt(priorityCode: string, base: Date = new Date()): Promise<Date | null> {
  if (!(await isEnabled("sla_engine"))) return null;
  return new Date(base.getTime() + slaWindowFor(priorityCode));
}

/**
 * Lightweight breach detection. Marks slaBreachedAt for any active task whose
 * slaDueAt is in the past. Safe to call from any page — it only writes if a
 * row needs updating, and runs nothing when the feature is off.
 */
export async function sweepSlaBreaches(): Promise<number> {
  if (!(await isEnabled("sla_engine"))) return 0;
  const now = new Date();
  const breachable = await prisma.task.findMany({
    where: {
      status: { notIn: ["COMPLETED", "DROPPED"] },
      slaDueAt: { lt: now },
      slaBreachedAt: null,
    },
    select: { id: true },
    take: 500,
  });
  if (breachable.length === 0) return 0;
  await prisma.task.updateMany({
    where: { id: { in: breachable.map((t) => t.id) } },
    data: { slaBreachedAt: now },
  });
  return breachable.length;
}

export function isBreached(task: Pick<Task, "slaDueAt" | "slaBreachedAt" | "status">): boolean {
  if (task.status === "COMPLETED" || task.status === "DROPPED") return false;
  if (task.slaBreachedAt) return true;
  if (task.slaDueAt && task.slaDueAt.getTime() < Date.now()) return true;
  return false;
}
