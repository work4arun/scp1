// /api/timers — create + list personal countdown timers.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scheduleTimerInProcess, sweepDueTimers } from "@/lib/timer-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_SECONDS = 30;
const MAX_HOURS = 24;

// ────────── GET — list active (unfired, uncancelled) timers + run sweep ──────────
export async function GET() {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // Catch up any timers the in-process scheduler missed (e.g. after restart).
  await sweepDueTimers();

  const timers = await prisma.timer.findMany({
    where: { userId: session.user.id, cancelledAt: null, sent: false },
    orderBy: { fireAt: "asc" },
    select: { id: true, label: true, fireAt: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, timers });
}

// ────────── POST — create a new timer ──────────
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  let body: { label?: string; durationSeconds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const durationSeconds = Number(body.durationSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds < MIN_SECONDS) {
    return NextResponse.json(
      { ok: false, error: `Duration must be at least ${MIN_SECONDS} seconds.` },
      { status: 400 },
    );
  }
  if (durationSeconds > MAX_HOURS * 3600) {
    return NextResponse.json(
      { ok: false, error: `Duration cannot exceed ${MAX_HOURS} hours.` },
      { status: 400 },
    );
  }

  const label = (body.label ?? "").trim().slice(0, 120) || null;
  const fireAt = new Date(Date.now() + durationSeconds * 1000);

  const timer = await prisma.timer.create({
    data: { userId: session.user.id, label, fireAt },
    select: { id: true, label: true, fireAt: true, createdAt: true },
  });

  // Best-effort precise firing.
  scheduleTimerInProcess(timer.id, timer.fireAt);

  return NextResponse.json({ ok: true, timer }, { status: 201 });
}
