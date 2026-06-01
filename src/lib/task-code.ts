// ─────────────────────────────────────────────────────────────────────────────
//  Task code generation
// ─────────────────────────────────────────────────────────────────────────────
//  Generates the per-vertical sequential task code, e.g. "MKT-007".
//
//  HISTORY — why this file exists and why it does NOT use a SQL regex:
//
//  A previous implementation computed the next number with a raw SQL query:
//
//      SELECT COALESCE(MAX(CAST(SUBSTRING("code" FROM '\d+$') AS INTEGER)),0)+1
//
//  inside a Prisma `$queryRaw` tagged template. JavaScript template literals
//  silently "cook" the escape sequence `\d` down to a plain `d` BEFORE Prisma
//  ever sees the string — so Postgres actually received `SUBSTRING(... FROM
//  'd+$')`. That POSIX pattern matches a literal letter "d" at the end of the
//  string; task codes end in digits, never "d", so the match was always NULL,
//  MAX() was always NULL, and the "next number" was always 1.
//
//  Result: the first task in a vertical got "<CODE>-001" and succeeded; every
//  task after that regenerated "<CODE>-001", collided with the existing row
//  (P2002), retried with the identical value, and failed with
//  "Could not generate a unique task code after several attempts."
//
//  The fix: do NOT parse codes with a SQL regex. Fetch the codes and parse the
//  trailing number in JavaScript, where the regex is reliable. This also makes
//  the logic trivial to unit-test without a database.
//
//  LOCKING STRATEGY:
//  We use SELECT ... FOR UPDATE on the Vertical row to serialize concurrent
//  task creation within the same vertical. This is standard Postgres row-level
//  locking and is guaranteed to participate in the enclosing transaction.
//  (An earlier iteration used pg_advisory_xact_lock, which can silently fail
//  to execute within a Prisma interactive transaction in certain environments.)
// ─────────────────────────────────────────────────────────────────────────────

import type { Prisma } from "@prisma/client";

/**
 * Extract the trailing integer from a task code.
 * "MKT-007" -> 7, "MKT-007 " -> 7, "WEIRD" -> 0, "" / null -> 0.
 *
 * Exported so it can be unit-tested directly.
 */
export function trailingNumber(code: string | null | undefined): number {
  if (!code) return 0;
  const match = /(\d+)\s*$/.exec(code);
  if (!match) return 0;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Given every existing code in a vertical, compute the next code string.
 * Pure function — no I/O — so it is cheap to test.
 */
export function nextCodeFromExisting(verticalCode: string, existingCodes: Array<string | null>): string {
  let max = 0;
  for (const code of existingCodes) {
    const n = trailingNumber(code);
    if (n > max) max = n;
  }
  return formatTaskCode(verticalCode, max + 1);
}

/** Format a vertical code + number into a task code, e.g. ("MKT", 7) -> "MKT-007". */
export function formatTaskCode(verticalCode: string, num: number): string {
  return `${verticalCode}-${String(num).padStart(3, "0")}`;
}

/**
 * Compute the next sequential task code for a vertical inside a transaction.
 *
 * Call this INSIDE a `prisma.$transaction(async (tx) => { ... })` block.
 *
 * It issues `SELECT ... FOR UPDATE` on the Vertical row so that any concurrent
 * transaction trying to create a task in the same vertical must wait for this
 * transaction to commit before it can acquire its own lock. Different verticals
 * never block each other. The lock is released automatically when the
 * transaction commits or rolls back.
 *
 * The numeric suffix is parsed in JavaScript — never with a SQL regex — for
 * the reasons documented at the top of this file.
 *
 * NOTE: callers should still wrap `tx.task.create` in a P2002 retry loop as a
 * belt-and-suspenders defence against codes inserted out-of-band (manual SQL,
 * data imports). With the row lock held that should never be needed, but the
 * retry makes the create provably collision-proof.
 */
export async function computeNextTaskCode(
  tx: Prisma.TransactionClient,
  verticalId: string,
  verticalCode: string,
): Promise<string> {
  // Lock the Vertical row for the duration of this transaction.
  // Concurrent creates against the same vertical block here until we commit;
  // creates against different verticals proceed in parallel.
  await tx.$queryRaw<unknown[]>`
    SELECT id FROM "Vertical" WHERE id = ${verticalId} FOR UPDATE
  `;

  const rows = await tx.task.findMany({
    where: { verticalId },
    select: { code: true },
  });

  return nextCodeFromExisting(verticalCode, rows.map((r) => r.code));
}
