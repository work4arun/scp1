"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, X } from "lucide-react";
import { upsertOwnerRoleAction, deleteOwnerRoleAction } from "./actions";

export function OwnerRoleForm({ initial }: { initial?: { id?: string; name?: string; description?: string | null } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await upsertOwnerRoleAction(form);
      if (!initial?.id) (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="name">Role name</Label>
        <Input id="name" name="name" required placeholder="Marketing Head" defaultValue={initial?.name} />
      </div>
      <div className="space-y-1.5 sm:col-span-4">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="What does this role own?" defaultValue={initial?.description || ""} />
      </div>
      <div className="sm:col-span-6 flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial?.id ? "Update" : "Add role"}</Button>
      </div>
    </form>
  );
}

export function OwnerRoleRow({
  r,
}: {
  r: { id: string; name: string; description: string | null; active: boolean; taskCount: number; userCount: number };
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/40 bg-accent/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Edit role</div>
          <button onClick={() => setEditing(false)} className="rounded-md p-1 hover:bg-card"><X className="h-4 w-4" /></button>
        </div>
        <OwnerRoleForm initial={r} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{r.name}</div>
        <div className="text-xs text-muted-foreground">
          {r.taskCount} tasks · {r.userCount} users
          {r.description ? ` · ${r.description}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant={r.active ? "success" : "muted"}>{r.active ? "Active" : "Hidden"}</Badge>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4" /></Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || r.taskCount > 0 || r.userCount > 0}
          onClick={() => {
            if (!confirm(`Delete role "${r.name}"?`)) return;
            startTransition(async () => { await deleteOwnerRoleAction(r.id); router.refresh(); });
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
