// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/admin/backup
// ─────────────────────────────────────────────────────────────────────────────
//  Streams a `pg_dump` of the entire database as a self-contained .sql file.
//  Super Admin only. Gated by the `backup_restore` feature flag.
//
//  The dump is generated with --clean --if-exists so replaying it onto any
//  Postgres database wipes and rebuilds every table. See lib/pg-tools.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { isEnabled } from "@/lib/features";
import { streamPgDump, PgToolsError } from "@/lib/pg-tools";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs"; // pg_dump must run on Node, not Edge.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!(await isEnabled("backup_restore"))) {
    return new NextResponse(
      "Database backup is disabled. Enable the `backup_restore` flag at /admin/features.",
      { status: 403 },
    );
  }

  let stream;
  try {
    ({ stream } = streamPgDump());
  } catch (err) {
    const code = err instanceof PgToolsError ? err.code : "UNKNOWN";
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, code, error: msg }, { status: 500 });
  }

  // Adapt the Node Readable into a Web ReadableStream the Response can consume.
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  // Best-effort audit. The dump itself is the side effect we want to record.
  await writeAudit({
    actorId: session.user.id,
    action: "system.backup_download",
    entity: "Database",
    note: "Triggered pg_dump download",
    force: true,
  });

  const filename = `startos-backup-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.sql`;
  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
