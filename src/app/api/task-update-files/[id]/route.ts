// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/task-update-files/[id]           → open the attachment (inline if it can)
//  GET /api/task-update-files/[id]?download=1 → force a download
//
//  Serves one file attached to a task status update. Gated by a portal session
//  (unlike the older static-pages route, which is public) since these are
//  internal follow-up attachments. Content-Disposition follows lib/attachments:
//  inline for browser-renderable types, attachment otherwise, and attachment
//  always when ?download=1.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveMime, canOpenInline } from "@/lib/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 5987 — keep the header ASCII-safe while preserving the real filename for the browser. */
function contentDisposition(kind: "inline" | "attachment", name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(name);
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const file = await prisma.taskUpdateFile.findUnique({
    where: { id: params.id },
    select: { fileData: true, fileName: true, fileMime: true },
  });
  if (!file?.fileData || !file.fileName) {
    return new NextResponse("Attachment not found.", { status: 404 });
  }

  const mime = resolveMime(file.fileName, file.fileMime);
  const forceDownload = request.nextUrl.searchParams.get("download") === "1";
  const inline = !forceDownload && canOpenInline(file.fileName, file.fileMime);

  return new NextResponse(new Uint8Array(file.fileData), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", file.fileName),
      // Private: the file sits behind auth, so no shared-cache copies.
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
