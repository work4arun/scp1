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
}: {
  taskId: string;
  code: string;
  hasOpenEscalation: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmCode, setConfirmCode] = useState("");

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
          const newId = await duplicateTaskAction(taskId);
          router.push(`/sm/tasks/${newId}`);
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
                ⚠️ This task has an open escalation to Dr. BN. Resolve it first or ask Super Admin to delete.
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason for deletion <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Duplicated by another task / no longer relevant" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmCode">Type <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">{code}</code> to confirm</Label>
                <Input id="confirmCode" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder={code} />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={pending || hasOpenEscalation || confirmCode.trim() !== code}
                onClick={() => startTransition(async () => {
                  try {
                    await softDeleteTaskAction(taskId, reason.trim());
                    setDeleteOpen(false);
                    router.push("/sm/tasks");
                    router.refresh();
                  } catch (e) {
                    alert((e as Error).message);
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
