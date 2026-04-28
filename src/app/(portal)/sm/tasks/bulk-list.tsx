"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { formatRelative } from "@/lib/utils";
import { CheckSquare, Square, Trash2, X } from "lucide-react";
import { bulkUpdateAction } from "./[id]/edit/actions";
import type { TaskStatus } from "@prisma/client";

type Row = {
  id: string;
  code: string;
  title: string;
  vertical: string;
  subVertical: string | null;
  ownerRole: string | null;
  priority: string;
  status: TaskStatus;
  updatedAt: string;
};

export function BulkTaskList({ tasks, ownerRoles }: { tasks: Row[]; ownerRoles: { id: string; name: string }[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkOwner, setBulkOwner] = useState<string>("");
  const router = useRouter();

  const allSelected = useMemo(() => tasks.length > 0 && selected.size === tasks.length, [selected, tasks]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(tasks.map((t) => t.id)));
  };

  async function applyStatus() {
    if (!bulkStatus || selected.size === 0) return;
    startTransition(async () => {
      await bulkUpdateAction(Array.from(selected), { status: bulkStatus as TaskStatus });
      setSelected(new Set()); setBulkStatus("");
      router.refresh();
    });
  }
  async function applyOwner() {
    if (selected.size === 0 || !bulkOwner) return;
    const ownerRoleId = bulkOwner === "__unassign__" ? null : bulkOwner;
    startTransition(async () => {
      await bulkUpdateAction(Array.from(selected), { ownerRoleId });
      setSelected(new Set()); setBulkOwner("");
      router.refresh();
    });
  }
  async function applyDrop() {
    if (selected.size === 0) return;
    if (!confirm(`Drop ${selected.size} task(s)? They can be restored within 30 days.`)) return;
    startTransition(async () => {
      try {
        await bulkUpdateAction(Array.from(selected), { action: "drop" });
        setSelected(new Set());
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  }

  return (
    <>
      {/* Select-all bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
        <button onClick={toggleAll} className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          {allSelected ? "Unselect all" : `Select all (${tasks.length})`}
        </button>
        {selected.size > 0 ? (
          <span className="text-xs font-medium text-primary">{selected.size} selected</span>
        ) : (
          <span className="text-xs text-muted-foreground">Tap a card to select for bulk actions</span>
        )}
      </div>

      <div className="space-y-2 mt-3">
        {tasks.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No tasks match your filters.</CardContent></Card>
        ) : (
          tasks.map((t) => {
            const checked = selected.has(t.id);
            return (
              <Card key={t.id} className={checked ? "border-primary/60 ring-2 ring-primary/20" : "hover:border-primary/40 transition-colors"}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggle(t.id)}
                      className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border hover:bg-accent"
                      aria-label={checked ? "Unselect" : "Select"}
                    >
                      {checked ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <Link href={`/sm/tasks/${t.id}`} className="flex-1 min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">{t.code}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] font-medium text-muted-foreground">{t.vertical}</span>
                            {t.subVertical ? (
                              <>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] font-medium text-muted-foreground">{t.subVertical}</span>
                              </>
                            ) : null}
                          </div>
                          <div className="text-sm font-semibold">{t.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Owner: {t.ownerRole || "Unassigned"} · updated {formatRelative(t.updatedAt)}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <PriorityBadge code={t.priority} />
                          <StatusBadge status={t.status} />
                        </div>
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Sticky bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-3 lg:bottom-6 lg:left-[260px]">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card shadow-2xl p-3 backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{selected.size} selected</span>
                <button onClick={() => setSelected(new Set())} className="rounded-md p-1 hover:bg-accent" aria-label="Clear selection">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="h-9 text-xs">
                  <option value="">Set status…</option>
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_FOR_INPUT">Waiting Input</option>
                  <option value="WAITING_FOR_APPROVAL">Waiting Approval</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PARKED">Parked</option>
                </Select>
                <Button size="sm" disabled={pending || !bulkStatus} onClick={applyStatus}>Apply</Button>
                <Select value={bulkOwner} onChange={(e) => setBulkOwner(e.target.value)} className="h-9 text-xs">
                  <option value="">Reassign to…</option>
                  <option value="__unassign__">— Unassigned —</option>
                  {ownerRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
                <Button size="sm" variant="outline" disabled={pending || !bulkOwner} onClick={applyOwner}>Apply</Button>
                <Button size="sm" variant="destructive" disabled={pending} onClick={applyDrop}>
                  <Trash2 className="h-4 w-4" /> Drop
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
