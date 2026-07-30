import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewCbo } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { FileExplorer } from "@/app/(portal)/sm/pages/file-explorer";
import { StaticPagesList } from "@/app/(portal)/sm/pages/static-pages-list";
import { PagesViewToggle, resolvePagesView } from "@/app/(portal)/sm/pages/pages-view-toggle";
import { PagesViewMemory } from "@/app/(portal)/sm/pages/pages-view-memory";
import { loadFolderLevel, loadPagesList } from "@/app/(portal)/sm/pages/folder-data";

export default async function CboStaticPagesPage({
  searchParams,
}: {
  searchParams: { folder?: string; view?: string; q?: string; vertical?: string; date?: string };
}) {
  const session = await auth();
  if (!canViewCbo(session?.user.systemRole)) redirect("/");

  const view = resolvePagesView(searchParams);
  const verticals = await prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, code: true, name: true } });

  return (
    <div className="space-y-6 animate-fade-in">
      <PagesViewMemory view={view} />
      <PageHeader
        title="Static Pages"
        description={view === "list" ? "Browse all files by vertical, with filters." : "Browse PDF, HTML, and PPT files by folder."}
        action={<PagesViewToggle view={view} rolePath="cbo" />}
      />
      {view === "list" ? (
        <StaticPagesList
          role="CBO"
          pages={await loadPagesList(verticals, searchParams)}
          verticals={verticals}
          activeFilters={searchParams}
        />
      ) : (
        <CboFolderView folder={searchParams.folder ?? null} />
      )}
    </div>
  );
}

async function CboFolderView({ folder }: { folder: string | null }) {
  const level = await loadFolderLevel(folder);
  return (
    <FileExplorer
      role="CBO"
      currentFolderId={level.currentFolderId}
      breadcrumb={level.breadcrumb}
      folders={level.folders}
      pages={level.pages}
      verticals={[]}
    />
  );
}
