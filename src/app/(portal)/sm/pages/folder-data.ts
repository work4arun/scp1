import { prisma } from "@/lib/prisma";
import type { Crumb, FolderRow, PageRow } from "./file-explorer";
import type { ListPage } from "./static-pages-list";

/**
 * Flat "by vertical" list — every page across all folders, filtered by the
 * original search / vertical / date controls. Used by the list view toggle.
 */
export async function loadPagesList(
  verticals: { id: string; code: string }[],
  filters: { q?: string; vertical?: string; date?: string },
): Promise<ListPage[]> {
  const where: Record<string, unknown> = {};
  if (filters.vertical) where.verticalId = filters.vertical;
  if (filters.date) {
    const d = new Date(filters.date);
    if (!Number.isNaN(d.getTime())) {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.createdAt = { gte: d, lt: next };
    }
  }
  if (filters.q) {
    const q = filters.q;
    where.OR = [
      { pageName: { contains: q, mode: "insensitive" } },
      { fileName: { contains: q, mode: "insensitive" } },
      { linkUrl: { contains: q, mode: "insensitive" } },
    ];
  }

  const codeById = new Map(verticals.map((v) => [v.id, v.code]));
  const rows = await prisma.staticPage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, pageName: true, fileName: true, fileType: true, linkUrl: true, verticalId: true, createdAt: true, folder: { select: { name: true } } },
  });

  return rows.map((p) => ({
    id: p.id,
    pageName: p.pageName,
    fileName: p.fileName,
    fileType: p.fileType,
    linkUrl: p.linkUrl,
    verticalCode: p.verticalId ? codeById.get(p.verticalId) ?? null : null,
    folderName: p.folder?.name ?? null,
    createdAt: p.createdAt.toISOString(),
  }));
}

/**
 * Load one level of the static-pages explorer plus the breadcrumb chain.
 * Shared by the SM and CBO pages so both render the same tree.
 */
export async function loadFolderLevel(folderId: string | null): Promise<{
  currentFolderId: string | null;
  breadcrumb: Crumb[];
  folders: FolderRow[];
  pages: PageRow[];
}> {
  // Resolve the requested folder; if it was deleted, fall back to root.
  let current: { id: string; parentId: string | null } | null = null;
  if (folderId) {
    current = await prisma.staticFolder.findUnique({ where: { id: folderId }, select: { id: true, parentId: true } });
  }
  const effectiveId = current?.id ?? null;

  // Walk parents up to the root to build the breadcrumb.
  const breadcrumb: Crumb[] = [];
  let walkId = effectiveId;
  const guard = new Set<string>(); // defensive against any accidental cycle
  while (walkId && !guard.has(walkId)) {
    guard.add(walkId);
    const node: { id: string; name: string; parentId: string | null } | null =
      await prisma.staticFolder.findUnique({ where: { id: walkId }, select: { id: true, name: true, parentId: true } });
    if (!node) break;
    breadcrumb.unshift({ id: node.id, name: node.name });
    walkId = node.parentId;
  }

  const [folderRows, pageRows] = await Promise.all([
    prisma.staticFolder.findMany({
      where: { parentId: effectiveId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { children: true, pages: true } } },
    }),
    prisma.staticPage.findMany({
      where: { folderId: effectiveId },
      orderBy: { createdAt: "desc" },
      select: { id: true, pageName: true, fileName: true, fileType: true, linkUrl: true, createdAt: true },
    }),
  ]);

  return {
    currentFolderId: effectiveId,
    breadcrumb,
    folders: folderRows.map((f) => ({ id: f.id, name: f.name, childCount: f._count.children, pageCount: f._count.pages })),
    pages: pageRows.map((p) => ({ id: p.id, pageName: p.pageName, fileName: p.fileName, fileType: p.fileType, linkUrl: p.linkUrl, createdAt: p.createdAt.toISOString() })),
  };
}
