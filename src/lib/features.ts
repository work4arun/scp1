// ─────────────────────────────────────────────────────────────────────────────
//  Feature Flags
// ─────────────────────────────────────────────────────────────────────────────
//  Source of truth: the FeatureFlag table in Postgres.
//  Toggled exclusively from /admin/features by SUPER_ADMIN.
//
//  All keys are registered here. The seed script and the admin page both read
//  this registry, so adding a flag is a one-line change in FLAG_REGISTRY plus
//  whatever code references `isEnabled("...")`.
//
//  Defaults:
//    - Every flag ships DISABLED on first boot. Operators turn things on as
//      they validate them in their environment.
//    - `core.feature_flags` is a sentinel — when set to false, the runtime
//      treats everything as off (kill-switch).
// ─────────────────────────────────────────────────────────────────────────────

import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type FlagCategory = "core" | "security" | "workflow" | "ux" | "scale" | "ai";

export type FlagKey =
  // Core
  | "feature_flags_enforced"
  // Security & infrastructure
  | "audit_log_v2"
  | "zod_validation"
  // Scale primitives
  | "task_pagination"
  | "task_bulk_actions"
  | "csv_export"
  // Workflow
  | "drop_reason"
  | "boss_instruction_workflow"
  | "parking_auto_promote"
  | "sla_engine"
  | "saved_views"
  | "notification_preferences"
  // UX polish
  | "breadcrumbs"
  | "dark_mode_toggle"
  | "toasts"
  | "route_error_boundaries"
  | "optimistic_ui"
  // Backup & Restore
  | "backup_restore";

export type FlagDefinition = {
  key: FlagKey;
  category: FlagCategory;
  label: string;
  description: string;
  /** Default state when the seeder bootstraps the row. */
  defaultEnabled?: boolean;
};

export const FLAG_REGISTRY: FlagDefinition[] = [
  // ────────── Core ──────────
  {
    key: "feature_flags_enforced",
    category: "core",
    label: "Enforce Feature Flags",
    description:
      "Master kill-switch. When OFF, every other flag is treated as disabled regardless of its stored value. Useful for rollback in an incident.",
    defaultEnabled: true,
  },

  // ────────── Security ──────────
  {
    key: "audit_log_v2",
    category: "security",
    label: "Comprehensive Audit Log",
    description:
      "Records every mutation (create, update, delete) routed through lib/audit.ts with before/after JSON snapshots, IP, and user-agent.",
  },
  {
    key: "zod_validation",
    category: "security",
    label: "Strict Input Validation (Zod)",
    description:
      "Runs server-action FormData through Zod schemas before touching the database. Reject malformed input with a structured error.",
  },

  // ────────── Scale ──────────
  {
    key: "task_pagination",
    category: "scale",
    label: "Cursor Pagination on Task Register",
    description:
      "Replaces the hard cap of 200 rows with cursor-based pagination plus server-side sort. Required at >5k tasks.",
  },
  {
    key: "task_bulk_actions",
    category: "scale",
    label: "Bulk Actions on Tasks",
    description:
      "Multi-select checkboxes on the task register with a sticky toolbar (bulk drop, bulk reassign owner role).",
  },
  {
    key: "csv_export",
    category: "scale",
    label: "CSV Export",
    description:
      "Download buttons on Task Register, Audit Log, and Weekly Summary. Streams CSV via /api/export/*.",
  },

  // ────────── Workflow ──────────
  {
    key: "drop_reason",
    category: "workflow",
    label: "Capture Reason on Drop",
    description:
      "When a task is dropped, prompt for and store a reason on Task.dropReason. Visible in the Dropped Archive.",
  },
  {
    key: "boss_instruction_workflow",
    category: "workflow",
    label: "Boss Instruction Activation Flow",
    description:
      "Adds an Activate / Park / Close action set on each Boss Instruction. Activate spawns a draft Task and links it via Task.sourceInstructionId.",
  },
  {
    key: "parking_auto_promote",
    category: "workflow",
    label: "Parking → Task Auto-Promote",
    description:
      "When CBO sets a Parking Lot decision to Activate, instantly draft a linked Task pre-filled with the idea, vertical, and impact/urgency.",
  },
  {
    key: "sla_engine",
    category: "workflow",
    label: "SLA Engine",
    description:
      "Computes a slaDueAt per task from priority cadence (P1=24h, P2=72h, P3=7d, P4=14d). Surfaces SLA-breached tasks on dashboards.",
  },
  {
    key: "saved_views",
    category: "workflow",
    label: "Saved Filter Views",
    description:
      "Lets each user pin filter combinations on the Task Register and reopen them from the sidebar. (Phase 2 — UI scaffold lands now.)",
  },
  {
    key: "notification_preferences",
    category: "workflow",
    label: "Per-User Notification Preferences",
    description:
      "Adds a /preferences page where each user can mute classes of in-app notifications. (Phase 2 — UI scaffold lands now.)",
  },

  // ────────── UX ──────────
  {
    key: "breadcrumbs",
    category: "ux",
    label: "Breadcrumb Trail",
    description: "Shows a breadcrumb above every portal page derived from the URL.",
  },
  {
    key: "dark_mode_toggle",
    category: "ux",
    label: "Dark Mode Toggle",
    description: "Adds a sun/moon button in the sidebar footer that flips the Tailwind dark class.",
  },
  {
    key: "toasts",
    category: "ux",
    label: "Toast Notifications",
    description:
      "Mounts the shadcn Toaster. Server actions can emit ephemeral success / error toasts.",
  },
  {
    key: "route_error_boundaries",
    category: "ux",
    label: "Per-Route Error Boundaries",
    description:
      "Drops a friendly error.tsx into each portal segment so a thrown error in one panel does not blank the page.",
  },
  {
    key: "optimistic_ui",
    category: "ux",
    label: "Optimistic UI on Mutations",
    description:
      "Where applicable (status change, intervention resolve) updates the UI before the server round-trip completes.",
  },

  // ────────── Backup & Restore (destructive — keep OFF until needed) ──────────
  {
    key: "backup_restore",
    category: "security",
    label: "Database Backup & Restore",
    description:
      "Adds /admin/backup with a one-click pg_dump download and a password-gated restore from a .sql file. Requires `pg_dump` and `psql` binaries on the server's PATH and a valid DATABASE_URL.",
  },
];

