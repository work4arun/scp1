// Helpers shared by the filter bar UI and the page query builder.

import type { Prisma, TaskStatus, TaskSource, InterventionFlag } from "@prisma/client";

export type TaskFilterParams = {
  q?: string;
  vertical?: string;     // vertical CODE
  subVertical?: string;  // sub-vertical id
  priority?: string;     // priority CODE
  status?: string;       // TaskStatus
  ownerRole?: string;    // OwnerRole id
  ownerUser?: string;    // User id, or "__unassigned__"
  source?: string;       // TaskSource
  intervention?: string; // InterventionFlag
  deadline?: string;     // "overdue" | "today" | "this_week" | "no_deadline"
  // ── Date filter (exact-day picker) ──────────────────────────────────────
  dateType?: string;     // "assigned" | "deadline_exact"
  dateValue?: string;    // ISO date string "YYYY-MM-DD"
};

const VALID_STATUSES = new Set<TaskStatus>([
  "NOT_STARTED", "IN_PROGRESS", "WAITING_FOR_INPUT", "WAITING_FOR_APPROVAL",
  "DELAYED", "COMPLETED", "PARKED", "DROPPED",
]);
const VALID_SOURCES = new Set<TaskSource>([
  "BOSS_INSTRUCTION", "WHATSAPP_GROUP", "MANAGEMENT_MEETING", "DEPARTMENT_MEETING",
  "MARKETING_REVIEW", "MRM", "PLACEMENT_REVIEW", "RTC_REVIEW", "DIGITAL_REVIEW",
  "SELF_STRATEGY", "NEW_IDEA",
]);
const VALID_INTERVENTIONS = new Set<InterventionFlag>(["NO", "YES", "ONLY_IF_DELAYED"]);

/**
 * Build a Prisma `where` clause for the active task list given the URL params.
 * Caller is responsible for ANDing additional constraints (e.g. excluding
 * DROPPED tasks) on top.
 */
export function buildTaskWhere(params: TaskFilterParams): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};

  // Free-text search across title, description, code.
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { title:       { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { code:        { contains: q, mode: "insensitive" } },
    ];
  }

  if (params.vertical)    where.vertical = { code: params.vertical };
  if (params.subVertical) where.subVerticalId = params.subVertical;
  if (params.priority)    where.priority = { code: params.priority };

  if (params.status && VALID_STATUSES.has(params.status as TaskStatus)) {
    where.status = params.status as TaskStatus;
  }
  if (params.source && VALID_SOURCES.has(params.source as TaskSource)) {
    where.source = params.source as TaskSource;
  }
  if (params.intervention && VALID_INTERVENTIONS.has(params.intervention as InterventionFlag)) {
    where.intervention = params.intervention as InterventionFlag;
  }
  if (params.ownerRole) {
    where.ownerRoleId = params.ownerRole;
  }
  if (params.ownerUser) {
    if (params.ownerUser === "__unassigned__") where.ownerUserId = null;
    else where.ownerUserId = params.ownerUser;
  }

  // Deadline state filter. We reset to start-of-day to keep the boundaries
  // predictable across renders.
  if (params.deadline) {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday); endToday.setDate(endToday.getDate() + 1);
    const endWeek = new Date(startToday); endWeek.setDate(endWeek.getDate() + 7);

    switch (params.deadline) {
      case "overdue":
        where.deadline = { lt: startToday };
        break;
      case "today":
        where.deadline = { gte: startToday, lt: endToday };
        break;
      case "this_week":
        where.deadline = { gte: startToday, lt: endWeek };
        break;
      case "no_deadline":
        where.deadline = null;
        break;
    }
  }

  // Exact-date filter — "Assigned Date" or "Deadline Date" + a YYYY-MM-DD value.
  // Both params must be present together to be meaningful.
  if (params.dateType && params.dateValue && /^\d{4}-\d{2}-\d{2}$/.test(params.dateValue)) {
    const dayStart = new Date(`${params.dateValue}T00:00:00.000Z`);
    const dayEnd   = new Date(`${params.dateValue}T00:00:00.000Z`);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    if (params.dateType === "assigned") {
      where.createdAt = { gte: dayStart, lt: dayEnd };
    } else if (params.dateType === "deadline_exact") {
      where.deadline = { gte: dayStart, lt: dayEnd };
    }
  }

  return where;
}
