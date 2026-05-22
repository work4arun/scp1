"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureBossInstructionAction } from "./actions";

export function BossInstructionForm({ verticals }: { verticals: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setError(null);
    startTransition(async () => {
      const result = await captureBossInstructionAction(form);
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
      <div className="space-y-1.5">
        <Label htmlFor="instruction">Instruction</Label>
        <Textarea id="instruction" name="instruction" required placeholder="Verbatim instruction from boss / meeting / WhatsApp." />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="source">Source</Label>
          <Select id="source" name="source" required defaultValue="BOSS_INSTRUCTION">
            <option value="BOSS_INSTRUCTION">Boss Instruction</option>
            <option value="WHATSAPP_GROUP">WhatsApp Group</option>
            <option value="MANAGEMENT_MEETING">Management Meeting</option>
            <option value="DEPARTMENT_MEETING">Department Meeting</option>
            <option value="MRM">MRM</option>
            <option value="MARKETING_REVIEW">Marketing Review</option>
            <option value="PLACEMENT_REVIEW">Placement Review</option>
            <option value="RTC_REVIEW">RTC Review</option>
            <option value="DIGITAL_REVIEW">Digital Review</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="verticalId">Related vertical</Label>
          <Select id="verticalId" name="verticalId">
            <option value="">— None —</option>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="responseGiven">Response given (optional)</Label>
          <Input id="responseGiven" name="responseGiven" placeholder="e.g. Captured in tracker, will align with P1." />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Capture instruction"}</Button>
      </div>
    </form>
  );
}
