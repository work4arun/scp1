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
 * IMPORTANT — why we query by code prefix, not by verticalId:
 *
 * The `code` field is globally unique (@@unique). If a vertical was ever
 * recreated (e.g. deleted + re-added via the admin UI), the new row gets a
 * fresh cuid() while existing tasks retain the old verticalId. A query of
 * `findMany({ where: { verticalId: newId } })` would return 0 rows, compute
 * max=0, and generate "PREFIX-001" — which collides with the task already
 * stored under the old verticalId. That produces an endless P2002 loop.
 *
 * Querying by code prefix (`startsWith: "MKT-"`) finds every task that
 * occupies a slot in this code space, regardless of which verticalId they
 * carry. The max is then correct and the next code will never collide.
 *
 * Locking: we still take a `SELECT … FOR UPDATE` on the Vertical row to
 * serialize concurrent creates for the same vertical.
 */
export async function computeNextTaskCode(
  tx: Prisma.TransactionClient,
  verticalId: string,
  verticalCode: string,
): Promise<string> {
  // Row-level lock on the Vertical — serialises concurrent creates for this
  // vertical; different verticals never block each other.
  await tx.$queryRaw<unknown[]>`
    SELECT id FROM "Vertical" WHERE id = ${verticalId} FOR UPDATE
  `;

  // Query ALL tasks whose code starts with this vertical's prefix, regardless
  // of their stored verticalId. This is the only query that is immune to
  // verticalId mismatches caused by vertical recreation.
  const prefix = `${verticalCode}-`;
  const rows = await tx.task.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });

  return nextCodeFromExisting(verticalCode, rows.map((r) => r.code));
}
