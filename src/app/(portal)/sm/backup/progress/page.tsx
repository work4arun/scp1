"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  SM daily backup — download progress tab.
//
//  Opened from the backup reminder modal in a NEW browser tab so the SM can keep
//  working in the main portal tab while this one downloads the full DB backup.
//
//  • Reads the pg_dump stream and renders a live percentage vs Content-Length.
//  • At 100% it saves the file with a LOCAL-time filename and calls the server
//    action markBackupComplete() so the "downloaded today" marker is recorded
//    ONLY when the download actually finished.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/base";
import { markBackupComplete } from "../actions";

function localFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `startos-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.sql`;
}

export default function BackupProgressPage() {
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "downloading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const markedRef = useRef(false);
  const filenameRef = useRef<string | null>(null);

  const run = useCallback(async () => {
    try {
      const res = await fetch(withBase("/api/admin/backup"), { cache: "no-store" });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (HTTP ${res.status})`);
      }
      const contentLength = Number(res.headers.get("Content-Length") || "0");
      setTotal(contentLength || null);

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      setStatus("downloading");

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          const pct = contentLength > 0 ? Math.min(100, Math.round((received / contentLength) * 100)) : 0;
          setProgress(pct);
        }
      }

      // 100% — assemble the file and save it with a local-time name.
      const blob = new Blob(chunks as unknown as BlobPart[], { type: "application/sql" });
      const filename = localFilename();
      filenameRef.current = filename;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      setProgress(100);
      setStatus("done");

      // Record completion ONLY after the file is fully received.
      if (!markedRef.current) {
        markedRef.current = true;
        await markBackupComplete();
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const pct = progress;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">SCP</div>
          <div>
            <h1 className="text-base font-semibold">Database Backup</h1>
            <p className="text-xs text-muted-foreground">Downloading the full backup to your computer.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{status === "done" ? "Complete" : status === "error" ? "Failed" : status === "loading" ? "Starting…" : "Downloading…"}</span>
            <span>
              {total ? `${pct}%` : "…"}
            </span>
          </div>

          {status === "done" && (
            <div className="rounded-md border border-success/40 bg-success/5 p-3 text-sm text-success">
              Backup downloaded successfully to{" "}
              <span className="font-mono text-xs">{filenameRef.current}</span>.
              You can switch back to the main tab and keep working. This tab can be closed.
            </div>
          )}

          {status === "error" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Download failed. {error} Close this tab and try again from the portal.
            </div>
          )}

          {status === "downloading" && (
            <p className="text-xs text-muted-foreground">
              You can switch back to the main tab and continue working — this download keeps running here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}