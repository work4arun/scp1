/**
 * Seeds the Strategic Control Portal database with the full framework:
 *  - 6 Verticals (Marketing, RTC, Placements, AIC RAISE, RGU, Special Strategic Projects)
 *  - All sub-verticals
 *  - P1–P4 priorities with review cadence
 *  - Owner roles (Marketing Head, Digital Lead, RTC Head, etc.)
 *  - Default Super Admin / CBO / SM users
 *  - ~80 tasks pulled directly from the framework registers
 */
import { PrismaClient, SystemRole, TaskStatus, TaskSource, InterventionFlag } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────
// Reference data
// ──────────────────────────────────────────────────────────────

const VERTICALS = [
  { code: "MKT", name: "Marketing", colorHex: "#4f46e5", description: "Admissions, branding, lead generation, lead nurturing, walk-in conversion" },
  { code: "RTC", name: "RTC", colorHex: "#0ea5e9", description: "Student learning ecosystem, RAALE, growth card, CoE, campus life, research, ranking" },
  { code: "PLC", name: "Placements", colorHex: "#10b981", description: "Company connect, training effectiveness, KPI, quality placements" },
  { code: "AIC", name: "AIC RAISE", colorHex: "#f59e0b", description: "Incubation, revenue model, schemes, venture studio, events" },
  { code: "RGU", name: "RGU", colorHex: "#7c3aed", description: "Prelaunch, launch, team setup, change management, faculty handbooks" },
  { code: "SSP", name: "Special Strategic Projects", colorHex: "#ef4444", description: "New ideas, boss instructions, management agenda, urgent special work" },
] as const;

const SUB_VERTICALS: Array<{ vertical: string; name: string }> = [
  { vertical: "MKT", name: "Physical Marketing" },
  { vertical: "MKT", name: "Digital Marketing" },
  { vertical: "MKT", name: "Lead Dashboards" },
  { vertical: "MKT", name: "Budget Review" },
  { vertical: "MKT", name: "Course Strategy" },
  { vertical: "RTC", name: "RAALE" },
  { vertical: "RTC", name: "Growth Card" },
  { vertical: "RTC", name: "Campus Life" },
  { vertical: "RTC", name: "CoE Hub" },
  { vertical: "RTC", name: "Research & Ranking" },
  { vertical: "RTC", name: "RTC Operations" },
  { vertical: "PLC", name: "KPI Monitoring" },
  { vertical: "PLC", name: "Quality Placement" },
  { vertical: "PLC", name: "Training Effectiveness" },
  { vertical: "PLC", name: "Team Operations" },
  { vertical: "AIC", name: "Revenue Model" },
  { vertical: "AIC", name: "Incubation Events" },
  { vertical: "AIC", name: "Investment & Schemes" },
  { vertical: "AIC", name: "Venture Studio" },
  { vertical: "RGU", name: "Prelaunch" },
  { vertical: "RGU", name: "Launch" },
  { vertical: "RGU", name: "Team Setup" },
  { vertical: "RGU", name: "Change Management" },
  { vertical: "RGU", name: "Academic Setup" },
  { vertical: "SSP", name: "Boss Instructions" },
  { vertical: "SSP", name: "Management Agenda" },
  { vertical: "SSP", name: "New Initiatives" },
];

const PRIORITIES = [
  { code: "P1", label: "Critical", description: "Must be reviewed by Dr. BN", reviewCadence: "Daily tracking", colorHex: "#ef4444", rank: 1 },
  { code: "P2", label: "Important", description: "Team can execute with direction", reviewCadence: "Twice-a-week review", colorHex: "#f59e0b", rank: 2 },
  { code: "P3", label: "Operational", description: "Senior Manager tracks", reviewCadence: "Weekly review", colorHex: "#0ea5e9", rank: 3 },
  { code: "P4", label: "Parked", description: "Future idea, not immediate execution", reviewCadence: "Monthly review only", colorHex: "#6b7280", rank: 4 },
];

const OWNER_ROLES = [
  "Marketing Head",
  "Digital Marketing Lead",
  "Telecalling Head",
  "Admission Manager",
  "Counselling Head",
  "Course Coordinator",
  "Branding Team",
  "Content Team",
  "CRM Team",
  "Accounts",
  "School Team",
  "Consultant Coordinator",
  "Alumni Coordinator",
  "Influencer Coordinator",
  "Website Team",
  "Social Media Lead",
  "RTC Head",
  "RTC Coordinator",
  "Academic Team",
  "Student Affairs",
  "CoE Team",
  "Research Team",
  "Ranking Team",
  "RFabX Lead",
  "Placement Head",
  "Training Head",
  "Placement Strategy Team",
  "AIC Lead",
  "AIC Team",
  "Event Lead",
  "RGU Core Team",
  "RGU Lead",
  "Academic Head",
  "HR",
  "Senior Manager",
  "Dr. BN",
];

