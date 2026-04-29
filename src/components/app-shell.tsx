"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  AlertTriangle,
  Archive,
  Settings,
  Users,
  Tags,
  Layers,
  Menu,
  X,
  Calendar,
  Inbox,
  Sparkles,
  Building2,
  History,
  ToggleLeft,
  Database,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemRole } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/rbac";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notification-bell";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

function navItemsFor(role: SystemRole): NavItem[] {
  if (role === "SUPER_ADMIN") {
    return [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/verticals", label: "Verticals", icon: Layers },
      { href: "/admin/sub-verticals", label: "Sub-Verticals", icon: Layers },
      { href: "/admin/priorities", label: "Priorities", icon: Tags },
      { href: "/admin/roles", label: "Owner Roles", icon: Users },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/tasks", label: "All Tasks", icon: ListChecks },
      { href: "/admin/audit", label: "Audit Log", icon: History },
      { href: "/admin/features", label: "Feature Flags", icon: ToggleLeft },
      { href: "/admin/backup", label: "Backup & Restore", icon: Database },
    ];
  }
  if (role === "CBO") {
    return [
      { href: "/cbo", label: "Master Dashboard", icon: LayoutDashboard },
      { href: "/cbo/daily", label: "Today's Summary", icon: Calendar },
      { href: "/cbo/weekly", label: "Weekly Review", icon: Sparkles },
      { href: "/cbo/intervention", label: "My Decisions", icon: AlertTriangle },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/cbo/parking", label: "Parking Lot", icon: Archive },
      { href: "/cbo/verticals", label: "Verticals", icon: Building2 },
      { href: "/cbo/notes", label: "Notes", icon: StickyNote },
    ];
  }
  // SM
  return [
    { href: "/sm", label: "Today", icon: LayoutDashboard },
    { href: "/sm/tasks", label: "Tasks", icon: ListChecks },
    { href: "/sm/new-task", label: "New Task", icon: Inbox },
    { href: "/sm/boss", label: "Boss Register", icon: Inbox },
    { href: "/sm/intervention", label: "Escalations", icon: AlertTriangle },
    { href: "/sm/notes", label: "Notes from CBO", icon: StickyNote },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/sm/parking", label: "Parking Lot", icon: Archive },
    { href: "/sm/dropped", label: "Dropped Archive", icon: Archive },
  ];
}

function bottomNavFor(role: SystemRole): NavItem[] {
  // Show 4 most-used items as bottom nav on mobile
  if (role === "SUPER_ADMIN") {
    return [
      { href: "/admin", label: "Home", icon: LayoutDashboard },
      { href: "/admin/verticals", label: "Verticals", icon: Layers },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/tasks", label: "Tasks", icon: ListChecks },
    ];
  }
  if (role === "CBO") {
    return [
      { href: "/cbo", label: "Home", icon: LayoutDashboard },
      { href: "/cbo/daily", label: "Today", icon: Calendar },
      { href: "/cbo/intervention", label: "Decide", icon: AlertTriangle },
      { href: "/cbo/weekly", label: "Weekly", icon: Sparkles },
    ];
  }
  return [
    { href: "/sm", label: "Today", icon: LayoutDashboard },
    { href: "/sm/tasks", label: "Tasks", icon: ListChecks },
    { href: "/sm/new-task", label: "New", icon: Inbox },
    { href: "/sm/intervention", label: "Escalate", icon: AlertTriangle },
  ];
}

export function AppShell({
  children,
  role,
  userName,
  userEmail,
  darkModeToggleEnabled = false,
}: {
  children: React.ReactNode;
  role: SystemRole;
  userName: string;
  userEmail: string;
  darkModeToggleEnabled?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = navItemsFor(role);
  const bottomItems = bottomNavFor(role);

  const close = () => setOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-xs font-bold">SCP</div>
          <span className="text-sm font-semibold">Strategic Control</span>
        </div>
        <div className="flex items-center gap-1">
          {darkModeToggleEnabled && <DarkModeToggle />}
          <NotificationBell enabled={role === "CBO" || role === "SUPER_ADMIN"} />
          <SignOutButton variant="icon" />
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen border-r border-border bg-card">
          <div className="flex items-center justify-between gap-2 px-5 py-5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold shrink-0">SCP</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight truncate">Strategic Control</div>
                <div className="text-[11px] text-muted-foreground truncate">Senior Manager Portal</div>
              </div>
            </div>
            <NotificationBell enabled={role === "CBO" || role === "SUPER_ADMIN"} />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <SectionLabel>{ROLE_LABELS[role]}</SectionLabel>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} pathname={pathname} onClick={close} />
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold leading-tight truncate">{userName}</div>
                <div className="truncate text-[11px] text-muted-foreground">{userEmail}</div>
              </div>
              {darkModeToggleEnabled && <DarkModeToggle />}
            </div>
            <SignOutButton />
          </div>
        </aside>

        {/* Mobile drawer */}
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={close} />
            <aside className="absolute left-0 top-0 h-full w-[78%] max-w-[300px] flex flex-col bg-card shadow-xl animate-fade-in">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center text-xs font-bold">SCP</div>
                  <span className="text-sm font-semibold">Strategic Control</span>
                </div>
                <button
                  onClick={close}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-3">
                <SectionLabel>{ROLE_LABELS[role]}</SectionLabel>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.href}>
                      <NavLink item={item} pathname={pathname} onClick={close} />
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="border-t border-border p-4">
                <div className="text-xs font-semibold">{userName}</div>
                <div className="truncate text-[11px] text-muted-foreground">{userEmail}</div>
                <SignOutButton />
              </div>
            </aside>
          </div>
        ) : null}

        <main className="px-4 pt-4 pb-24 lg:px-8 lg:pt-8 lg:pb-12 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 gap-1 border-t border-border bg-card/95 px-2 py-1 backdrop-blur safe-bottom lg:hidden">
        {bottomItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </div>
  );
}
