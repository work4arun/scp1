// /api/notes/[id]/audio — stream the audio bytes back as a media response so
// a plain <audio src="..."> tag can play it.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user.id) return new NextResponse("Forbidden", { status: 403 });

  const note = await prisma.note.findUnique({
    where: { id: params.id },
    select: {
      authorId: true,
      audienceRole: true,
      audioBytes: true,
      audioMime: true,
    },
  });
  if (!note || !note.audioBytes) return new NextResponse("Not found", { status: 404 });

  // Only the author or someone in the audience role can fetch the audio.
  const allowed =
    note.authorId === session.user.id ||
    note.audienceRole === session.user.systemRole ||
    session.user.systemRole === "SUPER_ADMIN";
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const buffer = Buffer.from(note.audioBytes);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": note.audioMime || "audio/webm",
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=60",
    },
  });
}
