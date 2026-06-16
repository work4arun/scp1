"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Save, RefreshCw } from "lucide-react";
import { saveListmonkConfigAction } from "@/app/(portal)/admin/teams/actions";
import { fetchTemplates } from "@/lib/listmonk";

export function EmailsPageClient({
  listmonkUrl,
  savedConfig,
}: {
  listmonkUrl: string;
  savedConfig: { baseUrl: string; userId: string; apiKey: string; templateId: number | null } | null;
}) {
  const [tab, setTab] = useState<"embedded" | "config">("embedded");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Config form state
  const [baseUrl, setBaseUrl] = useState(savedConfig?.baseUrl || "");
  const [userId, setUserId] = useState(savedConfig?.userId || "");
  const [apiKey, setApiKey] = useState(savedConfig?.apiKey || "");
  const [templateId, setTemplateId] = useState<number | null>(savedConfig?.templateId ?? null);
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);

  async function loadTemplates() {
    if (!baseUrl || !userId || !apiKey) return;
    setFetchingTemplates(true);
    const list = await fetchTemplates(baseUrl, userId, apiKey);
    setTemplates(list);
    setFetchingTemplates(false);
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveListmonkConfigAction(form);
      if (!result.success) { setError(result.error); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
        <button
          onClick={() => setTab("embedded")}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            tab === "embedded" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Embedded
        </button>
        <button
          onClick={() => setTab("config")}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            tab === "config" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Listmonk Email Configuration
        </button>
      </div>

      {tab === "embedded" && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Listmonk Admin</CardTitle>
            <a href={listmonkUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
              Open in new tab ↗
            </a>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              src={listmonkUrl}
              className="w-full border-0"
              style={{ height: "calc(100vh - 300px)", minHeight: "500px" }}
              title="Listmonk Email Manager"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </CardContent>
        </Card>
      )}

      {tab === "config" && (
        <Card>
          <CardHeader><CardTitle>Listmonk Email Configuration</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}
              {success && (
                <div className="rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">✓ Saved successfully.</div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="lmBaseUrl">Listmonk Base URL</Label>
                <Input id="lmBaseUrl" name="baseUrl" placeholder="http://13.229.69.87:9000/api" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="text-xs font-mono" />
                <p className="text-[11px] text-muted-foreground">The full API base URL (e.g. http://13.229.69.87:9000/api)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lmUser">Username</Label>
                  <Input id="lmUser" name="userId" placeholder="listmonk_user1" value={userId} onChange={(e) => setUserId(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lmKey">API Key</Label>
                  <Input id="lmKey" name="apiKey" type="password" placeholder="API key from Settings → API" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="text-xs font-mono" />
                </div>
              </div>

              {/* Template Selector */}
              <div className="space-y-1.5">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="lmTemplate">Task Email Template</Label>
                    <Select
                      id="lmTemplate"
                      name="templateId"
                      value={templateId ? String(templateId) : ""}
                      onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">— Select a template —</option>
                      {templates.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={loadTemplates} disabled={fetchingTemplates} className="h-9">
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${fetchingTemplates ? "animate-spin" : ""}`} />
                    {fetchingTemplates ? "Loading..." : "Fetch"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Click Fetch to load templates from Listmonk. The selected template will be used for task assignment emails.
                </p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {pending ? "Saving…" : "Save configuration"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}