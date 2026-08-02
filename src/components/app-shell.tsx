"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Users,
  Tags,
  Layers,
  Menu,
  X,
  Inbox,
  History,
  ToggleLeft,
  Archive,
  Database,
  Mail,
  StickyNote,
  ChevronDown,
  ShieldCheck,
  FileText,
  Briefcase,
  ExternalLink,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemRole } from "@prisma/client";
import { SignOutButton } from "@/components/sign-out-button";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; external?: boolean };
type NavSection = {
  label: string;
  items: NavItem[];
  /** When set, the section renders as a collapsible group with this header icon. */
  collapsible?: boolean;
  headerIcon?: React.ComponentType<{ className?: string }>;
  /** Path prefix that auto-expands the group when the current route is inside it. */
  basePath?: string;
};

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/verticals", label: "Verticals", icon: Layers },
  { href: "/admin/priorities", label: "Priorities", icon: Tags },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/tasks", label: "All Tasks", icon: ListChecks },
  { href: "/admin/audit", label: "Audit Log", icon: History },
  { href: "/admin/features", label: "Feature Flags", icon: ToggleLeft },
  { href: "/admin/teams", label: "Teams", icon: Users },
  { href: "/admin/emails", label: "Emails", icon: Mail },
  { href: "/admin/backup", label: "Backup & Restore", icon: Database },
  { href: "/admin/config", label: "Config", icon: Settings },
];

const CBO_NAV_ITEMS: NavItem[] = [
  { href: "/cbo", label: "Overview", icon: LayoutDashboard },
  { href: "/cbo/tasks", label: "All Tasks", icon: ListChecks },
  { href: "/cbo/parked", label: "Parking Lot", icon: Archive },
  { href: "/cbo/pages", label: "Static Pages", icon: FileText },
];

function navSectionsFor(role: SystemRole, dashboardUrl?: string): NavSection[] {
  const dashboardItem: NavItem = { href: dashboardUrl || "https://report.rankuhigher.com", label: "Dashboard", icon: ExternalLink, external: true };

  if (role === "SUPER_ADMIN") {
    return [{ label: "Super Admin", items: ADMIN_NAV_ITEMS }];
  }
  if (role === "CBO") {
    return [{ label: "Chief Business Officer", items: [...CBO_NAV_ITEMS.slice(0, 3), dashboardItem, ...CBO_NAV_ITEMS.slice(3)] }];
  }
  // SM — own section, then collapsible CBO (view-only) and Super Admin groups.
  return [
    {
      label: "Strategic Manager",
      items: [
        { href: "/sm", label: "Today", icon: LayoutDashboard },
        { href: "/sm/tasks", label: "Tasks", icon: ListChecks },
        { href: "/sm/new-task", label: "New Task", icon: Inbox },
        { href: "/sm/notes", label: "Notes from CBO", icon: StickyNote },
        { href: "/sm/parked", label: "Parking Lot", icon: Archive },
        dashboardItem,
        { href: "/sm/pages", label: "Static Pages", icon: FileText },
      ],
    },
    { label: "Chief Business Officer", items: [...CBO_NAV_ITEMS.slice(0, 3), dashboardItem, ...CBO_NAV_ITEMS.slice(3)], collapsible: true, headerIcon: Briefcase, basePath: "/cbo" },
    { label: "Super Admin", items: ADMIN_NAV_ITEMS, collapsible: true, headerIcon: ShieldCheck, basePath: "/admin" },
  ];
}

function bottomNavFor(role: SystemRole): NavItem[] {
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
    ];
  }
  return [
    { href: "/sm", label: "Today", icon: LayoutDashboard },
    { href: "/sm/tasks", label: "Tasks", icon: ListChecks },
    { href: "/sm/new-task", label: "New", icon: Inbox },
  ];
}

export function AppShell({
  children,
  role,
  userName,
  userEmail,
  darkModeToggleEnabled = false,
  dashboardUrl,
}: {
  children: React.ReactNode;
  role: SystemRole;
  userName: string;
  userEmail: string;
  darkModeToggleEnabled?: boolean;
  dashboardUrl?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sections = navSectionsFor(role, dashboardUrl);
  const bottomItems = bottomNavFor(role);

  // Each collapsible group tracks its own open state, keyed by label; a group
  // starts expanded when the current route is inside its basePath.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      sections
        .filter((s) => s.collapsible)
        .map((s) => [s.label, s.basePath ? pathname.startsWith(s.basePath) : false]),
    ),
  );
  const toggleSection = (label: string) => setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

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
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            {/* renderSlot: the CBO overview portals its Daily Follow-Up calendar into
                the slot placed right under the "Overview" link — desktop sidebar only. */}
            <SectionList sections={sections} pathname={pathname} expanded={expanded} onToggle={toggleSection} onNavigate={close} renderSlot />
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
                <SectionList sections={sections} pathname={pathname} expanded={expanded} onToggle={toggleSection} onNavigate={close} />
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

      {/* Mobile bottom nav — dynamic grid based on item count */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 grid gap-1 border-t border-border bg-card/95 px-2 py-1 backdrop-blur safe-bottom lg:hidden"
        style={{ gridTemplateColumns: `repeat(${bottomItems.length}, minmax(0, 1fr))` }}
      >
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

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-foreground hover:bg-accent"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </a>
    );
  }

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

/** Renders the nav sections — plain groups, plus collapsible groups (CBO, Super Admin). */
function SectionList({
  sections, pathname, expanded, onToggle, onNavigate, renderSlot = false,
}: {
  sections: NavSection[];
  pathname: string;
  expanded: Record<string, boolean>;
  onToggle: (label: string) => void;
  onNavigate: () => void;
  /** When set, the CBO overview's calendar-portal slot renders under the "/cbo" item. */
  renderSlot?: boolean;
}) {
  return (
    <>
      {sections.map((section) => {
        const items = (
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} pathname={pathname} onClick={onNavigate} />
                {renderSlot && item.href === "/cbo" ? <div id="sidebar-slot" /> : null}
              </li>
            ))}
          </ul>
        );

        if (!section.collapsible) {
          return (
            <div key={section.label}>
              <SectionLabel>{section.label}</SectionLabel>
              {items}
            </div>
          );
        }

        const HeaderIcon = section.headerIcon ?? ShieldCheck;
        const isOpen = expanded[section.label] ?? false;
        return (
          <div key={section.label}>
            <button
              onClick={() => onToggle(section.label)}
              className="w-full flex items-center justify-between gap-2 px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <HeaderIcon className="h-3.5 w-3.5" />
                {section.label}
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>
            {isOpen && items}
          </div>
        );
      })}
    </>
  );
}