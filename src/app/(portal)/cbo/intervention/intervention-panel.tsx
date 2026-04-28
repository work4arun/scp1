"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pin, Clock, Check, AlertCircle, Info, MessageSquare } from "lucide-react";
import { resolveInterventionRichAction, snoozeInterventionAction, setInterventionCboNoteAction, togglePinAction } from "../actions";

const TEMPLATES = [
  { type: "approve", label: "Approve as proposed", icon: Check, defaultNote: "Approved. Proceed as planned and report at next review.", variant: "success" as const },
  { type: "approve_with_caveat", label: "Approve with conditions", icon: Check, defaultNote: "Approved subject to: [conditions]. Confirm before execution.", variant: "info" as const },
  { type: "need_info", label: "Need more information", icon: Info, defaultNote: "Need more data before deciding. Please share: [specifics].", variant: "warning" as const },
  { type: "defer", label: "Defer to later review", icon: Clock, defaultNote: "Defer to next review window. Park status until then.", variant: "muted" as const },
  { type: "reject", label: "Do not proceed", icon: AlertCircle, defaultNote: "Do not proceed. Strategic priority lies elsewhere right now.", variant: "destructive" as const },
];

export function InterventionPanel({
  id, issue, whyNeeded, decisionRequired, noteAttached, cboNote, vertical, raisedBy, createdAt, pinned,
}: {
  id: string; issue: string; whyNeeded: string; decisionRequired: string;
  noteAttached: boolean; cboNote: string | null; vertical: string; raisedBy: string; createdAt: string; pinned: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<null | "decide" | "snooze" | "note">(null);
  const [decisionType, setDecisionType] = useState(TEMPLATES[0].type);
  const [resolutionNote, setResolutionNote] = useState(TEMPLATES[0].defaultNote);
  const [noteValue, setNoteValue] = useState(cboNote || "");

  const pickTemplate = (type: string) => {
    const t = TEMPLATES.find((x) => x.type === type);
    if (!t) return;
    setDecisionType(t.type);
    setResolutionNote(t.defaultNote);
  };

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{issue}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {vertical} · raised by {raisedBy} · {new Date(createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {noteAttached && <Badge variant="info">Note attached</Badge>}
            {cboNote && <Badge variant="muted">Your note</Badge>}
            <Badge variant="warning">Decide</Badge>
            <button
              onClick={() => startTransition(async () => { await togglePinAction("intervention", id); router.refresh(); })}
              className={`grid h-6 w-6 place-items-center rounded-md border ${pinned ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
              aria-label={pinned ? "Unpin" : "Pin"}
              disabled={pending}
              title={pinned ? "Unpin" : "Pin to dashboard"}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Block label="Why you" value={whyNeeded} />
        <Block label="Decision required" value={decisionRequired} />
      </div>

      {cboNote && (
        <div className="mt-3 rounded-md bg-accent/50 border border-accent p-2.5 text-xs">
          <span className="font-bold text-accent-foreground">Your note for SM:</span>{" "}
          <span className="text-foreground">{cboNote}</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="default" onClick={() => setOpen("decide")} disabled={pending}>
          <Check className="h-4 w-4" /> Decide
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen("snooze")} disabled={pending}>
          <Clock className="h-4 w-4" /> Snooze
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen("note")} disabled={pending}>
          <MessageSquare className="h-4 w-4" /> {cboNote ? "Edit note" : "Drop note"}
        </Button>
      </div>

      {open === "decide" && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-accent/30 p-3 space-y-3">
          <div className="text-xs font-bold uppercase text-primary">Quick decision</div>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              const isActive = decisionType === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => pickTemplate(t.type)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <Label>Resolution note</Label>
            <Textarea value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(null)} disabled={pending}>Cancel</Button>
            <Button size="sm" disabled={pending} onClick={() => startTransition(async () => {
              await resolveInterventionRichAction(id, decisionType, resolutionNote);
              setOpen(null);
              router.refresh();
            })}>{pending ? "Saving…" : "Resolve"}</Button>
          </div>
        </div>
      )}

      {open === "snooze" && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <div className="text-xs font-bold uppercase text-warning mb-2">Snooze until</div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { h: 4, label: "4 hours" },
              { h: 12, label: "Tomorrow morning" },
              { h: 24, label: "Tomorrow" },
              { h: 24 * 3, label: "3 days" },
              { h: 24 * 7, label: "Next week" },
            ].map((opt) => (
              <Button
                key={opt.h}
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => startTransition(async () => {
                  await snoozeInterventionAction(id, opt.h);
                  setOpen(null);
                  router.refresh();
                })}
              >
                {opt.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {open === "note" && (
        <div className="mt-4 rounded-lg border border-muted bg-muted/30 p-3 space-y-3">
          <div className="text-xs font-bold uppercase text-muted-foreground">Private note for SM</div>
          <p className="text-xs text-muted-foreground">Not an escalation resolution — just a quick comment back to the SM. Visible only to them.</p>
          <Textarea value={noteValue} onChange={(e) => setNoteValue(e.target.value)} placeholder="e.g. Need this info by tomorrow EOD." />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(null)} disabled={pending}>Cancel</Button>
            <Button size="sm" disabled={pending} onClick={() => startTransition(async () => {
              await setInterventionCboNoteAction(id, noteValue);
              setOpen(null);
              router.refresh();
            })}>{pending ? "Saving…" : "Save note"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
