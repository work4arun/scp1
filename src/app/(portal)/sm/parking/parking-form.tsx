"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addParkingLotAction } from "./actions";

export function ParkingForm({ verticals }: { verticals: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await addParkingLotAction(form);
      (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="idea">Idea / task</Label>
        <Textarea id="idea" name="idea" required placeholder="What's the idea?" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="suggestedBy">Suggested by</Label>
          <Input id="suggestedBy" name="suggestedBy" required placeholder="Name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="verticalId">Related vertical</Label>
          <Select id="verticalId" name="verticalId">
            <option value="">— None —</option>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="decision">Decision</Label>
          <Select id="decision" name="decision" defaultValue="Park">
            <option>Park</option>
            <option>Review</option>
            <option>Activate</option>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="expectedImpact">Expected impact</Label>
          <Select id="expectedImpact" name="expectedImpact">
            <option value="">—</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="urgency">Urgency</Label>
          <Select id="urgency" name="urgency">
            <option value="">—</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reviewDate">Review date</Label>
          <Input id="reviewDate" name="reviewDate" type="date" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="remarks">Remarks</Label>
        <Input id="remarks" name="remarks" placeholder="Why parked / when to revisit" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Park idea"}</Button>
      </div>
    </form>
  );
}
