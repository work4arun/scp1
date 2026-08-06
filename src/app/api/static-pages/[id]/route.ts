import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const page = await prisma.staticPage.findUnique({ where: { id: params.id } });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Link pages have no binary payload — forward to the stored URL.
    if (page.fileType === "link") {
      if (!page.linkUrl) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.redirect(page.linkUrl);
    }

    const download = request.nextUrl.searchParams.get("download") === "1";

    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      html: "text/html",
      ppt: "application/vnd.ms-powerpoint",
    };

    const mime = mimeTypes[page.fileType] || "application/octet-stream";
    const disposition = download ? `attachment; filename="${page.fileName}"` : (page.fileType === "html" ? "inline" : `inline; filename="${page.fileName}"`);

    return new NextResponse(new Uint8Array(page.fileData ?? Buffer.alloc(0)), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}