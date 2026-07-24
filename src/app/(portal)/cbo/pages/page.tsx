import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewCbo } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { StaticPagesClient } from "@/app/(portal)/sm/pages/static-pages-client";

export default async function CboStaticPagesPage({ searchParams }: { searchParams: { q?: string; vertical?: string; date?: string } }) {
  const session = await auth();
  if (!canViewCbo(session?.user.systemRole)) redirect("/");

  const verticals = await prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });

  const where: any = {};
  if (searchParams.vertical) where.verticalId = searchParams.vertical;
  if (searchParams.date) {
    const d = new Date(searchParams.date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    where.createdAt = { gte: d, lt: next };
  }
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase();
    where.OR = [{ pageName: { contains: q, mode: "insensitive" } }, { fileName: { contains: q, mode: "insensitive" } }];
  }

  const pages = await prisma.staticPage.findMany({ where, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Static Pages" description="View uploaded PDF, HTML, and PPT files." />
      <StaticPagesClient
        pages={pages.map((p) => ({ id: p.id, pageName: p.pageName, fileName: p.fileName, fileType: p.fileType, verticalId: p.verticalId, createdAt: p.createdAt.toISOString() })) as any}
        verticals={verticals}
        role="CBO"
        activeFilters={searchParams}
      />
    </div>
  );
}