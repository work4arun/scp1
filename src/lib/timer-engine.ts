// ─────────────────────────────────────────────────────────────────────────────
//  Timer Engine
// ─────────────────────────────────────────────────────────────────────────────
//  Two complementary firing paths so a timer email arrives reliably:
//
//   1. In-process scheduling (`scheduleTimerInProcess`) — when a timer is
//      created we set a Node `setTimeout` for the remaining duration. When it
//      fires we re-check the DB row (it may have been cancelled), then send
//      the email. This is the precise path — fires within milliseconds of the
//      target time.
//
//   2. Catch-up sweep (`sweepDueTimers`) — runs whenever an authenticated
//      page or the dashboard polls /api/timers. It picks up any due-but-unsent
//      rows the in-process scheduler missed (e.g. server restart, deploy).
//
//  Both paths converge on `fireTimer(id)`, which is idempotent thanks to a
//  conditional UPDATE.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { sendTimerAlarmEmail } from "@/lib/email";

// In-memory map so we can clear an outstanding timeout when the user cancels.
// Server restarts wipe this — that's fine, the catch-up sweep handles it.
const inProcess: Map<string, NodeJS.Timeout> = new Map();

// Hard cap on setTimeout — Node refuses anything beyond ~24.8 days. A timer
// further out than this just relies on the catch-up sweep.
const MAX_DELAY_MS = 24 * 60 * 60 * 1000; // 24h cap is plenty for meeting timers.

export function scheduleTimerInProcess(timerId: string, fireAt: Date) {
  cancelTimerInProcess(timerId);
  const delay = fireAt.getTime() - Date.now();
  if (delay <= 0) {
    // Already due — fire on next tick.
    const handle = setTimeout(() => fireTimer(timerId), 0);
    inProcess.set(timerId, handle);
    return;
  }
  if (delay > MAX_DELAY_MS) {
    // Don't even try — the catch-up sweep will cover this case.
    return;
  }
  const handle = setTimeout(() => fireTimer(timerId), delay);
  inProcess.set(timerId, handle);
}

export function cancelTimerInProcess(timerId: string) {
  const handle = inProcess.get(timerId);
  if (handle) {
    clearTimeout(handle);
    inProcess.delete(timerId);
  }
}

/**
 * Mark a timer fired and send its email — idempotent. The atomic
 * `updateMany ... where: { sent: false }` clause makes sure exactly one path
 * (in-process or catch-up) wins the race.
 */
export async function fireTimer(timerId: string): Promise<boolean> {
  inProcess.delete(timerId);

  // Atomically claim the row.
  const claim = await prisma.timer.updateMany({
    where: { id: timerId, sent: false, cancelledAt: null },
    data: { sent: true, sentAt: new Date() },
  });
  if (claim.count === 0) return false; // already sent or cancelled

  const t = await prisma.timer.findUnique({
    where: { id: timerId },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!t || !t.user) return false;

  const durationMs = t.fireAt.getTime() - t.createdAt.getTime();
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

  await sendTimerAlarmEmail({
    to: t.user.email,
    recipientName: t.user.name,
    label: t.label,
    setAt: t.createdAt,
    firedAt: new Date(),
    durationMinutes,
  });

  return true;
}

/**
 * Catch-up sweep — fires any unsent timers whose `fireAt` is in the past.
 * Called from /api/timers and /api/timers/check; safe to call frequently
 * (limit = 50, idempotent on each row).
 */
export async function sweepDueTimers(): Promise<{ fired: number }> {
  const due = await prisma.timer.findMany({
    where: { sent: false, cancelledAt: null, fireAt: { lte: new Date() } },
    select: { id: true },
    take: 50,
  });
  let fired = 0;
  for (const row of due) {
    const ok = await fireTimer(row.id);
    if (ok) fired++;
  }
  return { fired };
}
