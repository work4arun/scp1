"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, X, CalendarClock, Repeat, MapPin, FileText, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { setAppointmentStatusAction, recordAppointmentOutcomeAction, cancelRecurringAction } from "./actions";

type Appt = {
  id: string;
  title: string;
  startAtIso: string;
  endAtIso: string;
  status: string;
  location: string | null;
  recurrence: string;
  description: string | null;
  organizerName: string;
  attendeeName: string;
  interventionId: string | null;
  interventionIssue: string | null;
};

export function AppointmentRow({ appt, viewerRole }: { appt: Appt; viewerRole: "cbo" | "sm" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAgenda, setShowAgenda] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [showOutcome, setShowOutcome] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = new Date(appt.startAtIso);
  const end = new Date(appt.endAtIso);
  const dateStr = start.toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const statusVariant: Record<string, "warning" | "success" | "destructive" | "muted"> = {
    PENDING: "warning",
    CONFIRMED: "success",
    REJECTED: "destructive",
    CANCELLED: "muted",
    COMPLETED: "muted",
  };

  return (
    <div className="rounded-xl border border-border p-4">
      {error ? (
        <div className="mb-2 rounded-md bg-destructive/10 text-destructive px-3 py-2 text-xs font-medium">
          {error}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusVariant[appt.status]}>{appt.status}</Badge>
            {appt.recurrence !== "NONE" ? <Badge variant="info"><Repeat className="h-3 w-3" /> {appt.recurrence}</Badge> : null}
            {appt.interventionId ? <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> Linked to escalation</Badge> : null}
          </div>
          <div className="text-sm font-semibold mt-1">{appt.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <CalendarClock className="h-3 w-3" /> {dateStr} – {endTime}
            {appt.location ? <> · <MapPin className="h-3 w-3" /> {appt.location}</> : null}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {viewerRole === "cbo" ? `Requested by ${appt.organizerName}` : `With ${appt.attendeeName}`}
          </div>
          {appt.interventionIssue && (
            <div className="mt-2 rounded-md bg-warning/10 border border-warning/20 p-2 text-xs">
              <span className="font-bold">Escalation:</span> {appt.interventionIssue}
            </div>
          )}
          {appt.description && (
            <button
              type="button"
              onClick={() => setShowAgenda((s) => !s)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-semibold"
            >
              <FileText className="h-3 w-3" /> {showAgenda ? "Hide" : "Show"} agenda {showAgenda ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
          {showAgenda && appt.description && (
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">{appt.description}</pre>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {viewerRole === "cbo" && appt.status === "PENDING" && (
            <>
              <Button size="sm" disabled={pending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const r = await setAppointmentStatusAction(appt.id, "CONFIRMED");
                    if (!r.success) { setError(r.error); return; }
                    router.refresh();
                  });
                }}
              ><Check className="h-4 w-4" /> Accept</Button>
              <Button size="sm" variant="outline" disabled={pending}
                onClick={() => {
                  const reason = prompt("Reason for declining (optional)?") || undefined;
                  setError(null);
                  startTransition(async () => {
                    const r = await setAppointmentStatusAction(appt.id, "REJECTED", reason);
                    if (!r.success) { setError(r.error); return; }
                    router.refresh();
                  });
                }}
              ><X className="h-4 w-4" /> Decline</Button>
            </>
          )}
          {appt.status === "CONFIRMED" && new Date(appt.endAtIso) < new Date() && viewerRole === "cbo" && (
            <Button size="sm" variant="outline" onClick={() => setShowOutcome((s) => !s)}>
              {showOutcome ? "Cancel" : "Record outcome"}
            </Button>
          )}
          {(appt.status === "PENDING" || appt.status === "CONFIRMED") && (
            <Button size="sm" variant="ghost" disabled={pending}
              onClick={() => {
                const reason = prompt("Reason for cancelling (optional)?") || undefined;
                if (appt.recurrence !== "NONE" && !confirm("This is a recurring meeting. Cancelling will end the series.")) return;
                setError(null);
                startTransition(async () => {
                  const r = appt.recurrence !== "NONE"
                    ? await cancelRecurringAction(appt.id)
                    : await setAppointmentStatusAction(appt.id, "CANCELLED", reason);
                  if (!r.success) { setError(r.error); return; }
                  router.refresh();
                });
              }}
            >Cancel</Button>
          )}
        </div>
      </div>

      {showOutcome && (
        <div className="mt-4 rounded-lg border border-success/20 bg-success/5 p-3 space-y-2">
          <Label htmlFor={`outcome-${appt.id}`}>Outcome / decision taken</Label>
          <Textarea id={`outcome-${appt.id}`} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What was decided?" />
          {appt.interventionId ? (
            <p className="text-xs text-muted-foreground">
              ✓ This will auto-resolve the linked escalation with this outcome.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowOutcome(false)} disabled={pending}>Cancel</Button>
            <Button size="sm" disabled={pending || !outcome.trim()}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const r = await recordAppointmentOutcomeAction(appt.id, outcome.trim(), !!appt.interventionId);
                  if (!r.success) { setError(r.error); return; }
                  setShowOutcome(false);
                  router.refresh();
                });
              }}
            >Save outcome</Button>
          </div>
        </div>
      )}
    </div>
  );
}
