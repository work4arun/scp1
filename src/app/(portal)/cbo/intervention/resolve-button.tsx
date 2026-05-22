"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { resolveInterventionAction } from "./actions";
import { useRouter } from "next/navigation";

export function ResolveButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button variant="default" size="sm" onClick={() => setOpen(true)}>
        Resolve
      </Button>
    );
  }
  return (
    <div className="w-full space-y-2">
      {error ? (
        <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-xs font-medium">
          {error}
        </div>
      ) : null}
      <Label>Resolution note (optional)</Label>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you decide?" />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await resolveInterventionAction(id, note);
              if (!result.success) {
                setError(result.error);
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
        >
          {pending ? "Saving…" : "Mark resolved"}
        </Button>
      </div>
    </div>
  );
}
