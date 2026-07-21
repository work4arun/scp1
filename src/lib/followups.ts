// ─────────────────────────────────────────────────────────────────────────────
//  Daily follow-up helpers
// ─────────────────────────────────────────────────────────────────────────────
//  The CBO overview shows SM task updates grouped by the calendar date they
//  were filed on. `TaskUpdate.createdAt` is stored in UTC, but "which day was
//  this filed on" has to be answered in the operating timezone — the container
//  runs UTC in production, so an update filed at 9:30 PM IST would otherwise
//  land on the previous day for anyone reading the calendar.
//
//  Everything here buckets by APP_TZ. Month queries are padded by a day on
//  each side so no entry near a boundary is lost, then bucketed precisely in
//  JS via Intl.
// ─────────────────────────────────────────────────────────────────────────────

export const APP_TZ = "Asia/Kolkata";

const DAY_KEY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TIME_FMT = new Intl.DateTimeFormat("en-IN", {
  timeZone: APP_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-07-21" for the given instant, in APP_TZ. */
export function dayKey(date: Date): string {
  return DAY_KEY_FMT.format(date);
}

/** "09:35 pm" for the given instant, in APP_TZ. */
export function timeOfDay(date: Date): string {
  return TIME_FMT.format(date);
}

/** "2026-07" for the given instant, in APP_TZ. */
export function monthKey(date: Date): string {
  return dayKey(date).slice(0, 7);
}

/** Today's day key in APP_TZ. */
export function todayKey(): string {
  return dayKey(new Date());
}

/** Parse "2026-07" into a {year, month} pair (month is 0-indexed). Falls back to the current month. */
export function parseMonthKey(value: string | undefined): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (year >= 2000 && year <= 2999 && month >= 0 && month <= 11) return { year, month };
  }
  const now = monthKey(new Date());
  return { year: Number(now.slice(0, 4)), month: Number(now.slice(5, 7)) - 1 };
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** "July 2026" */
export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

/** "21 July 2026" from a "2026-07-21" day key. */
export function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return `${String(d).padStart(2, "0")} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** Number of days in a month, and the weekday (0=Sun) its 1st falls on. */
export function monthGrid(year: number, month: number): { days: number; firstWeekday: number } {
  return {
    days: new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
    firstWeekday: new Date(Date.UTC(year, month, 1)).getUTCDay(),
  };
}

/**
 * UTC range covering a local-timezone month, padded by one day on each side so
 * boundary entries are fetched and can be bucketed by `dayKey` afterwards.
 */
export function monthRangeUtc(year: number, month: number): { gte: Date; lt: Date } {
  return {
    gte: new Date(Date.UTC(year, month, 1) - 24 * 60 * 60 * 1000),
    lt: new Date(Date.UTC(year, month + 1, 1) + 24 * 60 * 60 * 1000),
  };
}

/** Step one month back/forward from a month key. */
export function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return formatMonthKey(d.getUTCFullYear(), d.getUTCMonth());
}

// ── Entry classification ─────────────────────────────────────────────────────
//  Not every TaskUpdate row is a follow-up the SM typed. `updateTaskAction`
//  writes "📝 Edit: …" field diffs, and a status-only submission writes
//  "🔄 Status → …". Those are system-generated audit rows — real for the record,
//  but noise next to a written follow-up, so the UI dims them.

export type EntryKind = "note" | "edit" | "status";

export function classifyUpdate(note: string): EntryKind {
  if (note.startsWith("📝 Edit:")) return "edit";
  if (note.startsWith("🔄 Status →")) return "status";
  return "note";
}

export function isSystemEntry(note: string): boolean {
  return classifyUpdate(note) !== "note";
}
