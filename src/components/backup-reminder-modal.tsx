"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  SM daily backup reminder modal.
//
//  Shown on the SM's first login of the day (determined server-side in the
//  portal layout — see showBackupReminder). Opens the download progress page in
//  a NEW tab so the SM can keep working in the portal; the "downloaded today"
//  marker is recorded only when that tab reaches 100%.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Download, X, Database } from "lucide-react";
import { withBase } from "@/lib/base";

export function BackupReminderModal() {
  const [open, setOpen] = useState(true);
  const [launched, setLaunched] = useState(false);

  if (!open) return null;

  function startDownload() {
    setLaunched(true);
    // Open the progress tab; the SM keeps working here.
    window.open(withBase("/sm/backup/progress"), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Daily backup reminder</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Download today&apos;s full database backup once. The download opens in a new tab — you can
              keep working here while it runs.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Later
          </button>
          <button
            type="button"
            onClick={startDownload}
            disabled={launched}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {launched ? "Download started…" : "Download backup"}
          </button>
        </div>

        {launched && (
          <p className="mt-3 text-xs text-muted-foreground">
            A new tab has opened with the download. You can keep working here. This reminder will not
            reappear once today&apos;s download completes.
          </p>
        )}
      </div>
    </div>
  );
}