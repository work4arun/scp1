"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Save } from "lucide-react";
import { saveListmonkConfigAction } from "./actions";

export function ListmonkConfigForm({
  initial,
}: {
  initial?: { userId: string; apiKey: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveListmonkConfigAction(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
          ✓ Listmonk credentials saved successfully.
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="lmUserId">Listmonk Username</Label>
          <Input
            id="lmUserId"
            name="userId"
            placeholder="listmonk_user1"
            defaultValue={initial?.userId || ""}
            className="text-xs"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="lmApiKey">Listmonk API Key</Label>
          <Input
            id="lmApiKey"
            name="apiKey"
            type="password"
            placeholder="API key from Listmonk Settings → API"
            defaultValue={initial?.apiKey || ""}
            className="text-xs font-mono"
          />
        </div>
        <div className="sm:col-span-4">
          <p className="text-[11px] text-muted-foreground">
            Get these from the Listmonk admin panel → Settings → API. If left empty, emails will not be sent.
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          <Save className="h-3.5 w-3.5 mr-1" />
          {pending ? "Saving…" : "Save credentials"}
        </Button>
      </div>
    </form>
  );
}