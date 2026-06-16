import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, Users as UsersIcon, ListChecks, Tags } from "lucide-react";
import Link from "next/link";

export default async function AdminHome() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const [verticalCount, userCount, taskCount, teamCount] = await Promise.all([
    prisma.vertical.count({ where: { active: true } }),
    prisma.user.count(),
    prisma.task.count({ where: { status: { not: "DROPPED" } } }),
    prisma.team.count({ where: { active: true } }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in"><PageHeader title="Super Admin" description="Configure the system." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard href="/admin/verticals" icon={<Layers className="h-4 w-4" />} label="Verticals" value={verticalCount} />
        <StatCard href="/admin/teams" icon={<UsersIcon className="h-4 w-4" />} label="Teams" value={teamCount} />
        <StatCard href="/admin/users" icon={<UsersIcon className="h-4 w-4" />} label="Users" value={userCount} />
        <StatCard href="/admin/tasks" icon={<ListChecks className="h-4 w-4" />} label="Tasks" value={taskCount} />
      </div>
    </div>
  );
}

function StatCard({ href, icon, label, value }: { href: string; icon: React.ReactNode; label: string; value: number }) { return <Link href={href}><Card className="hover:border-primary/40 transition-colors"><CardContent className="p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">{icon} {label}</div><div className="mt-2 text-2xl font-bold">{value}</div></CardContent></Card></Link>; }