"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, X } from "lucide-react";
import { upsertSubVerticalAction, deleteSubVerticalAction } from "./actions";

type Vertical = { id: string; name: string };

export function SubVerticalForm({ verticals, initial }: { verticals: Vertical[]; initial?: { id?: string; verticalId?: string; name?: string; sortOrder?: number } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    startTransition(async () => {
      const result = await upsertSubVerticalAction(form);
      if (!result.success) { setError(result.error); return; }
      if (!initial?.id) try { formEl.reset(); } catch {}
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="verticalId">Vertical</Label>
        <Select id="verticalId" name="verticalId" required defaultValue={initial?.verticalId || verticals[0]?.id}>
          {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-3">
        <Label htmlFor="name">Sub-vertical name</Label>
        <Input id="name" name="name" required placeholder="Physical Marketing" defaultValue={initial?.name} />
      </div>
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="sortOrder">Order</Label>
        <Input id="sortOrder" name="sortOrder" type="number" defaultValue={initial?.sortOrder ?? 0} />
      </div>
      {error && (
        <div className="sm:col-span-6 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="sm:col-span-6 flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial?.id ? "Update" : "Add sub-vertical"}</Button>
      </div>
    </form>
  );
}

export function SubVerticalRow({
  s,
  verticals,
}: {
  s: { id: string; name: string; sortOrder: number; active: boolean; verticalId: string; taskCount: number };
  verticals: Vertical[];
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/40 bg-accent/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Edit sub-vertical</div>
          <button onClick={() => setEditing(false)} className="rounded-md p-1 hover:bg-card"><X className="h-4 w-4" /></button>
        </div>
        <SubVerticalForm verticals={verticals} initial={s} />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{s.name}</div>
        <div className="text-xs text-muted-foreground">{s.taskCount} tasks</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant={s.active ? "success" : "muted"}>{s.active ? "Active" : "Hidden"}</Badge>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4" /></Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || s.taskCount > 0}
          onClick={() => {
            if (!confirm(`Delete sub-vertical "${s.name}"?`)) return;
            startTransition(async () => {
              const result = await deleteSubVerticalAction(s.id);
              if (!result.success) { alert(result.error); return; }
              router.refresh();
            });
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
