"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

// Pretty-label table for known segments. Anything not listed gets title-cased.
const LABELS: Record<string, string> = {
  cbo: "CBO",
  sm: "Strategic Manager",
  admin: "Super Admin",
  daily: "Daily",
  weekly: "Weekly",
  intervention: "Decisions",
  parking: "Parking Lot",
  verticals: "Verticals",
  "sub-verticals": "Sub-Verticals",
  priorities: "Priorities",
  roles: "Owner Roles",
  users: "Users",
  tasks: "Tasks",
  audit: "Audit Log",
  features: "Feature Flags",
  boss: "Boss Register",
  "new-task": "New Task",
  dropped: "Dropped Archive",
  calendar: "Calendar",
};

function labelFor(segment: string): string {
  if (LABELS[segment]) return LABELS[segment];
  // Cuid-ish ids are noisy — collapse to "Detail".
  if (/^[a-z0-9]{20,}$/.test(segment)) return "Detail";
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Skip rendering on root home (login or homepage).
  if (segments.length === 0) return null;

  const trail = segments.map((seg, i) => ({
    href: "/" + segments.slice(0, i + 1).join("/"),
    label: labelFor(seg),
  }));

  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
      <Link href="/" className="inline-flex items-center hover:text-foreground" aria-label="Home">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {trail.map((node, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={node.href} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3 w-3 opacity-60" />
            {isLast ? (
              <span className="font-semibold text-foreground" aria-current="page">
                {node.label}
              </span>
            ) : (
              <Link href={node.href} className="hover:text-foreground">
                {node.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
