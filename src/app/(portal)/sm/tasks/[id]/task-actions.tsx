"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Copy, X } from "lucide-react";
import { softDeleteTaskAction, duplicateTaskAction } from "./edit/actions";

export function TaskActions({
  taskId,
  code,
  hasOpenEscalation,
  isSuperAdmin = false,
}: {
  taskId: string;
  code: string;
  hasOpenEscalation: boolean;
  isSuperAdmin?: boolean;
}) {
  // Super Admin can override the open-escalation lock on delete — the server
  // action already allows it (canConfigureSystem) but the UI used to block it.
  const blockDelete = hasOpenEscalation && !isSuperAdmin;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Trim BOTH sides — code from DB can have legacy trailing whitespace
  // (CSV imports, migrations) which would leave the Delete button silently
  // disabled with no feedback.
  const codeNormalized = code.trim();
  const confirmMatches = confirmCode.trim() === codeNormalized;

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/sm/tasks/${taskId}/edit`}><Pencil className="h-4 w-4" /> Edit</Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(async () => {
          try {
            const result = await duplicateTaskAction(taskId);
            if (!result.success) {
              alert(result.error);
              return;
            }
            router.push(`/sm/tasks/${result.id}`);
          } catch (e) {
            alert((e as Error)?.message || "Could not duplicate task. Please refresh and try again.");
          }
        })}
      >
        <Copy className="h-4 w-4" /> Duplicate
      </Button>
      <Button size="sm" variant="outline" onClick={() => setDeleteOpen(true)} className="text-destructive border-destructive/40 hover:bg-destructive/5">
        <Trash2 className="h-4 w-4" /> Delete
      </Button>

      {/* Delete dialog */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 animate-fade-in" onClick={() => !pending && setDeleteOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold">Delete task</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  This task will be <strong>permanently deleted</strong>. This action cannot be undone.
                </p>
              </div>
              <button onClick={() => setDeleteOpen(false)} disabled={pending} className="rounded-md p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>

            {hasOpenEscalation ? (
              <div className="rounded-md bg-warning/10 text-warning px-3 py-2 text-xs font-medium mb-3">
                ⚠️ This task has an open escalation to Dr. BN.{" "}
                {isSuperAdmin
                  ? "As Super Admin you can still delete it — proceed with caution."
                  : "Resolve it first or ask Super Admin to delete."}
              </div>
            ) : null}

            {deleteError ? (
              <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-xs font-medium mb-3 whitespace-pre-wrap">
                {deleteError}
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason for deletion <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Duplicated by another task / no longer relevant" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmCode">Type <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">{codeNormalized}</code> to confirm</Label>
                <Input
                  id="confirmCode"
                  value={confirmCode}
                  onChange={(e) => { setConfirmCode(e.target.value); setDeleteError(null); }}
                  placeholder={codeNormalized}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={pending || blockDelete || !confirmMatches}
                onClick={() => startTransition(async () => {
                  setDeleteError(null);
                  try {
                    const result = await softDeleteTaskAction(taskId, reason.trim());
                    if (!result.success) {
                      setDeleteError(result.error);
                      return;
                    }
                    setDeleteOpen(false);
                    router.push("/sm/tasks");
                    router.refresh();
                  } catch (e) {
                    setDeleteError((e as Error)?.message || "An unexpected error occurred. Please refresh and try again.");
                  }
                })}
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
