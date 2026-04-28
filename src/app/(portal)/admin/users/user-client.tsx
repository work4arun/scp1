"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, X, Power, Key, Copy, Check } from "lucide-react";
import type { SystemRole } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/rbac";
import { upsertUserAction, deleteUserAction, toggleUserActiveAction } from "./actions";
import { generateTempPasswordAction } from "../actions";

type OwnerRole = { id: string; name: string };

export function UserForm({ ownerRoles, initial }: { ownerRoles: OwnerRole[]; initial?: { id?: string; name?: string; email?: string; systemRole?: SystemRole; ownerRoleId?: string | null } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await upsertUserAction(form);
      if (!initial?.id) (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required defaultValue={initial?.name} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required defaultValue={initial?.email} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="password">{initial?.id ? "New password (optional)" : "Password"}</Label>
        <Input id="password" name="password" type="password" minLength={6} required={!initial?.id} placeholder={initial?.id ? "Leave blank to keep" : "Min 6 characters"} />
      </div>
      <div className="space-y-1.5 sm:col-span-3">
        <Label htmlFor="systemRole">System role</Label>
        <Select id="systemRole" name="systemRole" required defaultValue={initial?.systemRole || "SM"}>
          <option value="SUPER_ADMIN">{ROLE_LABELS.SUPER_ADMIN}</option>
          <option value="CBO">{ROLE_LABELS.CBO}</option>
          <option value="SM">{ROLE_LABELS.SM}</option>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-3">
        <Label htmlFor="ownerRoleId">Owner role (optional)</Label>
        <Select id="ownerRoleId" name="ownerRoleId" defaultValue={initial?.ownerRoleId || ""}>
          <option value="">— None —</option>
          {ownerRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      </div>
      <div className="sm:col-span-6 flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial?.id ? "Update user" : "Add user"}</Button>
      </div>
    </form>
  );
}

export function UserRow({
  u,
  ownerRoles,
}: {
  u: { id: string; name: string; email: string; systemRole: SystemRole; ownerRole: string | null; active: boolean };
  ownerRoles: OwnerRole[];
}) {
  const [editing, setEditing] = useState(false);
  const [tempShown, setTempShown] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/40 bg-accent/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Edit user</div>
          <button onClick={() => setEditing(false)} className="rounded-md p-1 hover:bg-card"><X className="h-4 w-4" /></button>
        </div>
        <UserForm
          ownerRoles={ownerRoles}
          initial={{
            id: u.id,
            name: u.name,
            email: u.email,
            systemRole: u.systemRole,
            ownerRoleId: ownerRoles.find((r) => r.name === u.ownerRole)?.id || null,
          }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{u.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {u.email} · {ROLE_LABELS[u.systemRole]}{u.ownerRole ? ` · ${u.ownerRole}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <Badge variant={u.active ? "success" : "muted"}>{u.active ? "Active" : "Disabled"}</Badge>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} title="Edit"><Edit2 className="h-4 w-4" /></Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            title="Generate temp password"
            onClick={() => {
              if (!confirm(`Generate a temporary password for ${u.email}? Their old password will be replaced.`)) return;
              startTransition(async () => {
                const temp = await generateTempPasswordAction(u.id);
                setTempShown(temp);
              });
            }}
          >
            <Key className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} title="Toggle active"
            onClick={() => startTransition(async () => { await toggleUserActiveAction(u.id); router.refresh(); })}
          >
            <Power className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} title="Delete"
            onClick={() => {
              if (!confirm(`Delete user "${u.name}"?`)) return;
              startTransition(async () => { await deleteUserAction(u.id); router.refresh(); });
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {tempShown && (
        <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-bold text-warning">⚠️ Temp password (one-time view):</span>{" "}
              <code className="rounded bg-background px-2 py-1 font-mono text-foreground">{tempShown}</code>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(tempShown); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
                }}
              >
                {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTempShown(null)}><X className="h-3 w-3" /></Button>
            </div>
          </div>
          <p className="mt-2 text-muted-foreground">Share with the user securely. They should change it immediately after first login.</p>
        </div>
      )}
    </div>
  );
}
