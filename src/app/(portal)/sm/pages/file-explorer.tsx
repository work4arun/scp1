"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Static Pages — file-explorer view.
//
//  Folders nest arbitrarily. The current folder travels in the URL (?folder=<id>)
//  so navigation is server-rendered and shareable; this client component owns the
//  interactive bits — the new-folder and upload modals, rename, and deletes.
//
//  SM gets the full toolbar; CBO (view-only) sees folders and files but no create,
//  upload, rename, or delete controls.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Folder, FolderPlus, Upload, ChevronRight, Home, Eye, Download, Trash2,
  Pencil, X, FileText, AlertTriangle, Search, Link2, FileUp,
} from "lucide-react";
import { createFolderAction, renameFolderAction, deleteFolderAction, deletePageAction } from "./actions";
import { withBase } from "@/lib/base";

export type Crumb = { id: string; name: string };
export type FolderRow = { id: string; name: string; childCount: number; pageCount: number };
export type PageRow = { id: string; pageName: string; fileName: string | null; fileType: string; linkUrl: string | null; createdAt: string };
export type Vertical = { id: string; code: string; name: string };

export function FileExplorer({
  role, currentFolderId, breadcrumb, folders, pages, verticals,
}: {
  role: "SM" | "CBO";
  currentFolderId: string | null;
  breadcrumb: Crumb[];
  folders: FolderRow[];
  pages: PageRow[];
  verticals: Vertical[];
}) {
  const router = useRouter();
  const rolePath = role.toLowerCase();
  const canEdit = role === "SM";

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  // Modals
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renaming, setRenaming] = useState<FolderRow | null>(null);
  const [renameName, setRenameName] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");

  const folderHref = (id: string | null) => (id ? `/${rolePath}/pages?view=folder&folder=${id}` : `/${rolePath}/pages?view=folder`);

  const q = search.trim().toLowerCase();
  const shownFolders = q ? folders.filter((f) => f.name.toLowerCase().includes(q)) : folders;
  const shownPages = q ? pages.filter((p) => `${p.pageName} ${p.fileName}`.toLowerCase().includes(q)) : pages;
  const empty = shownFolders.length === 0 && shownPages.length === 0;

  function createFolder() {
    setError(null);
    startTransition(async () => {
      const r = await createFolderAction(newFolderName, currentFolderId);
      if (!r.success) { setError(r.error ?? "Could not create folder."); return; }
      setNewFolderOpen(false); setNewFolderName(""); router.refresh();
    });
  }

  function submitRename() {
    if (!renaming) return;
    setError(null);
    startTransition(async () => {
      const r = await renameFolderAction(renaming.id, renameName);
      if (!r.success) { setError(r.error ?? "Could not rename."); return; }
      setRenaming(null); router.refresh();
    });
  }

  function removeFolder(f: FolderRow) {
    const contents = f.childCount + f.pageCount;
    const warn = contents > 0
      ? `Delete "${f.name}" and everything inside it (${f.childCount} folder(s), ${f.pageCount} file(s))? This cannot be undone.`
      : `Delete the empty folder "${f.name}"?`;
    if (!confirm(warn)) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteFolderAction(f.id);
      if (!r.success) { setError(r.error ?? "Could not delete folder."); return; }
      router.refresh();
    });
  }

  function removePage(p: PageRow) {
    if (!confirm(`Delete "${p.pageName}"?`)) return;
    setError(null);
    startTransition(async () => {
      const r = await deletePageAction(p.id);
      if (!r.success) { setError(r.error ?? "Could not delete file."); return; }
      router.refresh();
    });
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    setUploading(true);
    const form = new FormData(e.currentTarget);
    if (currentFolderId) form.set("folderId", currentFolderId);
    form.set("mode", uploadMode);
    if (uploadMode === "link") form.delete("file");
    try {
      const res = await fetch(withBase("/api/static-pages/upload"), { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || "Upload failed"); return; }
      setUploadOpen(false); setUploadMode("file"); router.refresh();
    } catch { setUploadError("Network error"); }
    finally { setUploading(false); }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Breadcrumb + toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
          <Link href={folderHref(null)} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent ${currentFolderId ? "text-muted-foreground" : "font-semibold"}`}>
            <Home className="h-3.5 w-3.5" /> Static Pages
          </Link>
          {breadcrumb.map((c, i) => (
            <span key={c.id} className="inline-flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <Link href={folderHref(c.id)} className={`rounded px-1.5 py-0.5 hover:bg-accent ${i === breadcrumb.length - 1 ? "font-semibold" : "text-muted-foreground"}`}>
                {c.name}
              </Link>
            </span>
          ))}
        </nav>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this folder…" className="h-8 w-44 pl-7 text-xs" />
        </div>
        {canEdit && (
          <>
            <Button size="sm" variant="outline" className="h-8" onClick={() => { setNewFolderName(""); setNewFolderOpen(true); }}>
              <FolderPlus className="mr-1 h-4 w-4" /> New folder
            </Button>
            <Button size="sm" className="h-8" onClick={() => { setUploadError(null); setUploadOpen(true); }}>
              <Upload className="mr-1 h-4 w-4" /> Upload
            </Button>
          </>
        )}
      </div>

      {/* Contents */}
      <div className="rounded-lg border border-border">
        {empty ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {q ? "Nothing matches your search." : canEdit ? "This folder is empty. Create a folder or upload a file." : "This folder is empty."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {shownFolders.map((f) => (
              <li key={f.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/50">
                {/* Folders open on double-click, like a desktop file explorer. */}
                <div
                  onDoubleClick={() => router.push(folderHref(f.id))}
                  title="Double-click to open"
                  className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-2.5"
                >
                  <Folder className="h-5 w-5 shrink-0 text-primary" fill="currentColor" fillOpacity={0.15} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{f.name}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {f.childCount} folder{f.childCount === 1 ? "" : "s"} · {f.pageCount} file{f.pageCount === 1 ? "" : "s"} · double-click to open
                    </span>
                  </span>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => { setRenaming(f); setRenameName(f.name); }} title="Rename" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeFolder(f)} disabled={pending} title="Delete folder" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}

            {shownPages.map((p) => {
              const isLink = p.fileType === "link";
              const openHref = isLink ? p.linkUrl ?? "#" : `/api/static-pages/${p.id}`;
              const rawOpenHref = isLink ? openHref : withBase(openHref);
              const subName = isLink ? p.linkUrl ?? "Link" : p.fileName;
              return (
              <li key={p.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/50">
                {/* Clicking anywhere on the row opens it in a new tab, same as the eye icon. */}
                <a href={rawOpenHref} target="_blank" rel="noopener noreferrer" title={isLink ? "Open link" : "Open file"} className="flex min-w-0 flex-1 items-center gap-2.5">
                  {isLink ? <Link2 className="h-5 w-5 shrink-0 text-primary" /> : <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.pageName}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {subName} · {p.fileType.toUpperCase()} · {new Date(p.createdAt).toLocaleDateString("en-IN")}
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
                    <button onClick={() => removePage(p)} disabled={pending} title="Delete" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
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

      {/* New folder modal */}
      {newFolderOpen && (
        <Modal title="New folder" onClose={() => setNewFolderOpen(false)}>
          <div className="space-y-1.5">
            <Label htmlFor="folderName">Folder name</Label>
            <Input id="folderName" autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createFolder(); }} placeholder="e.g., Marketing 2026" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button type="button" disabled={pending || !newFolderName.trim()} onClick={createFolder}>{pending ? "Creating…" : "Create"}</Button>
          </div>
        </Modal>
      )}

      {/* Rename modal */}
      {renaming && (
        <Modal title="Rename folder" onClose={() => setRenaming(null)}>
          <div className="space-y-1.5">
            <Label htmlFor="renameName">Folder name</Label>
            <Input id="renameName" autoFocus value={renameName} onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitRename(); }} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button type="button" disabled={pending || !renameName.trim()} onClick={submitRename}>{pending ? "Saving…" : "Save"}</Button>
          </div>
        </Modal>
      )}

      {/* Upload modal */}
      {uploadOpen && (
        <Modal title={`Upload${uploadMode === "link" ? " link" : " file"}${breadcrumb.length ? ` to ${breadcrumb[breadcrumb.length - 1].name}` : ""}`} onClose={() => setUploadOpen(false)}>
          {uploadError && <div className="rounded bg-destructive/5 px-3 py-2 text-sm text-destructive">{uploadError}</div>}
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Mode toggle: upload a file or paste a link. */}
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
              <button
                type="button"
                onClick={() => setUploadMode("file")}
                className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${uploadMode === "file" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
              >
                <FileUp className="h-3.5 w-3.5" /> Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("link")}
                className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${uploadMode === "link" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
              >
                <Link2 className="h-3.5 w-3.5" /> Add Link
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pageName">Page name *</Label>
              <Input id="pageName" name="pageName" required placeholder="e.g., Quarterly Report" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="verticalId">Vertical (optional)</Label>
              <Select id="verticalId" name="verticalId" className="h-9 text-sm">
                <option value="">— None —</option>
                {verticals.map((v) => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
              </Select>
            </div>

            {uploadMode === "file" ? (
              <div className="space-y-1.5">
                <Label htmlFor="file">File (PDF, HTML, PPT)</Label>
                <Input id="file" name="file" type="file" required accept=".pdf,.html,.ppt,.pptx" className="h-9 text-sm" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="linkUrl">Link URL *</Label>
                <Input id="linkUrl" name="linkUrl" type="url" required placeholder="https://example.com/report" className="h-9 text-sm" />
                <p className="text-[11px] text-muted-foreground">
                  Opens in a new tab when clicked. Must start with http:// or https://
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={uploading}>{uploading ? "Adding…" : uploadMode === "link" ? "Add Link" : "Upload"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-lg bg-card p-6 shadow-xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
