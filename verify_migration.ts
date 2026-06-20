import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const [users, verticals, priorities, teams, members, tasks, teamAssigns, memberAssigns] =
    await Promise.all([
      p.user.count(),
      p.vertical.count(),
      p.priority.count(),
      p.team.count(),
      p.teamMember.count(),
      p.task.count(),
      p.taskTeamAssignment.count(),
      p.taskAssignment.count(),
    ]);

  console.log("===== COUNTS =====");
  console.log("Users:                ", users);
  console.log("Verticals:            ", verticals);
  console.log("Priorities:           ", priorities);
  console.log("Teams:                ", teams);
  console.log("TeamMembers:          ", members);
  console.log("Tasks:                ", tasks);
  console.log("TaskTeamAssignments:  ", teamAssigns);
  console.log("TaskAssignments:      ", memberAssigns);

  const verts = await p.vertical.findMany({
    include: { _count: { select: { tasks: true } } },
  });
  console.log("\n===== VERTICAL → TASK COUNT =====");
  for (const v of verts) {
    console.log(`  ${v.code.padEnd(8)} ${v._count.tasks} tasks`);
  }

  const teamsList = await p.team.findMany({
    include: { _count: { select: { taskAssignments: true } } },
  });
  console.log("\n===== TEAM → ASSIGNMENT COUNT =====");
  const withAssignments = teamsList.filter((t) => t._count.taskAssignments > 0);
  for (const t of withAssignments) {
    console.log(`  ${t.name.padEnd(30)} ${t._count.taskAssignments}`);
  }
  console.log(`  (${withAssignments.length} of ${teamsList.length} teams have assignments)`);

  // Show users
  const userList = await p.user.findMany({ select: { email: true, name: true, systemRole: true } });
  console.log("\n===== USERS =====");
  for (const u of userList) {
    console.log(`  ${u.email.padEnd(25)} ${u.name.padEnd(20)} ${u.systemRole}`);
  }

  // Sample tasks
  const sampleTasks = await p.task.findMany({
    take: 5,
    include: {
      vertical: { select: { code: true } },
      teamAssignments: { include: { team: { select: { name: true } } } },
      assignees: { include: { member: { select: { name: true, email: true } } } },
    },
  });
  console.log("\n===== SAMPLE TASKS =====");
  for (const t of sampleTasks) {
    const teams = t.teamAssignments.map((a) => a.team.name).join(", ");
    const members = t.assignees.map((a) => a.member.name).join(", ");
    console.log(`  [${t.code}] ${t.title.substring(0, 50)}`);
    console.log(`    Status: ${t.status} | Vertical: ${t.vertical.code}`);
    console.log(`    Teams: ${teams || "none"} | Members: ${members || "none"}`);
  }
}

main()
  .then(() => p.$disconnect())
  .catch((e) => {
    console.error(e);
    p.$disconnect();
    process.exit(1);
  });