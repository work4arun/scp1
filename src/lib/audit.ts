// ─────────────────────────────────────────────────────────────────────────────
//  Audit Log v2
// ─────────────────────────────────────────────────────────────────────────────
//  A thin wrapper around prisma.auditLog.create that:
//    • writes the new row only if the `audit_log_v2` flag is on (or always for
//      legacy admin-only events; pass `force: true` for those),
//    • captures before/after JSON snapshots,
//    • is fire-and-forget — never throws into the caller. A primary mutation
//      should never fail because audit logging failed.
//
//  Usage:
//    await writeAudit({
//      actorId,
//      action: "task.drop",
//      entity: "Task",
//      entityId: task.id,
//      before: previousTask,
//      after: nextTask,
//      note: reason,
//    });
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isEnabled } from "@/lib/features";
import { headers } from "next/headers";

export type AuditEvent = {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  note?: string | null;
  /** When true, write regardless of the `audit_log_v2` flag (legacy admin events). */
  force?: boolean;
};

function readHeader(name: string): string | null {
  try {
    return headers().get(name);
  } catch {
    return null;
  }
}

export async function writeAudit(event: AuditEvent): Promise<void> {
  try {
    const enriched = event.force || (await isEnabled("audit_log_v2"));
    const ip = readHeader("x-forwarded-for") || readHeader("x-real-ip");
    const userAgent = readHeader("user-agent");

    await prisma.auditLog.create({
      data: {
        userId: event.actorId,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId ?? null,
        note: event.note ?? null,
        // Only persist before/after snapshots when v2 is enabled.
        before: enriched ? toJson(event.before) : Prisma.DbNull,
        after: enriched ? toJson(event.after) : Prisma.DbNull,
        ip: enriched ? ip : null,
        userAgent: enriched ? userAgent : null,
      },
    });
  } catch (err) {
    // Never let audit failures propagate — they would otherwise abort the user's
    // primary action. Log and move on.
    // eslint-disable-next-line no-console
    console.error("[audit] failed to write event", { event, err });
  }
}

/**
 * Convert any value into a JSON-safe payload Prisma's Json column accepts.
 * Strips Dates (→ ISO), bigints (→ string), undefined fields, and password
 * hashes. Returns Prisma.DbNull when the input is null/undefined so the column
 * stores SQL NULL rather than the JSON null literal.
 */
function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === null || value === undefined) return Prisma.DbNull;
  // Round-trip through JSON.stringify with a replacer so non-serializable
  // bits (functions, undefined, symbols) are dropped predictably.
  const cleaned = JSON.parse(
    JSON.stringify(value, (key, v) => {
      if (key === "passwordHash" || key === "password") return undefined;
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "bigint") return v.toString();
      return v;
    }),
  );
  return cleaned as Prisma.InputJsonValue;
}
