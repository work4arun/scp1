"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks } from "lucide-react";
import type { TokenUser } from "@/lib/token-auth";

export function ExternalSidebar({ user }: { user: TokenUser }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
          SCP
        </div>
        <span className="text-sm font-semibold">Task Portal</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        <SidebarLink href="/external/overview" icon={LayoutDashboard} label="Overview" active={pathname === "/external/overview"} />
        <SidebarLink href="/external/tasks" icon={ListChecks} label="My Tasks" active={pathname.startsWith("/external/tasks")} />
      </nav>

      <div className="border-t border-border px-4 py-3">
        <p className="text-xs font-medium text-foreground">{user.memberName}</p>
        <p className="text-[10px] text-muted-foreground">{user.memberEmail}</p>
        <p className="text-[10px] text-muted-foreground">{user.teamName}</p>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}