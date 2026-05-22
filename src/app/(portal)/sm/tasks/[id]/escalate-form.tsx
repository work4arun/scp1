"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { escalateTaskAction } from "./actions";

export function EscalateForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setError(null);
    startTransition(async () => {
      const result = await escalateTaskAction(taskId, form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formEl.reset();
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="issue">Issue</Label>
          <Input id="issue" name="issue" required placeholder="What is the problem?" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deadline">Decision needed by</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="whyNeeded">Why Dr. BN is needed</Label>
        <Textarea id="whyNeeded" name="whyNeeded" required placeholder="Strategic direction / leadership lobbying / approval…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="decisionRequired">Decision required</Label>
        <Textarea id="decisionRequired" name="decisionRequired" required placeholder="What exactly should Dr. BN decide?" />
      </div>
      <div className="flex items-center gap-2">
        <input id="noteAttached" type="checkbox" name="noteAttached" className="h-4 w-4" />
        <Label htmlFor="noteAttached" className="text-xs normal-case font-normal">Prepared note attached</Label>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Sending…" : "Add to Dr. BN's queue"}
        </Button>
      </div>
    </form>
  );
}
