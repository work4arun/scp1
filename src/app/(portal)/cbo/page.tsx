import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewCbo } from "@/lib/rbac";
import { FollowUpCalendar, DailyFollowUpPanel, buildFollowUpModel } from "./daily-followup";
import { SidebarSlot } from "./sidebar-slot";
import { monthRangeUtc, parseMonthKey } from "@/lib/followups";

export default async function CboHome({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await auth();
  if (!canViewCbo(session?.user.systemRole) || !session?.user.id) redirect("/");

  // Daily follow-up calendar: ?m=YYYY-MM picks the month, ?d=YYYY-MM-DD the open day.
  const { year, month } = parseMonthKey(searchParams.m);
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.d ?? "") ? searchParams.d! : null;
  const followUpView = searchParams.fv === "vertical" ? "vertical" : "table";
  const monthRange = monthRangeUtc(year, month);

  // Every SM update filed in the displayed month — the calendar buckets these by
  // local date. The range is padded a day either side; `dayKey()` does the exact
  // timezone bucketing (see lib/followups.ts).
  const monthUpdates = await prisma.taskUpdate.findMany({
    where: { createdAt: { gte: monthRange.gte, lt: monthRange.lt }, task: { status: { not: "DROPPED" } } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, createdAt: true, note: true, newStatus: true,
      files: { select: { id: true, fileName: true, fileMime: true, fileSize: true }, orderBy: { createdAt: "asc" } },
      author: { select: { name: true } },
      task: {
        select: {
          id: true, code: true, title: true, status: true, vertical: true,
          priority: { select: { code: true } },
          // Assigned teams carry the owner column; each team's head is the named person.
          teamAssignments: { include: { team: { include: { members: { where: { isHead: true }, select: { name: true } } } } } },
          assignees: { include: { member: { select: { name: true } } } },
        },
      },
    },
  });

  const followUpModel = buildFollowUpModel(
    monthUpdates.map((u) => ({
      id: u.id,
      createdAt: u.createdAt,
      note: u.note,
      newStatus: u.newStatus,
      authorName: u.author.name,
      files: u.files,
      task: {
        id: u.task.id,
        code: u.task.code,
        title: u.task.title,
        status: u.task.status,
        vertical: { id: u.task.vertical.id, name: u.task.vertical.name, colorHex: u.task.vertical.colorHex, sortOrder: u.task.vertical.sortOrder },
        priority: { code: u.task.priority.code },
        teams: u.task.teamAssignments.map((ta) => ({ name: ta.team.name, head: ta.team.members[0]?.name ?? null })),
        members: u.task.assignees.map((a) => a.member.name),
      },
    })),
    year,
    month,
    selectedDay,
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* On lg+ the calendar is portalled into the app-shell sidebar, under Static
          Pages, and exists only while this page is mounted. Below lg the sidebar is
          hidden, so it renders inline here instead. */}
      <SidebarSlot>
        <div className="mt-1.5 mb-2">
          <FollowUpCalendar model={followUpModel} year={year} month={month} searchParams={searchParams} />
        </div>
      </SidebarSlot>

      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Good day, {session.user.name?.split(" ")[0] || "Dr. BN"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview — monitor all tasks across verticals.</p>
      </div>

      <div className="mx-auto w-full max-w-[280px] lg:hidden">
        <FollowUpCalendar model={followUpModel} year={year} month={month} searchParams={searchParams} />
      </div>

      {/* Date-wise follow-up register — the whole of this page. The full task
          register lives at /cbo/tasks, reachable from the sidebar. */}
      <DailyFollowUpPanel
        model={followUpModel}
        year={year}
        month={month}
        view={followUpView}
        searchParams={searchParams}
      />
    </div>
  );
}
