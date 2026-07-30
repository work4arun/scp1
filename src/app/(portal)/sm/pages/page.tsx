import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { FileExplorer } from "./file-explorer";
import { StaticPagesList } from "./static-pages-list";
import { PagesViewToggle, resolvePagesView } from "./pages-view-toggle";
import { PagesViewMemory } from "./pages-view-memory";
import { loadFolderLevel, loadPagesList } from "./folder-data";

export default async function SmStaticPagesPage({
  searchParams,
}: {
  searchParams: { folder?: string; view?: string; q?: string; vertical?: string; date?: string };
}) {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const view = resolvePagesView(searchParams);
  const verticals = await prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, code: true, name: true } });

  return (
    <div className="space-y-6 animate-fade-in">
      <PagesViewMemory view={view} />
      <PageHeader
        title="Static Pages"
        description={view === "list" ? "Browse all files by vertical, with filters." : "Organise PDF, HTML, and PPT files into folders."}
        action={<PagesViewToggle view={view} rolePath="sm" />}
      />
      {view === "list" ? (
        <StaticPagesList
          role="SM"
          pages={await loadPagesList(verticals, searchParams)}
          verticals={verticals}
          activeFilters={searchParams}
        />
      ) : (
        <FolderView folder={searchParams.folder ?? null} verticals={verticals} />
      )}
    </div>
  );
}

async function FolderView({ folder, verticals }: { folder: string | null; verticals: { id: string; code: string; name: string }[] }) {
  const level = await loadFolderLevel(folder);
  return (
    <FileExplorer
      role="SM"
      currentFolderId={level.currentFolderId}
      breadcrumb={level.breadcrumb}
      folders={level.folders}
      pages={level.pages}
      verticals={verticals}
    />
  );
}
