// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/admin/backup
// ─────────────────────────────────────────────────────────────────────────────
//  Streams a `pg_dump` of the entire database as a self-contained .sql file.
//  Super Admin / SM only. Gated by the `backup_restore` feature flag.
//
//  The dump is generated with --clean --if-exists so replaying it onto any
//  Postgres database wipes and rebuilds every table. See lib/pg-tools.ts.
//
//  To give the client an accurate download percentage we buffer the pg_dump
//  output into a temporary file first, set Content-Length, then stream the file
//  back. The dump (~tens of MB) is small enough that buffering is fine.
//
//  NOTE: the "downloaded today" marker is NOT written here. The SM progress tab
//  calls markBackupComplete() only when the file reaches 100% client-side, so an
//  aborted download is never counted.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { isEnabled } from "@/lib/features";
import { streamPgDump, PgToolsError } from "@/lib/pg-tools";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs"; // pg_dump must run on Node, not Edge.
export const dynamic = "force-dynamic";

const MAX_BUFFER_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB safety cap.

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

  // ── Buffer the dump into a temp file so we know its exact size (Content-Length).
  let dir: string;
  let tmpPath: string;
  try {
    dir = await mkdtemp(join(tmpdir(), "scp-backup-"));
    tmpPath = join(dir, "backup.sql");
    const { createWriteStream } = await import("fs");
    const ws = createWriteStream(tmpPath);
    let written = 0;
    for await (const chunk of stream) {
      written += chunk.length;
      if (written > MAX_BUFFER_BYTES) {
        ws.destroy(new Error("Backup exceeds the 2 GB safety cap."));
        break;
      }
      if (!ws.write(chunk)) await new Promise<void>((res) => ws.once("drain", () => res()));
    }
    await new Promise<void>((res, rej) => ws.end((err?: Error | null) => (err ? rej(err) : res())));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // Best-effort audit that a download was initiated.
  await writeAudit({
    actorId: session.user.id,
    action: "system.backup_download",
    entity: "Database",
    note: "Initiated pg_dump download",
    force: true,
  });

  let size: number;
  try {
    ({ size } = await stat(tmpPath));
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Could not read the generated backup." }, { status: 500 });
  }

  const filename = `startos-backup-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.sql`;
  const fileStream = createReadStream(tmpPath);

  // Convert Node Readable into a Web ReadableStream; clean up the temp file after.
  const webStream = new ReadableStream({
    start(controller) {
      fileStream.on("data", (chunk: Buffer | string) => {
        const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(buf));
      });
      fileStream.on("end", () => controller.close());
      fileStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      fileStream.destroy();
    },
  });

  // Best-effort temp-file cleanup (may already be gone).
  fileStream.on("close", () => {
    import("fs/promises")
      .then(({ rm }) => rm(dir, { recursive: true, force: true }))
      .catch(() => {});
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(size),
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}