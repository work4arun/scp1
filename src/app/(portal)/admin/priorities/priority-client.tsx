"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, X } from "lucide-react";
import { upsertPriorityAction, deletePriorityAction } from "./actions";

export function PriorityForm({ initial }: { initial?: { id?: string; code?: string; label?: string; description?: string | null; reviewCadence?: string | null; colorHex?: string; rank?: number } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await upsertPriorityAction(form);
      if (!initial?.id) (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" required maxLength={6} placeholder="P1" defaultValue={initial?.code} className="uppercase" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="label">Label</Label>
        <Input id="label" name="label" required placeholder="Critical" defaultValue={initial?.label} />
      </div>
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="rank">Rank</Label>
        <Input id="rank" name="rank" type="number" required defaultValue={initial?.rank ?? 1} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="reviewCadence">Review cadence</Label>
        <Input id="reviewCadence" name="reviewCadence" placeholder="Daily tracking" defaultValue={initial?.reviewCadence || ""} />
      </div>
      <div className="space-y-1.5 sm:col-span-5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="What does this level mean?" defaultValue={initial?.description || ""} />
      </div>
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="colorHex">Colour</Label>
        <Input id="colorHex" name="colorHex" type="color" defaultValue={initial?.colorHex || "#6b7280"} className="h-11 p-1" />
      </div>
      <div className="sm:col-span-6 flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial?.id ? "Update" : "Add priority"}</Button>
      </div>
    </form>
  );
}

export function PriorityRow({
  p,
}: {
  p: { id: string; code: string; label: string; description: string | null; reviewCadence: string | null; colorHex: string; rank: number; active: boolean; taskCount: number };
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/40 bg-accent/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Edit priority</div>
          <button onClick={() => setEditing(false)} className="rounded-md p-1 hover:bg-card"><X className="h-4 w-4" /></button>
        </div>
        <PriorityForm initial={p} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-9 w-9 rounded-md grid place-items-center text-xs font-bold text-white" style={{ backgroundColor: p.colorHex }}>{p.code}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{p.label}</div>
          <div className="text-xs text-muted-foreground truncate">
            {p.reviewCadence || "—"} · {p.taskCount} tasks
          </div>
          {p.description ? <div className="text-xs text-muted-foreground truncate">{p.description}</div> : null}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant={p.active ? "success" : "muted"}>{p.active ? "Active" : "Hidden"}</Badge>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4" /></Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || p.taskCount > 0}
          onClick={() => {
            if (!confirm(`Delete priority "${p.code}"?`)) return;
            startTransition(async () => { await deletePriorityAction(p.id); router.refresh(); });
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
