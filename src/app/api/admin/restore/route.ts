// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/admin/restore
// ─────────────────────────────────────────────────────────────────────────────
//  Accepts a multipart upload with two fields:
//    • file     — the .sql file produced by GET /api/admin/backup
//    • password — the Super Admin's current password (re-auth)
//
//  Applies it via `psql --single-transaction --on-error-stop` so any failure
//  rolls everything back to the pre-restore state.
//
//  This is a destructive operation. The endpoint is gated by:
//    • Super Admin role
//    • `backup_restore` feature flag
//    • Live password re-validation
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { isEnabled } from "@/lib/features";
import { runPsqlRestore, PgToolsError } from "@/lib/pg-tools";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allow files up to 50 MB. Adjust if your dataset is larger; the limit is a
// safety net against accidental uploads.
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole) || !session?.user.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!(await isEnabled("backup_restore"))) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Database restore is disabled. Enable the `backup_restore` flag at /admin/features.",
      },
      { status: 403 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Could not parse upload: " + (err instanceof Error ? err.message : String(err)) },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const password = String(form.get("password") || "");

  if (!password) {
    return NextResponse.json({ ok: false, error: "Password is required to confirm restore." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Backup .sql file is required." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: "Uploaded file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_BYTES / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  // ── Re-auth: verify the current Super Admin's password.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true, active: true },
  });
  if (!me || !me.active) {
    return NextResponse.json({ ok: false, error: "Account not found or deactivated." }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, me.passwordHash);
  if (!ok) {
    // Audit failed attempts — restore is destructive enough that failed
    // password retries are worth seeing in the log.
    await writeAudit({
      actorId: session.user.id,
      action: "system.restore_auth_failed",
      entity: "Database",
      note: "Restore attempt blocked by failed password re-auth",
      force: true,
    });
    return NextResponse.json({ ok: false, error: "Password incorrect." }, { status: 401 });
  }

  // ── Read + sanity-check the file contents.
  const sql = await file.text();
  if (!/CREATE TABLE|COPY |INSERT INTO/i.test(sql)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "This file does not look like a Postgres dump. Expected to find CREATE TABLE / COPY / INSERT statements.",
      },
      { status: 400 },
    );
  }

  // ── Audit BEFORE running so the attempt is recorded even if psql crashes.
  await writeAudit({
    actorId: session.user.id,
    action: "system.restore_started",
    entity: "Database",
    after: { fileName: file.name, sizeBytes: file.size },
    note: `Initiated restore from ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
    force: true,
  });

  // ── Apply.
  let result;
  try {
    result = await runPsqlRestore(sql);
  } catch (err) {
    const msg = err instanceof PgToolsError ? err.message : err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  if (!result.ok) {
    // Try to record the failure — but the AuditLog table may itself have just
    // been wiped and recreated mid-restore, so swallow errors.
    try {
      await writeAudit({
        actorId: session.user.id,
        action: "system.restore_failed",
        entity: "Database",
        note: result.error.slice(0, 1000),
        force: true,
      });
    } catch { /* ignore */ }
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  // Successful restore — write a fresh audit row in the *new* state.
  try {
    await writeAudit({
      actorId: session.user.id,
      action: "system.restore_completed",
      entity: "Database",
      note: `Restored from ${file.name}`,
      force: true,
    });
  } catch { /* ignore — DB might be mid-restart */ }

  return NextResponse.json({
    ok: true,
    message:
      "Restore complete. Sign out and sign back in — your session may reference rows that have been replaced.",
  });
}
