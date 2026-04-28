"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { escalateTaskAction } from "./actions";

export function EscalateForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await escalateTaskAction(taskId, form);
      (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
