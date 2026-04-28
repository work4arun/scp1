// Helpers for time, day-of-week, slot generation, and overlap checks.

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_NAMES_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60 * 1000);
}

export function rangeOverlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// Build candidate slots from availability rules for a given date,
// removing any that collide with existing booked appointments.
export function generateSlots({
  date,
  rules,
  busy,
  durationMin,
}: {
  date: Date;
  rules: { dayOfWeek: number; startMin: number; endMin: number }[];
  busy: { startAt: Date; endAt: Date }[];
  durationMin: number;
}): { start: Date; end: Date }[] {
  const dow = date.getDay();
  const day = startOfDay(date);
  const slots: { start: Date; end: Date }[] = [];
  for (const r of rules) {
    if (r.dayOfWeek !== dow) continue;
    let cursor = r.startMin;
    while (cursor + durationMin <= r.endMin) {
      const s = addMinutes(day, cursor);
      const e = addMinutes(s, durationMin);
      const collides = busy.some((b) => rangeOverlaps(s, e, b.startAt, b.endAt));
      if (!collides && e > new Date()) slots.push({ start: s, end: e });
      cursor += durationMin;
    }
  }
  return slots;
}

// ICS calendar export
export function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsDate(d: Date): string {
  // YYYYMMDDTHHmmssZ in UTC
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function buildIcs(events: {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end: Date;
  organizerEmail?: string;
  organizerName?: string;
  attendeeEmail?: string;
  attendeeName?: string;
}[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Strategic Control Portal//EN",
    "METHOD:PUBLISH",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}@scp`);
    lines.push(`DTSTAMP:${toIcsDate(new Date())}`);
    lines.push(`DTSTART:${toIcsDate(e.start)}`);
    lines.push(`DTEND:${toIcsDate(e.end)}`);
    lines.push(`SUMMARY:${escapeIcs(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeIcs(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeIcs(e.location)}`);
    if (e.organizerEmail) lines.push(`ORGANIZER;CN=${escapeIcs(e.organizerName || e.organizerEmail)}:mailto:${e.organizerEmail}`);
    if (e.attendeeEmail) lines.push(`ATTENDEE;CN=${escapeIcs(e.attendeeName || e.attendeeEmail)};RSVP=TRUE:mailto:${e.attendeeEmail}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
