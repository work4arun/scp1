// /api/timers/[id] — cancel a timer the user previously set.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelTimerInProcess } from "@/lib/timer-engine";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // Only allow cancelling your own un-fired timers.
  const result = await prisma.timer.updateMany({
    where: { id: params.id, userId: session.user.id, sent: false, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ ok: false, error: "Timer not found, already fired, or already cancelled." }, { status: 404 });
  }

  cancelTimerInProcess(params.id);
  return NextResponse.json({ ok: true });
}
