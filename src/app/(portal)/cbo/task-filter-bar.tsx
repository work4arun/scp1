"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function TaskFilterBar({
  active,
  basePath,
  options,
}: {
  active: Record<string, string | undefined>;
  basePath: string;
  options: {
    verticals: { id: string; code: string; name: string }[];
    priorities: { id: string; code: string; label: string }[];
    teams: { id: string; name: string }[];
  };
}) {
  const router = useRouter();
  const [q, setQ] = useState(active.q || "");

  function apply(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) { if (v) sp.set(k, v); }
    router.push(`${basePath}?${sp.toString()}`);
  }

  function clearAll() { router.push(basePath); }

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">Vertical</label>
        <Select name="vertical" defaultValue={active.vertical || ""} onChange={(e) => apply({ ...active, vertical: e.target.value || undefined })} className="h-8 text-xs">
          <option value="">All</option>
          {options.verticals.map((v) => <option key={v.id} value={v.id}>{v.code}: {v.name}</option>)}
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">Priority</label>
        <Select name="priority" defaultValue={active.priority || ""} onChange={(e) => apply({ ...active, priority: e.target.value || undefined })} className="h-8 text-xs">
          <option value="">All</option>
          {options.priorities.map((p) => <option key={p.id} value={p.id}>{p.code}: {p.label}</option>)}
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">Team</label>
        <Select name="team" defaultValue={active.team || ""} onChange={(e) => apply({ ...active, team: e.target.value || undefined })} className="h-8 text-xs">
          <option value="">All</option>
          {options.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">Status</label>
        <Select name="status" defaultValue={active.status || ""} onChange={(e) => apply({ ...active, status: e.target.value || undefined })} className="h-8 text-xs">
          <option value="">All</option>
          <option value="NOT_STARTED">Not Started</option><option value="IN_PROGRESS">In Progress</option><option value="WAITING_FOR_INPUT">Waiting for Input</option><option value="WAITING_FOR_APPROVAL">Waiting for Approval</option><option value="DELAYED">Delayed</option><option value="COMPLETED">Completed</option>
        </Select>
      </div>
      <div className="space-y-1 flex-1 min-w-[150px]">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">Search</label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply({ ...active, q: q || undefined })} placeholder="Search title..." className="h-8 text-xs" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">Deadline From</label>
        <Input type="date" value={active.deadlineFrom || ""} onChange={(e) => apply({ ...active, deadlineFrom: e.target.value || undefined })} className="h-8 text-xs w-36" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">Deadline To</label>
        <Input type="date" value={active.deadlineTo || ""} onChange={(e) => apply({ ...active, deadlineTo: e.target.value || undefined })} className="h-8 text-xs w-36" />
      </div>
      <Button variant="outline" size="sm" onClick={clearAll} className="h-8 text-xs">Clear</Button>
    </div>
  );
}