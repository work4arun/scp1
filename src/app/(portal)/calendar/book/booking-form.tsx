"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { bookAppointmentAction } from "../actions";

type Day = { dateIso: string; slots: { startIso: string; endIso: string }[] };

export function BookingForm({
  cboId, cboName, availableDays, interventionId, interventionPrefill, interventionDecisionContext, taskId, taskTitle,
}: {
  cboId: string; cboName: string; availableDays: Day[]; interventionId: string | null;
  interventionPrefill: string | null; interventionDecisionContext: string | null;
  taskId: string | null; taskTitle: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<{ start: string; end: string } | null>(null);
  const [customMode, setCustomMode] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!picked && !customMode) { alert("Pick a slot or propose a custom time."); return; }
    const f = new FormData(e.currentTarget);

    if (picked) {
      f.set("startAt", picked.start);
      f.set("endAt", picked.end);
    } else {
      const dateStr = String(f.get("customDate") || "");
      const timeStr = String(f.get("customTime") || "");
      const durationMin = Number(f.get("durationMin") || 30);
      if (!dateStr || !timeStr) { alert("Date and time required."); return; }
      const start = new Date(`${dateStr}T${timeStr}:00`);
      const end = new Date(start.getTime() + durationMin * 60_000);
      f.set("startAt", start.toISOString());
      f.set("endAt", end.toISOString());
    }
    f.set("attendeeId", cboId);

    startTransition(async () => {
      try {
        await bookAppointmentAction(f);
        router.push("/calendar");
        router.refresh();
      } catch (err) { alert((err as Error).message); }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {interventionPrefill && (
        <div className="rounded-md bg-warning/10 border border-warning/30 p-3 text-xs">
          <span className="font-bold">Linked to escalation:</span> {interventionPrefill.replace(/^Re: /, "")}
          {interventionDecisionContext ? <div className="mt-1">{interventionDecisionContext}</div> : null}
        </div>
      )}
      {taskTitle && (
        <div className="rounded-md bg-info/10 border border-info/30 p-3 text-xs">
          <span className="font-bold">About task:</span> {taskTitle}
        </div>
      )}
      {interventionId ? <input type="hidden" name="interventionId" value={interventionId} /> : null}
      {taskId ? <input type="hidden" name="taskId" value={taskId} /> : null}

      {/* Slot picker */}
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Suggested open slots ({cboName}'s availability, next 5 days)</div>
        {availableDays.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
            No open slots in the next 5 days. Propose a custom time below.
          </div>
        ) : (
          <div className="space-y-3">
            {availableDays.map((d) => (
              <div key={d.dateIso}>
                <div className="text-xs font-bold mb-1.5">
                  {new Date(d.dateIso).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short" })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.slots.map((s) => {
                    const active = picked?.start === s.startIso;
                    const time = new Date(s.startIso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <button
                        type="button"
                        key={s.startIso}
                        onClick={() => { setPicked({ start: s.startIso, end: s.endIso }); setCustomMode(false); }}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"
                        }`}
                      >
                        <CalendarClock className="h-3 w-3" /> {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <button type="button" onClick={() => { setCustomMode((m) => !m); setPicked(null); }} className="text-xs font-semibold text-primary">
            {customMode ? "← Pick from suggested slots" : "Propose a custom time →"}
          </button>
        </div>
      </div>

      {customMode && (
        <div className="rounded-lg border border-dashed border-border p-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="customDate">Date</Label>
            <Input id="customDate" name="customDate" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customTime">Start time</Label>
            <Input id="customTime" name="customTime" type="time" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="durationMin">Duration</Label>
            <Select id="durationMin" name="durationMin" defaultValue="30">
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hour</option>
            </Select>
          </div>
        </div>
      )}

      {picked && !customMode && (
        <div className="rounded-md bg-accent/40 border border-accent p-3 text-xs">
          <Badge variant="info">Selected</Badge>{" "}
          {new Date(picked.start).toLocaleString("en-IN", { weekday: "long", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          {" – "}
          {new Date(picked.end).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {/* Title + description */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={interventionPrefill || ""} placeholder="What's this about?" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="Office / Online / WhatsApp" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agenda">Agenda (one item per line)</Label>
          <Textarea id="agenda" name="agenda" placeholder={"1. Context\n2. Decision needed\n3. Next step"} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Notes for Dr. BN</Label>
        <Textarea id="description" name="description" placeholder="Any context they should know before the meeting." />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Sending request…" : "Request meeting"}</Button>
      </div>
    </form>
  );
}
