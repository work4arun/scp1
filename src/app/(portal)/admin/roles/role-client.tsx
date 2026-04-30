"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, X, UserPlus, Mail, UserMinus } from "lucide-react";
import {
  upsertOwnerRoleAction,
  deleteOwnerRoleAction,
  setRoleOwnerContactAction,
  clearRoleOwnerContactAction,
  type SetOwnerContactResult,
} from "./actions";

// ─────────────────────────────────────────────────────────────────────────────
//  Form to create / edit an OwnerRole.
// ─────────────────────────────────────────────────────────────────────────────

export function OwnerRoleForm({ initial }: { initial?: { id?: string; name?: string; description?: string | null } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertOwnerRoleAction(form);
      if (res && !res.ok) {
        setError(res.error || "An error occurred.");
      } else {
        if (!initial?.id) (e.target as HTMLFormElement).reset();
        router.refresh();
      }
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
      {error && (
        <div className="sm:col-span-6 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="sm:col-span-6 flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial?.id ? "Update" : "Add role"}</Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Role row — name + counts + owner contact (just name + email, no login).
// ─────────────────────────────────────────────────────────────────────────────

export function OwnerRoleRow({
  r,
}: {
  r: {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    taskCount: number;
    ownerName: string | null;
    ownerEmail: string | null;
  };
}) {
  const [editing, setEditing] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
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

  const hasContact = !!(r.ownerName || r.ownerEmail);

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      {/* Top — role name, counts, badges, edit/delete */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{r.name}</div>
          <div className="text-xs text-muted-foreground">
            {r.taskCount} task{r.taskCount === 1 ? "" : "s"}
            {r.description ? ` · ${r.description}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={r.active ? "success" : "muted"}>{r.active ? "Active" : "Hidden"}</Badge>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label="Edit role"><Edit2 className="h-4 w-4" /></Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || r.taskCount > 0}
            onClick={() => {
              if (!confirm(`Delete role "${r.name}"?`)) return;
              startTransition(async () => { 
                const res = await deleteOwnerRoleAction(r.id);
                if (res && !res.ok) alert(res.error);
                else router.refresh(); 
              });
            }}
            aria-label="Delete role"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Owner contact — name + email, NO login. Used for notifications. */}
      <div className="rounded-md border border-border/70 bg-muted/30 p-2.5">
        {hasContact ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{r.ownerName || "—"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.ownerEmail || "no email on file"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setEditingContact(true)} disabled={pending}>
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Clear the owner contact for "${r.name}"?\n\nThis just removes the name + email — it does not affect any logins.`)) return;
                  startTransition(async () => { await clearRoleOwnerContactAction(r.id); router.refresh(); });
                }}
                aria-label="Clear owner contact"
              >
                <UserMinus className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">No owner contact recorded.</div>
            <Button size="sm" onClick={() => setEditingContact(true)}>
              <UserPlus className="h-4 w-4" /> Add owner contact
            </Button>
          </div>
        )}

        {editingContact && (
          <ContactForm
            roleId={r.id}
            roleName={r.name}
            initialName={r.ownerName}
            initialEmail={r.ownerEmail}
            onClose={() => setEditingContact(false)}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Inline contact form: just name + email. No login, no password, no system role.
// ─────────────────────────────────────────────────────────────────────────────

function ContactForm({
  roleId,
  roleName,
  initialName,
  initialEmail,
  onClose,
}: {
  roleId: string;
  roleName: string;
  initialName: string | null;
  initialEmail: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("ownerName", name);
    fd.set("ownerEmail", email);
    startTransition(async () => {
      const res: SetOwnerContactResult = await setRoleOwnerContactAction(roleId, fd);
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid grid-cols-1 gap-3 rounded-md border border-border bg-background p-3 sm:grid-cols-6">
      <div className="sm:col-span-6 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          {initialName || initialEmail ? `Edit owner contact for ${roleName}` : `Add owner contact for ${roleName}`}
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent" aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <Label htmlFor={`owner-name-${roleId}`}>Owner name</Label>
        <Input
          id={`owner-name-${roleId}`}
          type="text"
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <Label htmlFor={`owner-email-${roleId}`}>Email for communication</Label>
        <Input
          id={`owner-email-${roleId}`}
          type="email"
          placeholder="owner@rathinam.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="sm:col-span-6 text-xs text-muted-foreground">
        This is a contact record — used for task-notification emails. It does <em>not</em> create a login. Logins
        (SM, CBO, Super Admin) are managed at <code className="rounded bg-muted px-1 py-0.5 font-mono">/admin/users</code>.
      </div>

      {error && (
        <div className="sm:col-span-6 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="sm:col-span-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save contact"}</Button>
      </div>
    </form>
  );
}
