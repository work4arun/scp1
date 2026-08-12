import type { Prisma, TaskStatus } from "@prisma/client";

export type TaskFilterParams = {
  vertical?: string | string[];
  priority?: string | string[];
  team?: string | string[];
  status?: string | string[];
  intervention?: string;
  q?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  createdFrom?: string;
  createdTo?: string;
  sort?: string;
  dir?: string;
};

/** Normalizes a param that may be a single value or a repeated-key array. */
export function toList(v: string | string[] | undefined | null): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v.filter((x) => x) : [v];
}

/**
 * Builds a URLSearchParams that preserves repeated keys (e.g. vertical=a&vertical=b).
 * Used by the client filter bar and the CBO sort links so multi-value filters survive.
 */
export function buildSearchParams(params: Record<string, string | string[] | undefined | null>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const x of v) if (x) sp.append(k, x);
    } else if (v) {
      sp.set(k, v);
    }
  }
  return sp;
}

export function buildTaskWhere(params: TaskFilterParams): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};

  const verticals = toList(params.vertical);
  const priorities = toList(params.priority);
  const teams = toList(params.team);
  const statuses = toList(params.status);

  if (verticals.length > 0) where.verticalId = { in: verticals };
  if (priorities.length > 0) where.priorityId = { in: priorities };
  if (teams.length > 0) where.teamAssignments = { some: { teamId: { in: teams } } };
  if (statuses.length > 0) where.status = { in: statuses as TaskStatus[] };
  if (params.q) where.OR = [{ title: { contains: params.q, mode: "insensitive" } }, { code: { contains: params.q, mode: "insensitive" } }];

  if (params.deadlineFrom || params.deadlineTo) {
    const deadline: Prisma.DateTimeNullableFilter = {};
    if (params.deadlineFrom) deadline.gte = new Date(params.deadlineFrom);
    if (params.deadlineTo) { const to = new Date(params.deadlineTo); to.setDate(to.getDate() + 1); deadline.lt = to; } else { deadline.not = null; }
    where.deadline = deadline;
  }
  if (params.createdFrom || params.createdTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (params.createdFrom) createdAt.gte = new Date(params.createdFrom);
    if (params.createdTo) { const to = new Date(params.createdTo); to.setDate(to.getDate() + 1); createdAt.lt = to; }
    where.createdAt = createdAt;
  }
  return where;
}
