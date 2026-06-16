"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/delete-dialog";
import {
  upsertTeamAction,
  deleteTeamAction,
  toggleTeamActiveAction,
  addMemberAction,
  updateMemberAction,
  removeMemberAction,
} from "./actions";
import { Trash2, Edit2, X, Plus, Users, Save } from "lucide-react";

// ────────── Team Form ──────────
export function TeamForm({
  initial,
}: {
  initial?: { id?: string; name?: string; description?: string | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    startTransition(async () => {
      const result = await upsertTeamAction(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!initial?.id) try { formEl.reset(); } catch {}
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="teamName">Team name</Label>
        <Input id="teamName" name="name" required placeholder="Marketing" defaultValue={initial?.name} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="teamDesc">Description</Label>
        <Input id="teamDesc" name="description" placeholder="Optional purpose" defaultValue={initial?.description || ""} />
      </div>
      {error && (
        <div className="sm:col-span-4 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="sm:col-span-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial?.id ? "Update team" : "Add team"}
        </Button>
      </div>
    </form>
  );
}

// ────────── Team Row ──────────
export function TeamRow({
  team,
}: {
  team: {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    memberCount: number;
    taskCount: number;
    members: { id: string; name: string; email: string; designation: string | null; sortOrder: number }[];
  };
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/40 bg-accent/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Edit team</div>
          <button onClick={() => setEditing(false)} className="rounded-md p-1 hover:bg-card">
            <X className="h-4 w-4" />
          </button>
        </div>
        <TeamForm initial={team} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{team.name}</div>
          <div className="text-xs text-muted-foreground">
            {team.description || "—"} · {team.memberCount} member(s) · {team.taskCount} task(s)
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <Badge variant={team.active ? "success" : "muted"}>{team.active ? "Active" : "Hidden"}</Badge>
          <Button
            variant="ghost" size="sm"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Hide members" : "Show members"}
          >
            <Users className="h-4 w-4" /> {team.memberCount}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} title="Edit">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="sm" disabled={pending} title="Toggle active"
            onClick={() => startTransition(async () => {
              const r = await toggleTeamActiveAction(team.id);
              if (!r.success) { alert(r.error); return; }
              router.refresh();
            })}
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} title="Delete" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <DeleteConfirmDialog
            open={deleteOpen}
            itemName={team.name}
            itemType="team"
            itemDesc={
              team.memberCount > 0 || team.taskCount > 0
                ? `This team has ${team.memberCount} member(s) and ${team.taskCount} task(s). Deleting it will remove all members and unlink all tasks.`
                : undefined
            }
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => {
              setDeleteOpen(false);
              startTransition(async () => {
                const r = await deleteTeamAction(team.id);
                if (!r.success) { alert(r.error); return; }
                router.refresh();
              });
            }}
          />
        </div>
      </div>

      {/* Members section */}
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Members</div>
            <AddMemberForm teamId={team.id} />
          </div>
          {team.members.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">No members yet.</div>
          ) : (
            <div className="space-y-1.5">
              {team.members.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────── Add Member Inline ──────────
function AddMemberForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3" /> Add
      </Button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    form.set("teamId", teamId);
    startTransition(async () => {
      const result = await addMemberAction(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formEl.reset();
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input name="name" placeholder="Name" required className="h-8 w-28 text-xs" />
      <Input name="email" type="email" placeholder="Email" required className="h-8 w-36 text-xs" />
      <Input name="designation" placeholder="Role" className="h-8 w-24 text-xs" />
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button type="submit" size="sm" disabled={pending} className="h-8 text-xs">
        {pending ? "…" : "Save"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8 text-xs">
        <X className="h-3 w-3" />
      </Button>
    </form>
  );
}

// ────────── Member Row ──────────
function MemberRow({
  member,
}: {
  member: { id: string; name: string; email: string; designation: string | null };
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <EditMemberForm
        member={member}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="flex items-center justify-between rounded border border-border px-2.5 py-1.5">
      <div className="min-w-0 flex items-center gap-2 text-sm">
        <span className="font-medium truncate">{member.name}</span>
        <span className="text-xs text-muted-foreground truncate">{member.email}</span>
        {member.designation && (
          <Badge variant="muted" className="text-[10px]">{member.designation}</Badge>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost" size="sm" disabled={pending}
          onClick={() => startTransition(async () => {
            if (!confirm(`Remove ${member.name}?`)) return;
            const r = await removeMemberAction(member.id);
            if (!r.success) { alert(r.error); return; }
            router.refresh();
          })}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ────────── Edit Member Inline ──────────
function EditMemberForm({
  member,
  onCancel,
  onSaved,
}: {
  member: { id: string; name: string; email: string; designation: string | null };
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("id", member.id);
    startTransition(async () => {
      const result = await updateMemberAction(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input name="name" defaultValue={member.name} required className="h-8 w-28 text-xs" />
      <Input name="email" type="email" defaultValue={member.email} required className="h-8 w-36 text-xs" />
      <Input name="designation" defaultValue={member.designation || ""} className="h-8 w-24 text-xs" />
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button type="submit" size="sm" disabled={pending} className="h-8 text-xs">
        {pending ? "…" : "Save"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">
        <X className="h-3 w-3" />
      </Button>
    </form>
  );
}