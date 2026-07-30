import Link from "next/link";
import { cookies } from "next/headers";
import { FolderTree, List } from "lucide-react";

export type PagesView = "folder" | "list";

/**
 * Resolve which view to show: an explicit ?view / ?folder param wins, otherwise
 * fall back to the per-browser cookie set by PagesViewMemory (default folders).
 */
export function resolvePagesView(searchParams: { view?: string; folder?: string }): PagesView {
  if (searchParams.view === "list") return "list";
  if (searchParams.view === "folder") return "folder";
  if (searchParams.folder) return "folder";
  return cookies().get("staticPagesView")?.value === "list" ? "list" : "folder";
}

/** Segmented switch (top-right of Static Pages) between the folder explorer and the flat filterable list. */
export function PagesViewToggle({ view, rolePath }: { view: PagesView; rolePath: string }) {
  const options = [
    { key: "folder" as const, label: "Folders", icon: FolderTree, href: `/${rolePath}/pages?view=folder` },
    { key: "list" as const, label: "By vertical", icon: List, href: `/${rolePath}/pages?view=list` },
  ];
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.key === view;
        return (
          <Link
            key={o.key}
            href={o.href}
            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
