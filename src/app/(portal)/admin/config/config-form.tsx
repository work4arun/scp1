"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Save } from "lucide-react";
import { saveConfigAction } from "./actions";

export function ConfigForm({ dashboardUrl }: { dashboardUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [url, setUrl] = useState(dashboardUrl);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveConfigAction(form);
      if (!result.success) {
        setError(result.error || "Failed to save.");
        return;
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard URL</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="rounded-md border border-green-500/40 bg-green-50 dark:bg-green-950/20 px-3 py-2 text-xs text-green-700 dark:text-green-400">
              Configuration saved successfully.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="dashboardUrl">Dashboard URL</Label>
            <Input
              id="dashboardUrl"
              name="dashboardUrl"
              type="url"
              placeholder="https://report.rankuhigher.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              This URL is used for the Dashboard button visible to SM and CBO roles. It opens in a new tab.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
