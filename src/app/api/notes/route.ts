// /api/notes — create + list notes.
//
// CBO sends a note (text and/or audio); the API stores the row, then fans out
// in-app notifications to every active SM. Listing returns the recent notes
// authored by the current user OR addressed to the role they hold.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SystemRole } from "@prisma/client";
import { notifyUser } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 6 * 1024 * 1024; // 6 MB — ≈ 60s of opus

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid multipart payload" }, { status: 400 });
  }

  const text = ((form.get("text") as string) || "").trim();
  const file = form.get("audio");
  const durationStr = String(form.get("audioDurationS") || "");
  const audienceRoleRaw = String(form.get("audienceRole") || "SM");

  // Audience must be a real SystemRole. Default to SM (matches the user's
  // primary use-case: CBO leaves notes for the SMs).
  const audienceRole: SystemRole =
    audienceRoleRaw === "CBO" || audienceRoleRaw === "SUPER_ADMIN" ? (audienceRoleRaw as SystemRole) : "SM";

  if (!text && !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Provide text, audio, or both." }, { status: 400 });
  }

  let audioBytes: Buffer | null = null;
  let audioMime: string | null = null;
  let audioDurationS: number | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Audio too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_AUDIO_BYTES / 1024 / 1024} MB.` },
        { status: 413 },
      );
    }
    const arr = new Uint8Array(await file.arrayBuffer());
    audioBytes = Buffer.from(arr);
    audioMime = file.type || "audio/webm";
    const dur = Number(durationStr);
    audioDurationS = Number.isFinite(dur) && dur > 0 ? Math.round(dur) : null;
  }

  const note = await prisma.note.create({
    data: {
      authorId: session.user.id,
      audienceRole,
      text: text || null,
      audioBytes,
      audioMime,
      audioDurationS,
    },
    select: {
      id: true,
      text: true,
      audioMime: true,
      audioDurationS: true,
      audienceRole: true,
      createdAt: true,
    },
  });

  // Fan out in-app notifications to every active user holding the audience role.
  const recipients = await prisma.user.findMany({
    where: { active: true, systemRole: audienceRole },
    select: { id: true },
  });
  const preview = note.text
    ? note.text.length > 90
      ? note.text.slice(0, 90) + "…"
      : note.text
    : audioMime
    ? "🎙️ Voice note"
    : "Note";

  await Promise.all(
    recipients
      .filter((r) => r.id !== session.user.id)
      .map((r) =>
        notifyUser(r.id, {
          senderId: session.user.id,
          kind: "note.received",
          title: `📝 New note from ${session.user.name || "CBO"}`,
          body: preview,
          link: "/sm/notes",
          refId: note.id,
        }),
      ),
  );

  return NextResponse.json({ ok: true, note }, { status: 201 });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const box = url.searchParams.get("box") ?? "auto";

  let where;
  if (box === "sent") {
    where = { authorId: session.user.id };
  } else if (box === "received") {
    where = { audienceRole: session.user.systemRole, authorId: { not: session.user.id } };
  } else {
    // "auto" — show items relevant to the viewer.
    // CBO/SUPER_ADMIN see what they sent. SM sees what's addressed to them.
    if (session.user.systemRole === "SM") {
      where = { audienceRole: "SM" as const };
    } else {
      where = { authorId: session.user.id };
    }
  }

  const notes = await prisma.note.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      text: true,
      audioMime: true,
      audioDurationS: true,
      audienceRole: true,
      createdAt: true,
      author: { select: { name: true, email: true, systemRole: true } },
    },
  });

  return NextResponse.json({ ok: true, notes });
}
