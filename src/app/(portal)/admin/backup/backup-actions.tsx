"use client";

// Client-side controls for the Backup & Restore admin page.
//
// • Download — opens GET /api/admin/backup in a new tab so the browser
//   handles the streaming Content-Disposition response.
// • Restore — multipart upload with password re-auth + a hard typed-confirmation.
//   The restore form is intentionally a little awkward to operate; this is
//   correct.

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export function BackupActions({ enabled }: { enabled: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild disabled={!enabled} aria-disabled={!enabled}>
          <a
            href={enabled ? "/api/admin/backup" : "#"}
            // The browser respects the Content-Disposition header, so we don't
            // need download="" — but we set it anyway as a hint for browsers
            // that prefer it.
            download
            target={enabled ? "_self" : undefined}
            rel="noopener"
            onClick={(e) => {
              if (!enabled) e.preventDefault();
            }}
          >
            <Download className="h-4 w-4" /> Download .sql backup
          </a>
        </Button>
      </div>

      <hr className="border-border" />

      <RestoreForm enabled={enabled} />
    </div>
  );
}

function RestoreForm({ enabled }: { enabled: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const canSubmit =
    enabled && !busy && fileName !== "" && password.length > 0 && confirmText === "RESTORE";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setBusy(true);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("password", password);

    try {
      const res = await fetch("/api/admin/restore", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
      if (res.ok && data.ok) {
        setResult({ ok: true, message: data.message || "Restore complete." });
        setPassword("");
        setConfirmText("");
        if (fileRef.current) fileRef.current.value = "";
        setFileName("");
      } else {
        setResult({ ok: false, message: data.error || `Restore failed (HTTP ${res.status}).` });
      }
    } catch (err) {
      setResult({
        ok: false,
        message: "Network error: " + (err instanceof Error ? err.message : String(err)),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label htmlFor="backup-file">Backup file (.sql)</Label>
        <Input
          id="backup-file"
          type="file"
          accept=".sql,application/sql,text/plain"
          ref={fileRef}
          onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          disabled={!enabled || busy}
          required
        />
        {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="backup-password">Confirm with your Super Admin password</Label>
        <Input
          id="backup-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={!enabled || busy}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="backup-confirm">
          Type <code className="rounded bg-muted px-1 py-0.5 font-mono">RESTORE</code> to enable the button
        </Label>
        <Input
          id="backup-confirm"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={!enabled || busy}
          placeholder="RESTORE"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <Button type="submit" variant="destructive" disabled={!canSubmit}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Restoring…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> Restore Database
          </>
        )}
      </Button>

      {result && (
        <div
          className={
            "rounded-lg border p-3 text-sm " +
            (result.ok ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive")
          }
        >
          <div className="flex items-start gap-2">
            {result.ok ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <div className="whitespace-pre-wrap">{result.message}</div>
          </div>
        </div>
      )}
    </form>
  );
}
