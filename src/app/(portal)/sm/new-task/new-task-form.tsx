"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { createTaskAction } from "./actions";

type Vertical  = { id: string; code: string; name: string };
type SubVertical = { id: string; name: string; verticalId: string };
type Priority  = { id: string; code: string; label: string };
type OwnerRole = { id: string; name: string };

export function NewTaskForm({
  verticals,
  subVerticals,
  priorities,
  ownerRoles,
}: {
  verticals: Vertical[];
  subVerticals: SubVertical[];
  priorities: Priority[];
  ownerRoles: OwnerRole[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [verticalId, setVerticalId] = useState(verticals[0]?.id || "");
  const [error, setError] = useState<string | null>(null);

  const filteredSubs = useMemo(
    () => subVerticals.filter((s) => s.verticalId === verticalId),
    [subVerticals, verticalId]
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await createTaskAction(form);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/sm/tasks/${result.id}`);
      } catch {
        setError("An unexpected error occurred. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Inline error banner */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vertical" htmlFor="verticalId">
          <Select id="verticalId" name="verticalId" required value={verticalId} onChange={(e) => setVerticalId(e.target.value)}>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </Field>
        <Field label="Sub-vertical" htmlFor="subVerticalId">
          <Select id="subVerticalId" name="subVerticalId">
            <option value="">— None —</option>
            {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Task title" htmlFor="title">
        <Input id="title" name="title" required placeholder="What needs to happen?" />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Priority" htmlFor="priorityId">
          <Select id="priorityId" name="priorityId" required>
            {priorities.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.label}</option>)}
          </Select>
        </Field>
        <Field label="Owner role" htmlFor="ownerRoleId">
          <Select id="ownerRoleId" name="ownerRoleId">
            <option value="">— Unassigned —</option>
            {ownerRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Owner email" htmlFor="ownerEmail">
          <Input
            id="ownerEmail"
            name="ownerEmail"
            type="email"
            placeholder="owner@example.com — must be a registered user"
          />
        </Field>
        <Field label="Sub-owner email" htmlFor="subOwnerEmail">
          <Input
            id="subOwnerEmail"
            name="subOwnerEmail"
            type="email"
            placeholder="sub-owner@example.com — optional follow-up contact"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Deadline" htmlFor="deadline">
          <Input id="deadline" name="deadline" type="date" />
        </Field>
        <Field label="Frequency" htmlFor="frequency">
          <Select id="frequency" name="frequency">
            <option value="">—</option>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Need-based</option>
            <option>Campaign-based</option>
            <option>Event-based</option>
          </Select>
        </Field>
        <Field label="Source" htmlFor="source">
          <Select id="source" name="source">
            <option value="SELF_STRATEGY">Self Strategy</option>
            <option value="BOSS_INSTRUCTION">Boss Instruction</option>
            <option value="WHATSAPP_GROUP">WhatsApp Group</option>
            <option value="MANAGEMENT_MEETING">Management Meeting</option>
            <option value="DEPARTMENT_MEETING">Department Meeting</option>
            <option value="MARKETING_REVIEW">Marketing Review</option>
            <option value="MRM">MRM</option>
            <option value="PLACEMENT_REVIEW">Placement Review</option>
            <option value="RTC_REVIEW">RTC Review</option>
            <option value="DIGITAL_REVIEW">Digital Review</option>
            <option value="NEW_IDEA">New Idea</option>
          </Select>
        </Field>
      </div>

      <Field label="Expected output" htmlFor="expectedOutput">
        <Input id="expectedOutput" name="expectedOutput" placeholder="What does success look like?" />
      </Field>

      <Field label="Support needed" htmlFor="supportNeeded">
        <Input id="supportNeeded" name="supportNeeded" placeholder="Data / approval / budget / team / content" />
      </Field>

      <Field label="Next action" htmlFor="nextAction">
        <Textarea id="nextAction" name="nextAction" placeholder="The very next step." />
      </Field>

      <Field label="Dr. BN intervention" htmlFor="intervention">
        <Select id="intervention" name="intervention" defaultValue="NO">
          <option value="NO">No</option>
          <option value="YES">Yes</option>
          <option value="ONLY_IF_DELAYED">Only if delayed</option>
        </Select>
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="reset" variant="outline" onClick={() => setError(null)}>Reset</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add to register"}</Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
