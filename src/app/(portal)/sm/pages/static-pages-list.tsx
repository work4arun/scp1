"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Static Pages — flat "by vertical" list with the original filters
//  (search, vertical, date). The folder explorer is the other view; this one
//  shows every page regardless of folder, filterable. SM can delete; CBO is
//  view-only. Uploading/foldering happens in the folder view.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, Download, Trash2, FileText, Search, X, Link2 } from "lucide-react";
import { deletePageAction } from "./actions";

export type ListPage = {
  id: string; pageName: string; fileName: string | null; fileType: string; linkUrl: string | null;
  verticalCode: string | null; folderName: string | null; createdAt: string;
};
export type Vertical = { id: string; code: string; name: string };

export function StaticPagesList({
  role, pages, verticals, activeFilters,
}: {
  role: "SM" | "CBO";
  pages: ListPage[];
  verticals: Vertical[];
  activeFilters: { q?: string; vertical?: string; date?: string };
}) {
  const router = useRouter();
  const rolePath = role.toLowerCase();
  const canEdit = role === "SM";

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState(activeFilters.q || "");
  const [vertical, setVertical] = useState(activeFilters.vertical || "");
  const [date, setDate] = useState(activeFilters.date || "");

  // Debounced URL push — keeps view=list so the toggle state survives filtering.
  let timer: ReturnType<typeof setTimeout> | null = null;
  function pushFilter(s: string, v: string, d: string) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("view", "list");
      if (s) params.set("q", s);
      if (v) params.set("vertical", v);
      if (d) params.set("date", d);
      router.push(`/${rolePath}/pages?${params.toString()}`, { scroll: false });
    }, 300);
  }

  function clearFilters() {
    setSearch(""); setVertical(""); setDate("");
    router.push(`/${rolePath}/pages?view=list`);
  }

  function removePage(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const r = await deletePageAction(id);
      if (!r.success) { setError(r.error ?? "Delete failed"); return; }
      router.refresh();
    });
  }

  const selectedVerticalName = verticals.find((v) => v.id === vertical)?.code;
  const filterParts: string[] = [];
  if (search) filterParts.push(`Search: "${search}"`);
  if (selectedVerticalName) filterParts.push(`Vertical: ${selectedVerticalName}`);
  if (date) filterParts.push(`Date: ${date}`);
  const filterLabel = filterParts.join(" · ");

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); pushFilter(e.target.value, vertical, date); }} placeholder="Page or file name…" className="h-8 w-48 pl-7 text-xs" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Vertical</Label>
          <Select value={vertical} onChange={(e) => { setVertical(e.target.value); pushFilter(search, e.target.value, date); }} className="h-8 w-36 text-xs">
            <option value="">All verticals</option>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); pushFilter(search, vertical, e.target.value); }} className="h-8 w-36 text-xs" />
        </div>
        {filterLabel && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs"><X className="mr-1 h-3 w-3" />Clear</Button>}
      </div>

      {/* List */}
      <div className="rounded-lg border border-border">
        {filterLabel && (
          <div className="border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            {pages.length} result{pages.length === 1 ? "" : "s"} · <span className="text-primary">{filterLabel}</span>
          </div>
        )}
        {pages.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No pages found.</div>
        ) : (
          <ul className="divide-y divide-border">
            {pages.map((p) => {
              const isLink = p.fileType === "link";
              const openHref = isLink ? p.linkUrl ?? "#" : `/api/static-pages/${p.id}`;
              const subName = isLink ? p.linkUrl ?? "Link" : p.fileName;
              return (
              <li key={p.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/50">
                <a href={openHref} target="_blank" rel="noopener noreferrer" title={isLink ? "Open link" : "Open file"} className="flex min-w-0 flex-1 items-center gap-2.5">
                  {isLink ? <Link2 className="h-5 w-5 shrink-0 text-primary" /> : <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{p.pageName}</span>
                      {p.verticalCode && <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">{p.verticalCode}</span>}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {subName} · {p.fileType.toUpperCase()} · {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      {p.folderName ? ` · 📁 ${p.folderName}` : ""}
                    </span>
                  </span>
                </a>
                <div className="flex shrink-0 items-center gap-1">
                  <Link href={openHref} target="_blank" rel="noopener noreferrer" title={isLink ? "Open link" : "View"} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                    <Eye className="h-4 w-4" />
                  </Link>
                  {!isLink && (
                    <Link href={`/api/static-pages/${p.id}?download=1`} title="Download" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Download className="h-4 w-4" />
                    </Link>
                  )}
                  {canEdit && (
                    <button onClick={() => removePage(p.id, p.pageName)} disabled={pending} title="Delete file" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
