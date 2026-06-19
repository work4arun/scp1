"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Save } from "lucide-react";
import { saveSmtpConfigAction } from "@/app/(portal)/admin/teams/actions";

export function SmtpConfigForm({
  savedConfig,
}: {
  savedConfig: { host: string; port: number; secure: boolean; user: string; from: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [host, setHost] = useState(savedConfig?.host || "");
  const [port, setPort] = useState(String(savedConfig?.port || 587));
  const [secure, setSecure] = useState(savedConfig?.secure ?? false);
  const [user, setUser] = useState(savedConfig?.user || "");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState(savedConfig?.from || "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveSmtpConfigAction(form);
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
        <CardTitle>SMTP Server Configuration</CardTitle>
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
              ✓ SMTP configuration saved successfully. Emails will use this server.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="host">SMTP Host</Label>
              <Input
                id="host"
                name="host"
                placeholder="smtp.office365.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                name="port"
                type="number"
                placeholder="587"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="secure"
              name="secure"
              checked={secure}
              onCheckedChange={setSecure}
            />
            <Label htmlFor="secure" className="cursor-pointer text-xs">
              Use SSL/TLS (port 465). Leave off for STARTTLS (port 587).
            </Label>
            <input type="hidden" name="secure" value={secure ? "true" : "false"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="user">Username / Email</Label>
              <Input
                id="user"
                name="user"
                placeholder="user@example.com"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pass">Password / App Password</Label>
              <Input
                id="pass"
                name="pass"
                type="password"
                placeholder={savedConfig ? "Leave blank to keep existing" : "SMTP password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="from">From Address</Label>
            <Input
              id="from"
              name="from"
              placeholder="SCP System <noreply@example.com>"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Display name and email shown in the From header. Format: Name{" "}
              <code>{"<email@domain.com>"}</code>
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {pending ? "Saving…" : "Save Configuration"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}