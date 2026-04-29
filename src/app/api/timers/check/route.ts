// /api/timers/check — fire any due-but-unsent timers across all users.
// Idempotent and safe to call frequently. Intended targets:
//   • the master dashboard polling loop (every 30s)
//   • optional external cron (Vercel Cron, GitHub Actions, etc.)

import { NextResponse } from "next/server";
import { sweepDueTimers } from "@/lib/timer-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await sweepDueTimers();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  // Allow GET so a browser-typed URL or a curl one-liner works for debugging.
  const result = await sweepDueTimers();
  return NextResponse.json({ ok: true, ...result });
}
