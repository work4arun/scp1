import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default async function CboVerticals() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole)) redirect("/");

  const verticals = await prisma.vertical.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { tasks: true, subVerticals: true } },
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Verticals" description="Drill into any vertical for the full task register and dashboard." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {verticals.map((v) => (
          <Link key={v.id} href={`/cbo/verticals/${v.code}`}>
            <Card className="hover:shadow-md hover:border-primary/40 transition-all">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <span
                    className="h-10 w-10 rounded-lg grid place-items-center text-sm font-bold text-white"
                    style={{ backgroundColor: v.colorHex }}
                  >
                    {v.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm">{v.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {v._count.tasks} tasks · {v._count.subVerticals} sub-verticals
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                {v.description ? (
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{v.description}</p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
