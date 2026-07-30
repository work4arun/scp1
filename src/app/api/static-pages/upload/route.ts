import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageTasks } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !canManageTasks(session.user.systemRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const pageName = String(form.get("pageName") || "").trim();
    const file = form.get("file") as File | null;
    const verticalId = String(form.get("verticalId") || "").trim() || null;
    const folderId = String(form.get("folderId") || "").trim() || null;

    if (!pageName) return NextResponse.json({ error: "Page name is required." }, { status: 400 });
    if (!file || file.size === 0) return NextResponse.json({ error: "File is required." }, { status: 400 });

    // Reject an upload aimed at a folder that no longer exists.
    if (folderId) {
      const folder = await prisma.staticFolder.findUnique({ where: { id: folderId }, select: { id: true } });
      if (!folder) return NextResponse.json({ error: "The folder no longer exists. Please refresh." }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const allowedTypes: Record<string, string> = { pdf: "pdf", html: "html", ppt: "ppt", pptx: "ppt" };
    const fileType = allowedTypes[ext];
    if (!fileType) return NextResponse.json({ error: "Invalid file type. Allowed: PDF, HTML, PPT." }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const fileData = Buffer.from(arrayBuffer);

    const page = await prisma.staticPage.create({
      data: { pageName, fileName, fileType, fileData, verticalId, folderId, uploadedBy: session.user.name || session.user.id },
    });

    return NextResponse.json({ success: true, id: page.id });
  } catch (err: any) {
    console.error("[static-page upload]", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}