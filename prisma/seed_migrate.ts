/**
 * Migration Seed Script v2 — Correct Team Structure
 *
 * Teams & Members:
 *   Admission Marketing    → Pandi Elavarasan M <pandielavarasan@rathinam.in>, Ramesh D <ramesh.mech@rathinam.in>
 *   RAALE                  → Dr. R. Arunkumar <rarunkumar@rathinam.in>
 *   R-smart                → Manju S <manju.coe@rathinam.in>
 *   RGU                    → Dr Krishnaraj C <registrar@rathinam.in>
 *   Events                 → Jimry Henry <jimryhenry@rathinam.in>
 *   RTC                    → Dr. Geetha C <vp.rtc@rathinam.in>
 *   Placements             → Dr. Sivasubramaniam S <sivasubramanian.rtc@rathinam.in>
 *   Creative               → (no members)
 *   Research & Development → Dr Sabareesh K P V <dean.rd@rathinam.in>
 *   MBA                    → Dr. Arunraj Manickaraj <associatedean.businesspg@rathinam.in>
 *   Digital Marketing      → Digital Marketing Manager <dmm@rathinam.in>
 *
 * Old → New mapping:
 *   Academic Head           → Creative
 *   Admission Manager       → Admission Marketing
 *   Aruna                   → Research & Development
 *   Arunraaj Manickaraj     → MBA
 *   Digital Marketing Lead  → Digital Marketing
 *   Dr.Arun Kumar           → RAALE
 *   Dr.Krishnaraj           → RGU
 *   Dr.Raje                 → RAALE
 *   Dr.Sivasubramaniam      → Placements
 *   Marketing Head          → Admission Marketing
 *   Meghala                 → Admission Marketing
 *   Pandi Elavarasan        → Admission Marketing
 *   RTC Head                → RTC
 *   Ramesh                  → Admission Marketing
 *   Sabareesh               → Research & Development
 *   Sathishanandan          → Digital Marketing
 *   Senior Manager          → Creative
 *   Team Leader             → Creative
 *   Udhaykumar              → Creative
 */

import { PrismaClient, TaskStatus, TaskSource, InterventionFlag } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ── Types ──
interface CsvRow {
  s_no: string;
  task_title: string;
  status: string;
  deadline: string;
  frequency: string;
  intervention: string;
  expected_output: string;
  vertical_name: string;
  vertical_code: string;
  priority_code: string;
  team_name: string;
  member_email: string;
  member_name: string;
}

function parseCsv(filepath: string): CsvRow[] {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || "").trim(); });
    rows.push(row as unknown as CsvRow);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

function mapStatus(s: string): TaskStatus {
  const m: Record<string, TaskStatus> = {
    NOT_STARTED: "NOT_STARTED", IN_PROGRESS: "IN_PROGRESS",
    WAITING_FOR_INPUT: "WAITING_FOR_INPUT", WAITING_FOR_APPROVAL: "WAITING_FOR_APPROVAL",
    DELAYED: "DELAYED", COMPLETED: "COMPLETED", PARKED: "PARKED", DROPPED: "DROPPED",
  };
  return m[s] || "NOT_STARTED";
}

function mapIntervention(v: string): InterventionFlag {
  if (v === "YES") return "YES";
  if (v === "ONLY_IF_DELAYED") return "ONLY_IF_DELAYED";
  return "NO";
}

