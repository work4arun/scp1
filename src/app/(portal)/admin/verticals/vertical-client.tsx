"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, Save, X, ArrowUp, ArrowDown } from "lucide-react";
import { upsertVerticalAction, deleteVerticalAction, toggleVerticalActiveAction } from "./actions";
import { moveVerticalAction } from "../actions";

export function VerticalForm({ initial }: { initial?: { id?: string; code?: string; name?: string; description?: string | null; colorHex?: string; sortOrder?: number } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await upsertVerticalAction(form);
      if (!initial?.id) (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" required maxLength={6} placeholder="MKT" defaultValue={initial?.code} className="uppercase" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="Marketing" defaultValue={initial?.name} />
      </div>
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="colorHex">Colour</Label>
        <Input id="colorHex" name="colorHex" type="color" defaultValue={initial?.colorHex || "#4f46e5"} className="h-11 p-1" />
      </div>
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="sortOrder">Order</Label>
        <Input id="sortOrder" name="sortOrder" type="number" defaultValue={initial?.sortOrder ?? 0} />
      </div>
      <div className="space-y-1.5 sm:col-span-6">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="Short purpose" defaultValue={initial?.description || ""} />
      </div>
      <div className="sm:col-span-6 flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial?.id ? "Update vertical" : "Add vertical"}</Button>
      </div>
    </form>
  );
}

export function VerticalRow({
  v,
}: {
  v: { id: string; code: string; name: string; description: string | null; colorHex: string; sortOrder: number; active: boolean; taskCount: number; subCount: number };
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/40 bg-accent/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Edit vertical</div>
          <button onClick={() => setEditing(false)} className="rounded-md p-1 hover:bg-card"><X className="h-4 w-4" /></button>
        </div>
        <VerticalForm initial={v} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-9 w-9 rounded-md grid place-items-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: v.colorHex }}>{v.code}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{v.name}</div>
          <div className="text-xs text-muted-foreground truncate">{v.description || "—"}</div>
          <div className="text-xs text-muted-foreground">{v.taskCount} tasks · {v.subCount} sub-verticals</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        <Badge variant={v.active ? "success" : "muted"}>{v.active ? "Active" : "Hidden"}</Badge>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(async () => { await moveVerticalAction(v.id, "up"); router.refresh(); })} title="Move up"><ArrowUp className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(async () => { await moveVerticalAction(v.id, "down"); router.refresh(); })} title="Move down"><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} title="Edit"><Edit2 className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" disabled={pending} title="Toggle active"
          onClick={() => startTransition(async () => { await toggleVerticalActiveAction(v.id); router.refresh(); })}
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" disabled={pending || v.taskCount > 0} title="Delete"
          onClick={() => {
            if (!confirm(`Delete vertical "${v.name}"? This cannot be undone.`)) return;
            startTransition(async () => { await deleteVerticalAction(v.id); router.refresh(); });
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
