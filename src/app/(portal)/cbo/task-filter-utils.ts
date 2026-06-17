import type { Prisma } from "@prisma/client";

export type TaskFilterParams = {
  vertical?: string;
  priority?: string;
  team?: string;
  status?: string;
  intervention?: string;
  q?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  createdFrom?: string;
  createdTo?: string;
};

export function buildTaskWhere(params: TaskFilterParams): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};
  if (params.vertical) where.verticalId = params.vertical;
  if (params.priority) where.priorityId = params.priority;
  if (params.team) where.teamAssignments = { some: { teamId: params.team } };
  if (params.status) where.status = params.status as Prisma.EnumTaskStatusFilter["equals"];
  if (params.q) where.title = { contains: params.q, mode: "insensitive" };

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