function parseDate(v: string): Date | null {
  if (!v || v === "\\N") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// ── TEAM DEFINITIONS ──
const TEAM_DEFS: { name: string; description: string; members: { name: string; email: string }[] }[] = [
  {
    name: "Admission Marketing",
    description: "Admissions, branding, lead gen, walk-in conversion",
    members: [
      { name: "Pandi Elavarasan M", email: "pandielavarasan@rathinam.in" },
      { name: "Ramesh D", email: "ramesh.mech@rathinam.in" },
    ],
  },
  {
    name: "RAALE",
    description: "RAALE — Learning Ecosystem",
    members: [
      { name: "Dr. R. Arunkumar", email: "rarunkumar@rathinam.in" },
    ],
  },
  {
    name: "R-smart",
    description: "R-Smart CoE Hub",
    members: [
      { name: "Manju S", email: "manju.coe@rathinam.in" },
    ],
  },
  {
    name: "RGU",
    description: "RGU — Programme operations & academics",
    members: [
      { name: "Dr Krishnaraj C", email: "registrar@rathinam.in" },
    ],
  },
  {
    name: "Events",
    description: "Events & Campus Life",
    members: [
      { name: "Jimry Henry", email: "jimryhenry@rathinam.in" },
    ],
  },
  {
    name: "RTC",
    description: "RTC — Rathinam Technical Campus",
    members: [
      { name: "Dr. Geetha C", email: "vp.rtc@rathinam.in" },
    ],
  },
  {
    name: "Placements",
    description: "Placements & Corporate Relations",
    members: [
      { name: "Dr. Sivasubramaniam S", email: "sivasubramanian.rtc@rathinam.in" },
    ],
  },
  {
    name: "Creative",
    description: "Creative, Design & Branding",
    members: [],
  },
  {
    name: "Research & Development",
    description: "Research, Ranking, Publications",
    members: [
      { name: "Dr Sabareesh K P V", email: "dean.rd@rathinam.in" },
    ],
  },
  {
    name: "MBA",
    description: "MBA & Business PG Programmes",
    members: [
      { name: "Dr. Arunraj Manickaraj", email: "associatedean.businesspg@rathinam.in" },
    ],
  },
  {
    name: "Digital Marketing",
    description: "Digital ads, SEO, social media campaigns",
    members: [
      { name: "Digital Marketing Manager", email: "dmm@rathinam.in" },
    ],
  },
];

// ── OLD TEAM NAME → NEW TEAM NAME ──
const TEAM_MAP: Record<string, string> = {
  "Academic Head":           "Creative",
  "Admission Manager":       "Admission Marketing",
  "Aruna":                   "Research & Development",
  "Arunraaj Manickaraj":     "MBA",
  "Digital Marketing Lead":  "Digital Marketing",
  "Dr.Arun Kumar":           "RAALE",
  "Dr.Krishnaraj":           "RGU",
  "Dr.Raje":                 "RAALE",
  "Dr.Sivasubramaniam":      "Placements",
  "Marketing Head":          "Admission Marketing",
  "Meghala":                 "Admission Marketing",
  "Pandi Elavarasan":        "Admission Marketing",
  "RTC Head":                "RTC",
  "Ramesh":                  "Admission Marketing",
  "Sabareesh":               "Research & Development",
  "Sathishanandan":          "Digital Marketing",
  "Senior Manager":          "Creative",
  "Team Leader":             "Creative",
  "Udhaykumar":              "Creative",
};

async function main() {
  console.log("══════════════════════════════════════════════");
  console.log("  MIGRATION SEED v2 — Correct Team Structure");
  console.log("══════════════════════════════════════════════\n");

  // ── 0. CLEAR ALL ──
  console.log("0. Clearing existing data...");
  await prisma.taskAssignment.deleteMany();
  await prisma.taskTeamAssignment.deleteMany();
  await prisma.taskMessage.deleteMany();
  await prisma.taskUpdate.deleteMany();
  await prisma.cboNote.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.externalAccessToken.deleteMany();
  await prisma.pin.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.vertical.deleteMany();
  await prisma.priority.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.smtpConfig.deleteMany();
  await prisma.user.deleteMany();
  console.log("   ✓ Done.\n");

  // ── 1. USERS ──
  console.log("1. Seeding users...");
  const superAdmin = await prisma.user.create({
    data: {
      email: "super@rathinam.in", name: "Super Admin",
      passwordHash: await bcrypt.hash("sd_1234", 10), systemRole: "SUPER_ADMIN",
    },
  });
  console.log(`   ✓ super@rathinam.in / sd_1234`);
  const cbo = await prisma.user.create({
    data: {
      email: "cbo@rathinam.in", name: "Dr. BN (CBO)",
      passwordHash: await bcrypt.hash("cbo_1234", 10), systemRole: "CBO",
    },
  });
  console.log(`   ✓ cbo@rathinam.in / cbo_1234`);
  const sm = await prisma.user.create({
    data: {
      email: "sm@rathinam.in", name: "Senior Manager",
      passwordHash: await bcrypt.hash("sm_1234", 10), systemRole: "SM",
    },
  });
  console.log(`   ✓ sm@rathinam.in / sm_1234\n`);

  // ── 2. PRIORITIES ──
  console.log("2. Seeding priorities...");
  const priorityMap: Record<string, string> = {};
  const priorities = [
    { code: "P1", label: "Critical", description: "Must be reviewed by Dr. BN", reviewCadence: "Daily tracking", colorHex: "#ef4444", rank: 1 },
    { code: "P2", label: "Important", description: "Team can execute with direction", reviewCadence: "Twice-a-week review", colorHex: "#f59e0b", rank: 2 },
    { code: "P3", label: "Operational", description: "Senior Manager tracks", reviewCadence: "Weekly review", colorHex: "#0ea5e9", rank: 3 },
    { code: "P4", label: "Parked", description: "Future idea, not immediate execution", reviewCadence: "Monthly review only", colorHex: "#6b7280", rank: 4 },
  ];
  for (const p of priorities) {
    const created = await prisma.priority.create({ data: p });
    priorityMap[p.code] = created.id;
  }
  console.log(`   ✓ ${priorities.length} priorities\n`);

  // ── 3. VERTICALS ──
  console.log("3. Seeding verticals from CSV...");
  const csvPath = path.join(__dirname, "..", "csv_exports", "clean", "tasks_master.csv");
  const rows = parseCsv(csvPath);
  console.log(`   Read ${rows.length} rows`);

  const uniqueVerticals = new Map<string, { name: string; code: string }>();
  for (const r of rows) {
    if (!uniqueVerticals.has(r.vertical_code)) {
      uniqueVerticals.set(r.vertical_code, { name: r.vertical_name, code: r.vertical_code });
    }
  }
  const vCodes = Array.from(uniqueVerticals.keys()).sort();
  const verticalMap: Record<string, string> = {};
  const vColors: Record<string, string> = {
    MKT: "#4f46e5", RGU: "#7c3aed", CRT: "#da0b7a", RTC: "#0ea5e9",
    PLC: "#10b981", AIC: "#f59e0b", RAALE: "#008cb4", FDMPA: "#9f1bd0",
    RSH: "#4ce6d4", REG: "#69892f", SSP: "#ef4444",
  };
  for (const code of vCodes) {
    const v = uniqueVerticals.get(code)!;
    const created = await prisma.vertical.create({
      data: { name: v.name, code: v.code, colorHex: vColors[code] || "#4f46e5", sortOrder: 0 },
    });
    verticalMap[code] = created.id;
    console.log(`   ✓ ${code} — ${v.name}`);
  }
  console.log();

  // ── 4. FEATURE FLAGS ──
  console.log("4. Seeding feature flags...");
  const flags = [
    { key: "dark_mode_toggle", category: "ux", label: "Dark Mode Toggle", description: "Enables the dark/light mode toggle" },
    { key: "breadcrumbs", category: "ux", label: "Breadcrumbs", description: "Shows breadcrumb navigation" },
    { key: "toasts", category: "ux", label: "Toast Notifications", description: "Shows success/error toasts" },
    { key: "sla_engine", category: "workflow", label: "SLA Engine", description: "Computes SLA deadlines" },
    { key: "audit_log_v2", category: "security", label: "Audit Log v2", description: "Before/after snapshots" },
    { key: "csv_export", category: "scale", label: "CSV Export", description: "Export tasks as CSV" },
    { key: "task_bulk_actions", category: "workflow", label: "Bulk Task Actions", description: "Multi-select on task lists" },
    { key: "drop_reason", category: "workflow", label: "Drop Reason Required", description: "Reason when dropping tasks" },
    { key: "parking_auto_promote", category: "workflow", label: "Parking Auto-Promote", description: "CBO activates parking items as tasks" },
  ];
  for (const f of flags) { await prisma.featureFlag.create({ data: f }); }
  console.log(`   ✓ ${flags.length} flags\n`);

  // ── 5. TEAMS + TEAM MEMBERS ──
  console.log("5. Seeding teams & members...");
  const teamNameMap: Record<string, string> = {}; // team_name → team.id
  const teamMemberMap: Record<string, string> = {}; // "team_name::email" → member.id

  for (const td of TEAM_DEFS) {
    const team = await prisma.team.create({
      data: { name: td.name, description: td.description },
    });
    teamNameMap[td.name] = team.id;
    console.log(`   ✓ Team: ${td.name}`);

    for (const m of td.members) {
      const member = await prisma.teamMember.create({
        data: { teamId: team.id, name: m.name, email: m.email },
      });
      teamMemberMap[`${td.name}::${m.email}`] = member.id;
      console.log(`      ↳ ${m.name} <${m.email}>`);
    }
  }
  console.log(`   ✓ ${TEAM_DEFS.length} teams, ${Object.keys(teamMemberMap).length} members\n`);

  // ── 6. TASKS ──
  console.log("6. Seeding tasks with corrected team assignments...");
  const vCounter: Record<string, number> = {};
  let taskCount = 0, assignCount = 0, skippedCount = 0;

  for (const row of rows) {
    const vcode = row.vertical_code;
    vCounter[vcode] = (vCounter[vcode] || 0) + 1;
    const taskCode = `${vcode}-${String(vCounter[vcode]).padStart(3, "0")}`;
    const deadline = parseDate(row.deadline);

    const rawRow = row as unknown as Record<string, string>;
    const originalCreatedAt = parseDate(rawRow["created_at"]);

    const task = await prisma.task.create({
      data: {
        code: taskCode,
        title: row.task_title,
        status: mapStatus(row.status),
        source: "SELF_STRATEGY" as TaskSource,
        verticalId: verticalMap[vcode],
        priorityId: priorityMap[row.priority_code] || priorityMap["P3"],
        createdById: sm.id,
        deadline: deadline || undefined,
        frequency: row.frequency || undefined,
        intervention: mapIntervention(row.intervention),
        expectedOutput: row.expected_output || undefined,
        createdAt: originalCreatedAt || new Date(),
      },
    });

    // Look up new team name from old team name
    if (row.team_name && TEAM_MAP[row.team_name]) {
      const newTeamName = TEAM_MAP[row.team_name];
      const teamId = teamNameMap[newTeamName];
      if (teamId) {
        await prisma.taskTeamAssignment.create({
          data: { taskId: task.id, teamId },
        });
        assignCount++;
      } else {
        skippedCount++;
      }
    } else if (row.team_name && !TEAM_MAP[row.team_name]) {
      // Old team name not in mapping — skip
      skippedCount++;
    }

    // Assign member if they exist in the new team
    if (row.member_email && row.team_name && TEAM_MAP[row.team_name]) {
      const newTeamName = TEAM_MAP[row.team_name];
      // Try to find a matching member by email in the new team
      for (const td of TEAM_DEFS) {
        if (td.name === newTeamName) {
          for (const m of td.members) {
            if (m.email.toLowerCase() === row.member_email.toLowerCase()) {
              const memberKey = `${newTeamName}::${m.email}`;
              if (teamMemberMap[memberKey]) {
                await prisma.taskAssignment.create({
                  data: { taskId: task.id, memberId: teamMemberMap[memberKey] },
                });
                assignCount++;
              }
            }
          }
        }
      }
    }

    taskCount++;
    if (taskCount % 50 === 0) console.log(`   ... ${taskCount} tasks`);
  }
  console.log(`   ✓ ${taskCount} tasks, ${assignCount} assignments`);
  if (skippedCount > 0) console.log(`   ⚠ ${skippedCount} tasks with unmapped old teams (skipped assignment)`);

  // ── 7. SMTP CONFIG ──
  console.log("\n7. Seeding SMTP config (placeholder)...");
  await prisma.smtpConfig.create({
    data: {
      host: "smtp.example.com", port: 587, secure: false,
      user: "noreply@example.com", pass: "placeholder", from: "SCP <noreply@example.com>",
    },
  });
  console.log("   ✓ Done.\n");

  // ── SUMMARY ──
  console.log("══════════════════════════════════════════════");
  console.log("  MIGRATION COMPLETE");
  console.log("══════════════════════════════════════════════");
  console.log(`  Users:         3`);
  console.log(`  Verticals:     ${vCodes.length}`);
  console.log(`  Priorities:    4`);
  console.log(`  Teams:         ${TEAM_DEFS.length}`);
  console.log(`  Members:       ${Object.keys(teamMemberMap).length}`);
  console.log(`  Tasks:         ${taskCount}`);
  console.log(`  Assignments:   ${assignCount}`);
  console.log("══════════════════════════════════════════════\n");
  console.log("Login: super@rathinam.in / sd_1234");
  console.log("       cbo@rathinam.in   / cbo_1234");
  console.log("       sm@rathinam.in    / sm_1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error("FAILED:", e); await prisma.$disconnect(); process.exit(1); });