"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { DAY_NAMES, DAY_NAMES_LONG, minutesToHHMM, hhmmToMinutes } from "@/lib/calendar";
import { setAvailabilityAction, deleteAvailabilityAction } from "./actions";

export function AvailabilityForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const startMin = hhmmToMinutes(String(f.get("start")));
    const endMin = hhmmToMinutes(String(f.get("end")));
    f.set("startMin", String(startMin));
    f.set("endMin", String(endMin));
    startTransition(async () => {
      const result = await setAvailabilityAction(f);
      if (!result.success) { alert(result.error); return; }
      (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="dayOfWeek">Day</Label>
        <Select id="dayOfWeek" name="dayOfWeek" required defaultValue="1">
          {DAY_NAMES_LONG.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="start">Start</Label>
        <Input id="start" name="start" type="time" required defaultValue="10:00" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="end">End</Label>
        <Input id="end" name="end" type="time" required defaultValue="12:00" />
      </div>
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="label">Label (optional)</Label>
        <Input id="label" name="label" placeholder="Decision slot" />
      </div>
      <div className="flex items-end sm:col-span-1">
        <Button type="submit" disabled={pending} className="w-full">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </form>
  );
}

export function AvailabilityRow({ a }: { a: { id: string; dayOfWeek: number; startMin: number; endMin: number; label: string | null; active: boolean } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-7 px-2 grid place-items-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">{DAY_NAMES[a.dayOfWeek]}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{minutesToHHMM(a.startMin)} – {minutesToHHMM(a.endMin)}</div>
          {a.label ? <div className="text-xs text-muted-foreground">{a.label}</div> : null}
        </div>
      </div>
      <Button
        variant="ghost" size="sm" disabled={pending}
        onClick={() => {
          if (!confirm("Remove this availability slot?")) return;
          startTransition(async () => {
            const r = await deleteAvailabilityAction(a.id);
            if (!r.success) { alert(r.error); return; }
            router.refresh();
          });
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
