"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Eye, Download, Trash2, FileText, Plus, Search, X } from "lucide-react";
import { deletePageAction } from "./actions";
import Link from "next/link";

type Page = { id: string; pageName: string; fileName: string; fileType: string; verticalId: string | null; createdAt: string };
type Vertical = { id: string; code: string; name: string };

export function StaticPagesClient({
  pages: initialPages,
  verticals,
  role,
  activeFilters,
}: {
  pages: Page[];
  verticals: Vertical[];
  role: "SM" | "CBO";
  activeFilters: { q?: string; vertical?: string; date?: string };
}) {
  const router = useRouter();
  const rolePath = role.toLowerCase();
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState(activeFilters.q || "");
  const [vertical, setVertical] = useState(activeFilters.vertical || "");
  const [date, setDate] = useState(activeFilters.date || "");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    setUploading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/static-pages/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || "Upload failed"); return; }
      setShowModal(false);
      router.refresh();
    } catch { setUploadError("Network error"); }
    finally { setUploading(false); }
  }

  function clearFilters() {
    setSearch(""); setVertical(""); setDate("");
    router.push(`/${rolePath}/pages`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this page?")) return;
    const res = await deletePageAction(id);
    if (res.success) router.refresh();
    else setError(res.error || "Delete failed");
  }

  // Debounced filter pusher
  let timer: ReturnType<typeof setTimeout> | null = null;
  function pushFilter(s: string, v: string, d: string) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (s) params.set("q", s);
      if (v) params.set("vertical", v);
      if (d) params.set("date", d);
      router.push(`/${rolePath}/pages?${params.toString()}`, { scroll: false });
    }, 300);
  }

  const selectedVerticalName = verticals.find((v) => v.id === vertical)?.code;
  const filterParts = [];
  if (search) filterParts.push(`Search: "${search}"`);
  if (selectedVerticalName) filterParts.push(`Vertical: ${selectedVerticalName}`);
  if (date) filterParts.push(`Date: ${date}`);
  const filterLabel = filterParts.join(" · ");

  return (
    <>
      {error && <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span></div>}

      {/* Filters + Add button */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); pushFilter(e.target.value, vertical, date); }} placeholder="Page name or file name..." className="h-8 pl-7 text-xs w-48" />
            </div>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Vertical</Label>
            <Select value={vertical} onChange={(e) => { setVertical(e.target.value); pushFilter(search, e.target.value, date); }} className="h-8 text-xs w-36">
              <option value="">All verticals</option>
              {verticals.map((v) => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); pushFilter(search, vertical, e.target.value); }} className="h-8 text-xs w-36" />
          </div>
        </div>
        {filterLabel && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs"><X className="h-3 w-3 mr-1" />Clear</Button>}
        <Button size="sm" onClick={() => setShowModal(true)} className="h-8 ml-auto"><Plus className="h-4 w-4 mr-1" />Add Page</Button>
      </div>

      {/* Page list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Pages ({initialPages.length})</CardTitle>
          {filterLabel && <span className="text-xs text-primary bg-primary/10 rounded px-2 py-0.5">{filterLabel}</span>}
        </CardHeader>
        <CardContent className="space-y-1">
          {initialPages.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No pages found.</div>
          ) : (
            <div className="space-y-1">
              {initialPages.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-accent/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.pageName}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      {p.fileName} · {p.fileType.toUpperCase()} · {new Date(p.createdAt).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Link href={`/api/static-pages/${p.id}`} target="_blank" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground" title="View">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/api/static-pages/${p.id}?download=1`} className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground" title="Download">
                      <Download className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(p.id)} className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upload Page</h2>
              <button onClick={() => setShowModal(false)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            {uploadError && <div className="text-sm text-destructive bg-destructive/5 rounded px-3 py-2">{uploadError}</div>}
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pageName">Page Name *</Label>
                <Input id="pageName" name="pageName" required placeholder="e.g., Quarterly Report" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="verticalId">Vertical</Label>
                <Select name="verticalId" className="h-9 text-sm">
                  <option value="">— None —</option>
                  {verticals.map((v) => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file">File (PDF, HTML, PPT)</Label>
                <Input id="file" name="file" type="file" required accept=".pdf,.html,.ppt,.pptx" className="h-9 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}