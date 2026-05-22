"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STATUS_OPTIONS } from "@/components/status-badges";
import { addUpdateAction } from "./actions";
import type { TaskStatus } from "@prisma/client";

export function TaskUpdateForm({ taskId, currentStatus }: { taskId: string; currentStatus: TaskStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const showDelayReason = selectedStatus === "DELAYED" || (selectedStatus === "" && currentStatus === "DELAYED");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    const note = String(form.get("note") || "").trim();
    const status = String(form.get("status") || "").trim();

    // We need either a note OR a status change — otherwise nothing to record.
    if (!note && !status) {
      setError("Please add a note or pick a new status.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await addUpdateAction(taskId, form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formEl.reset();
      setSelectedStatus("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? (
        <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm font-medium">
          {error}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="note">
          What&apos;s the update?{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (optional when changing status)
          </span>
        </Label>
        <Textarea id="note" name="note" placeholder="Action taken, who responded, what's blocking…" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="status">New status (optional)</Label>
          <Select
            id="status"
            name="status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">— No change —</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value} disabled={s.value === currentStatus}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Add update"}
          </Button>
        </div>
      </div>

      {/* Delay reason — shown whenever the current or newly selected status is DELAYED */}
      {showDelayReason && (
        <div className="space-y-1.5 rounded-lg border border-warning/40 bg-warning/5 p-3">
          <Label htmlFor="delayReason" className="text-warning">
            Delay reason <span className="text-xs font-normal text-muted-foreground">(required when delayed)</span>
          </Label>
          <Textarea
            id="delayReason"
            name="delayReason"
            placeholder="Explain the cause of delay — resource constraint, dependency, approval pending…"
            className="border-warning/40 focus:border-warning"
          />
        </div>
      )}
    </form>
  );
}
