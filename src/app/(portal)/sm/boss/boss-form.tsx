"use client";

import { useTransition } from "react";
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

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await captureBossInstructionAction(form);
      (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