const REGISTRY_BY_KEY: Record<FlagKey, FlagDefinition> = Object.fromEntries(
  FLAG_REGISTRY.map((f) => [f.key, f]),
) as Record<FlagKey, FlagDefinition>;

export function getFlagDefinition(key: FlagKey): FlagDefinition {
  return REGISTRY_BY_KEY[key];
}

// ────────── Runtime gate ──────────
//
// `loadFlags` is wrapped in React.cache so that within a single render pass we
// hit the database once. Across requests we always re-read so that an admin
// toggle takes effect immediately.

const loadFlags = cache(async (): Promise<Record<string, boolean>> => {
  try {
    const rows = (await prisma.featureFlag.findMany({
      select: { key: true, enabled: true },
    })) as Array<{ key: string; enabled: boolean }>;
    return Object.fromEntries(rows.map((r) => [r.key, r.enabled]));
  } catch {
    // Migration not yet applied — treat everything as off, but keep the kill
    // switch ON so the app still boots and the operator can run db:push.
    return { feature_flags_enforced: true };
  }
});

/**
 * Returns true iff the named flag is enabled in the database AND the master
 * kill-switch is ON. Use this in server components and server actions.
 *
 * When a flag row is missing entirely (fresh DB, seeder skipped) we fall back
 * to the registry's `defaultEnabled` instead of treating the flag as off.
 * Without this fallback the kill-switch (`feature_flags_enforced`) was being
 * read as `false` on every fresh deployment, which disabled every other flag
 * including features required for basic operation.
 */
export async function isEnabled(key: FlagKey): Promise<boolean> {
  const flags = await loadFlags();
  const def = REGISTRY_BY_KEY[key];
  const resolve = (k: FlagKey) => {
    if (k in flags) return Boolean(flags[k]);
    return Boolean(REGISTRY_BY_KEY[k]?.defaultEnabled);
  };
  if (!resolve("feature_flags_enforced")) return false;
  if (key === "feature_flags_enforced") return true;
  return def ? resolve(key) : false;
}

/**
 * Throws "FeatureDisabled" if the flag is off. Use to guard server actions
 * whose surface area should disappear when the flag is off.
 */
export async function requireFeature(key: FlagKey): Promise<void> {
  if (!(await isEnabled(key))) {
    const err = new Error(`Feature "${key}" is disabled`);
    (err as Error & { code?: string }).code = "FeatureDisabled";
    throw err;
  }
}

/**
 * Returns the full flag map for a request. Use in layout / shell components
 * that need to branch on multiple flags at once.
 *
 * As with `isEnabled`, missing rows fall back to the registry's defaults so
 * a never-seeded prod DB doesn't kill every gated feature.
 */
export async function loadAllFlags(): Promise<Record<FlagKey, boolean>> {
  const flags = await loadFlags();
  const resolve = (key: FlagKey) =>
    key in flags ? Boolean(flags[key]) : Boolean(REGISTRY_BY_KEY[key]?.defaultEnabled);
  const enforced = resolve("feature_flags_enforced");
  const out = {} as Record<FlagKey, boolean>;
  for (const def of FLAG_REGISTRY) {
    out[def.key] = enforced && (def.key === "feature_flags_enforced" ? true : resolve(def.key));
  }
  return out;
}