// ──────────────────────────────────────────────────────────────
// Tasks (from your framework registers)
// ──────────────────────────────────────────────────────────────

type SeedTask = {
  vertical: string;
  subVertical?: string;
  title: string;
  priority: "P1" | "P2" | "P3" | "P4";
  ownerRole?: string;
  frequency?: string;
  expectedOutput?: string;
  status?: TaskStatus;
  intervention?: InterventionFlag;
  source?: TaskSource;
};

const TASKS: SeedTask[] = [
  // ───── Marketing — Physical
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Weekly MRM and action-taken points review", priority: "P1", ownerRole: "Marketing Head", frequency: "Weekly", expectedOutput: "Action points closed weekly", status: "IN_PROGRESS" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Poor-performing course strategy (RTC, Viscom, Fashion, MBA, MCA, Physio, Pharmacy)", priority: "P1", ownerRole: "Marketing Head", frequency: "Weekly", intervention: "YES" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Lead generation tracking", priority: "P1", ownerRole: "Marketing Head", frequency: "Daily" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Lead nurturing for walk-ins", priority: "P1", ownerRole: "Counselling Head", frequency: "Daily" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Warm-to-hot conversion", priority: "P1", ownerRole: "Telecalling Head", frequency: "Daily" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Walk-in to admission conversion", priority: "P1", ownerRole: "Admission Manager", frequency: "Daily" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Telecaller monitoring", priority: "P1", ownerRole: "Telecalling Head", frequency: "Daily" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Flex and hoardings campaign", priority: "P3", ownerRole: "Branding Team", frequency: "Monthly" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Newspaper and inserts", priority: "P3", ownerRole: "Marketing Head", frequency: "Campaign-based" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Expos coordination", priority: "P2", ownerRole: "Marketing Head", frequency: "Event-based" },
  { vertical: "MKT", subVertical: "Budget Review", title: "Budget spent review", priority: "P1", ownerRole: "Accounts", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Course Strategy", title: "HE / ME / LE course classification", priority: "P1", ownerRole: "Marketing Head", frequency: "Weekly", intervention: "YES" },
  { vertical: "MKT", subVertical: "Course Strategy", title: "New strategy formulation with Dr. BN", priority: "P1", ownerRole: "Senior Manager", frequency: "Weekly", intervention: "YES" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Brochures and content creation", priority: "P2", ownerRole: "Content Team", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Raw data campaigning", priority: "P2", ownerRole: "Telecalling Head", frequency: "Daily" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "AI calls operations", priority: "P2", ownerRole: "CRM Team", frequency: "Daily" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "AI chat operations", priority: "P2", ownerRole: "Digital Marketing Lead", frequency: "Daily" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Webinars by department", priority: "P2", ownerRole: "Marketing Head", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "School admissions review", priority: "P1", ownerRole: "School Team", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Lead Dashboards", title: "Walk-in dashboard", priority: "P1", ownerRole: "Admission Manager", frequency: "Daily" },
  { vertical: "MKT", subVertical: "Lead Dashboards", title: "Consultant dashboard", priority: "P1", ownerRole: "Consultant Coordinator", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Lead Dashboards", title: "Overall leads dashboard", priority: "P1", ownerRole: "CRM Team", frequency: "Daily" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Student deliverables documentation", priority: "P1", ownerRole: "Academic Team", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Student Experience Centre feedback", priority: "P1", ownerRole: "Student Affairs", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Course Strategy", title: "USP document for each course", priority: "P1", ownerRole: "Content Team", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "GIP request form processing", priority: "P2", ownerRole: "Admission Manager", frequency: "Need-based" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "Alumni Is Our Pride distribution", priority: "P2", ownerRole: "Alumni Coordinator", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Physical Marketing", title: "WhatsApp campaign", priority: "P1", ownerRole: "Marketing Head", frequency: "Daily" },

  // ───── Marketing — Digital
  { vertical: "MKT", subVertical: "Digital Marketing", title: "Department-wise lead nurturing plan", priority: "P1", ownerRole: "Digital Marketing Lead", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "Ad spend based on HE / ME / LE classification", priority: "P1", ownerRole: "Digital Marketing Lead", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "High and low performing ads review", priority: "P1", ownerRole: "Digital Marketing Lead", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "Lead nurturing plan", priority: "P1", ownerRole: "CRM Team", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "Social media dashboard", priority: "P2", ownerRole: "Social Media Lead", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "Website traffic dashboard", priority: "P1", ownerRole: "Website Team", frequency: "Weekly", status: "WAITING_FOR_INPUT", intervention: "YES" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "Influencer dashboard", priority: "P2", ownerRole: "Influencer Coordinator", frequency: "Campaign-based" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "Google and Meta ad review (CPL, CTR, conversion)", priority: "P1", ownerRole: "Digital Marketing Lead", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "New strategies adopted and impact report", priority: "P1", ownerRole: "Digital Marketing Lead", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "RCAS Rsmart non-CS strategy impact", priority: "P1", ownerRole: "Digital Marketing Lead", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "School admissions digital strategy impact", priority: "P1", ownerRole: "School Team", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "RYH dashboard", priority: "P2", ownerRole: "Digital Marketing Lead", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "Digital budget review", priority: "P1", ownerRole: "Accounts", frequency: "Weekly" },
  { vertical: "MKT", subVertical: "Digital Marketing", title: "Retargeting ad dashboard", priority: "P1", ownerRole: "Digital Marketing Lead", frequency: "Weekly" },

  // ───── RTC
  { vertical: "RTC", subVertical: "RAALE", title: "Department-wise RAALE implementation review", priority: "P1", ownerRole: "RTC Head", frequency: "Weekly", intervention: "YES" },
  { vertical: "RTC", subVertical: "Growth Card", title: "Student growth card implementation", priority: "P1", ownerRole: "Academic Team", frequency: "Weekly", intervention: "YES" },
  { vertical: "RTC", subVertical: "RTC Operations", title: "RTC budget plan and utilization", priority: "P2", ownerRole: "Accounts", frequency: "Monthly" },
  { vertical: "RTC", subVertical: "Campus Life", title: "Engagement activities calendar", priority: "P2", ownerRole: "Student Affairs", frequency: "Weekly" },
  { vertical: "RTC", subVertical: "RTC Operations", title: "Wow factor — certifications and appreciation model", priority: "P1", ownerRole: "RTC Head", frequency: "Weekly", intervention: "YES" },
  { vertical: "RTC", subVertical: "CoE Hub", title: "CoE Hub immersion and progress", priority: "P1", ownerRole: "CoE Team", frequency: "Weekly", intervention: "YES" },
  { vertical: "RTC", subVertical: "RTC Operations", title: "AI coach learning model", priority: "P2", ownerRole: "RTC Head", frequency: "Weekly", intervention: "YES" },
  { vertical: "RTC", subVertical: "RTC Operations", title: "Faculty / team recruitment", priority: "P1", ownerRole: "HR", frequency: "Need-based", intervention: "YES" },
  { vertical: "RTC", subVertical: "Research & Ranking", title: "Research proposal and publication progress", priority: "P2", ownerRole: "Research Team", frequency: "Monthly", intervention: "YES" },
  { vertical: "RTC", subVertical: "Research & Ranking", title: "Ranking submission progress", priority: "P2", ownerRole: "Ranking Team", frequency: "Monthly" },
  { vertical: "RTC", subVertical: "CoE Hub", title: "Hackathons participation and output", priority: "P2", ownerRole: "CoE Team", frequency: "Monthly" },
  { vertical: "RTC", subVertical: "RTC Operations", title: "RFabX revenue report", priority: "P2", ownerRole: "RFabX Lead", frequency: "Monthly", intervention: "YES" },
  { vertical: "RTC", subVertical: "RTC Operations", title: "NASA program progress", priority: "P2", ownerRole: "RTC Coordinator", frequency: "Monthly", intervention: "YES" },
  { vertical: "RTC", subVertical: "RTC Operations", title: "Student category list A/B/C/D segmentation", priority: "P1", ownerRole: "RTC Head", frequency: "Monthly", intervention: "YES" },
  { vertical: "RTC", subVertical: "RTC Operations", title: "Consolidated RTC Dashboard", priority: "P1", ownerRole: "Senior Manager", frequency: "Weekly", intervention: "YES" },

  // ───── Placements
  { vertical: "PLC", subVertical: "KPI Monitoring", title: "Placement dashboard (overall status)", priority: "P1", ownerRole: "Placement Head", frequency: "Weekly", intervention: "YES" },
  { vertical: "PLC", subVertical: "KPI Monitoring", title: "Team-wise KPI report", priority: "P1", ownerRole: "Placement Head", frequency: "Weekly", intervention: "YES" },
  { vertical: "PLC", subVertical: "Quality Placement", title: "Monthly placement calendar (visits + training)", priority: "P1", ownerRole: "Placement Head", frequency: "Monthly" },
  { vertical: "PLC", subVertical: "Quality Placement", title: "Two-digit target — quality company conversion", priority: "P1", ownerRole: "Placement Head", frequency: "Weekly", intervention: "YES", status: "DELAYED" },
  { vertical: "PLC", subVertical: "Training Effectiveness", title: "Training effectiveness — student improvement report", priority: "P1", ownerRole: "Training Head", frequency: "Weekly", intervention: "YES" },
  { vertical: "PLC", subVertical: "Quality Placement", title: "Commitment letter tracking", priority: "P2", ownerRole: "Placement Head", frequency: "Need-based" },
  { vertical: "PLC", subVertical: "Team Operations", title: "Placement team recruitment", priority: "P1", ownerRole: "HR", frequency: "Need-based", intervention: "YES" },
  { vertical: "PLC", subVertical: "Quality Placement", title: "Benchmarking comparison with other institutes", priority: "P2", ownerRole: "Placement Strategy Team", frequency: "Monthly", intervention: "YES" },

  // ───── AIC RAISE
  { vertical: "AIC", subVertical: "Revenue Model", title: "Revenue model and proposal", priority: "P1", ownerRole: "AIC Lead", frequency: "Monthly" },
  { vertical: "AIC", subVertical: "Incubation Events", title: "Incubation event calendar", priority: "P2", ownerRole: "AIC Team", frequency: "Monthly" },
  { vertical: "AIC", subVertical: "Investment & Schemes", title: "Investor connect and tracking", priority: "P1", ownerRole: "AIC Lead", frequency: "Monthly" },
  { vertical: "AIC", subVertical: "Investment & Schemes", title: "New schemes application tracker", priority: "P2", ownerRole: "AIC Team", frequency: "Monthly" },
  { vertical: "AIC", subVertical: "Revenue Model", title: "Concept note / proposal documents", priority: "P1", ownerRole: "AIC Lead", frequency: "Need-based" },
  { vertical: "AIC", subVertical: "Venture Studio", title: "Venture Studio model", priority: "P1", ownerRole: "AIC Lead", frequency: "Monthly" },
  { vertical: "AIC", subVertical: "Revenue Model", title: "Consolidated AIC RAISE dashboard", priority: "P1", ownerRole: "Senior Manager", frequency: "Weekly" },
  { vertical: "AIC", subVertical: "Incubation Events", title: "TEDx event execution plan", priority: "P2", ownerRole: "Event Lead", frequency: "Need-based" },

  // ───── RGU
  { vertical: "RGU", subVertical: "Prelaunch", title: "RGU prelaunch roadmap", priority: "P1", ownerRole: "RGU Core Team", frequency: "Weekly", intervention: "YES" },
  { vertical: "RGU", subVertical: "Launch", title: "RGU launch plan", priority: "P1", ownerRole: "RGU Core Team", frequency: "Weekly", intervention: "YES" },
  { vertical: "RGU", subVertical: "Team Setup", title: "RGU team recruitment", priority: "P1", ownerRole: "HR", frequency: "Need-based", intervention: "YES" },
  { vertical: "RGU", subVertical: "Team Setup", title: "Organisational setup planning", priority: "P1", ownerRole: "RGU Lead", frequency: "Weekly", intervention: "YES" },
  { vertical: "RGU", subVertical: "Change Management", title: "Pride moments and change adoption strategy", priority: "P1", ownerRole: "RGU Lead", frequency: "Weekly", intervention: "YES" },
  { vertical: "RGU", subVertical: "Academic Setup", title: "Global Skill Passport framework", priority: "P1", ownerRole: "Academic Head", frequency: "Weekly", intervention: "YES" },
  { vertical: "RGU", subVertical: "Academic Setup", title: "Individual school training plan", priority: "P1", ownerRole: "Academic Head", frequency: "Weekly", intervention: "YES" },
  { vertical: "RGU", subVertical: "Academic Setup", title: "Faculty handbooks (draft + final)", priority: "P1", ownerRole: "Academic Team", frequency: "Weekly", intervention: "YES" },
];

// ──────────────────────────────────────────────────────────────
// Seed runner
// ──────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Strategic Control Portal…");

  // Owner roles
  const roleMap = new Map<string, string>();
  for (const name of OWNER_ROLES) {
    const r = await prisma.ownerRole.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roleMap.set(name, r.id);
  }
  console.log(`✓ ${OWNER_ROLES.length} owner roles`);

  // Verticals
  const verticalMap = new Map<string, string>();
  for (const [i, v] of VERTICALS.entries()) {
    const row = await prisma.vertical.upsert({
      where: { code: v.code },
      update: { name: v.name, colorHex: v.colorHex, description: v.description, sortOrder: i },
      create: { ...v, sortOrder: i },
    });
    verticalMap.set(v.code, row.id);
  }
  console.log(`✓ ${VERTICALS.length} verticals`);

  // Sub-verticals
  const subMap = new Map<string, string>(); // key: `${verticalCode}::${name}`
  for (const [i, sv] of SUB_VERTICALS.entries()) {
    const verticalId = verticalMap.get(sv.vertical)!;
    const row = await prisma.subVertical.upsert({
      where: { verticalId_name: { verticalId, name: sv.name } },
      update: { sortOrder: i },
      create: { name: sv.name, verticalId, sortOrder: i },
    });
    subMap.set(`${sv.vertical}::${sv.name}`, row.id);
  }
  console.log(`✓ ${SUB_VERTICALS.length} sub-verticals`);

  // Priorities
  const priorityMap = new Map<string, string>();
  for (const p of PRIORITIES) {
    const row = await prisma.priority.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
    priorityMap.set(p.code, row.id);
  }
  console.log(`✓ ${PRIORITIES.length} priorities`);

  // Default users
  const seedUsers = [
    {
      email: process.env.SEED_SUPERADMIN_EMAIL || "sadmin@rathinam.in",
      password: process.env.SEED_SUPERADMIN_PASSWORD || "SuperAdmin@123",
      name: "Super Admin",
      systemRole: SystemRole.SUPER_ADMIN,
    },
    {
      email: process.env.SEED_CBO_EMAIL || "cbo@rathinam.in",
      password: process.env.SEED_CBO_PASSWORD || "Cbo@123",
      name: "Dr. BN (CBO)",
      systemRole: SystemRole.CBO,
    },
    {
      email: process.env.SEED_SM_EMAIL || "sm@rathinam.in",
      password: process.env.SEED_SM_PASSWORD || "Sm@123",
      name: "Senior Manager",
      systemRole: SystemRole.SM,
      ownerRoleName: "Senior Manager",
    },
  ];

  let smUserId = "";
  for (const u of seedUsers) {
    const ownerRoleId = (u as { ownerRoleName?: string }).ownerRoleName
      ? roleMap.get((u as { ownerRoleName: string }).ownerRoleName)
      : null;
    const passwordHash = await bcrypt.hash(u.password, 10);
    const created = await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: { name: u.name, systemRole: u.systemRole, ownerRoleId },
      create: {
        email: u.email.toLowerCase(),
        name: u.name,
        passwordHash,
        systemRole: u.systemRole,
        ownerRoleId,
      },
    });
    if (u.systemRole === SystemRole.SM) smUserId = created.id;
  }
  console.log(`✓ ${seedUsers.length} default users seeded`);

  // Tasks
  const verticalCounter = new Map<string, number>();
  let createdTaskCount = 0;
  for (const t of TASKS) {
    const verticalId = verticalMap.get(t.vertical)!;
    const subVerticalId = t.subVertical ? subMap.get(`${t.vertical}::${t.subVertical}`) : null;
    const priorityId = priorityMap.get(t.priority)!;
    const ownerRoleId = t.ownerRole ? roleMap.get(t.ownerRole) : null;

    const seq = (verticalCounter.get(t.vertical) ?? 0) + 1;
    verticalCounter.set(t.vertical, seq);
    const code = `${t.vertical}-${String(seq).padStart(3, "0")}`;

    await prisma.task.upsert({
      where: { code },
      update: {},
      create: {
        code,
        title: t.title,
        verticalId,
        subVerticalId: subVerticalId ?? undefined,
        priorityId,
        ownerRoleId: ownerRoleId ?? undefined,
        createdById: smUserId,
        status: t.status ?? "NOT_STARTED",
        source: t.source ?? "SELF_STRATEGY",
        intervention: t.intervention ?? "NO",
        frequency: t.frequency,
        expectedOutput: t.expectedOutput,
        lastUpdateAt: new Date(),
      },
    });
    createdTaskCount++;
  }
  console.log(`✓ ${createdTaskCount} tasks seeded`);

  console.log("\n✅ Seed complete.");
  console.log("\nDefault logins:");
  console.log("  Super Admin → sadmin@rathinam.in / SuperAdmin@123");
  console.log("  CBO         → cbo@rathinam.in    / Cbo@123");
  console.log("  SM          → sm@rathinam.in     / Sm@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
