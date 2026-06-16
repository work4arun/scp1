import { PrismaClient, SystemRole, TaskSource, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Users ──
  const passwordHash = await bcrypt.hash("admin123", 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@scp.local" },
    update: { name: "Super Admin", systemRole: "SUPER_ADMIN" },
    create: { name: "Super Admin", email: "superadmin@scp.local", passwordHash, systemRole: "SUPER_ADMIN" },
  });
  const cboUser = await prisma.user.upsert({
    where: { email: "cbo@scp.local" },
    update: { name: "Dr. BN", systemRole: "CBO" },
    create: { name: "Dr. BN", email: "cbo@scp.local", passwordHash, systemRole: "CBO" },
  });
  await prisma.user.upsert({
    where: { email: "sm@scp.local" },
    update: { name: "Strategic Manager", systemRole: "SM" },
    create: { name: "Strategic Manager", email: "sm@scp.local", passwordHash, systemRole: "SM" },
  });

  // ── Teams ──
  const marketingTeam = await prisma.team.upsert({
    where: { name: "Marketing" },
    update: {},
    create: { name: "Marketing", description: "Marketing & Communications team" },
  });
  const placementTeam = await prisma.team.upsert({
    where: { name: "Placement" },
    update: {},
    create: { name: "Placement", description: "Placement & Corporate Relations" },
  });

  // ── Team Members ──
  const members = [
    { teamId: marketingTeam.id, name: "Amit Sharma", email: "amit.sharma@example.com", designation: "Marketing Head" },
    { teamId: marketingTeam.id, name: "Priya Patel", email: "priya.patel@example.com", designation: "Digital Marketing Lead" },
    { teamId: marketingTeam.id, name: "Rajesh Kumar", email: "rajesh.kumar@example.com", designation: "Content Manager" },
    { teamId: placementTeam.id, name: "Sunita Rao", email: "sunita.rao@example.com", designation: "Placement Head" },
    { teamId: placementTeam.id, name: "Vikram Singh", email: "vikram.singh@example.com", designation: "Corporate Relations" },
  ];
  for (const m of members) {
    await prisma.teamMember.upsert({
      where: { teamId_email: { teamId: m.teamId, email: m.email } },
      update: { name: m.name, designation: m.designation },
      create: m,
    });
  }

  // ── Verticals ──
  const verticals = [
    { code: "MKT", name: "Marketing", colorHex: "#4f46e5", sortOrder: 1 },
    { code: "RTC", name: "RTC", colorHex: "#0891b2", sortOrder: 2 },
    { code: "PLC", name: "Placement", colorHex: "#059669", sortOrder: 3 },
    { code: "AIC", name: "AIC", colorHex: "#d97706", sortOrder: 4 },
    { code: "RGU", name: "RGU", colorHex: "#dc2626", sortOrder: 5 },
    { code: "SSP", name: "Special Strategic Projects", colorHex: "#7c3aed", sortOrder: 6 },
  ];
  for (const v of verticals) {
    await prisma.vertical.upsert({
      where: { code: v.code },
      update: { name: v.name, colorHex: v.colorHex, sortOrder: v.sortOrder },
      create: v,
    });
  }

  // ── Sub-Verticals ──
  const mktVertical = await prisma.vertical.findUnique({ where: { code: "MKT" } });
  const plcVertical = await prisma.vertical.findUnique({ where: { code: "PLC" } });
  if (mktVertical) {
    const subs = [
      { name: "Physical Marketing", sortOrder: 1 },
      { name: "Digital Marketing", sortOrder: 2 },
      { name: "Growth Card", sortOrder: 3 },
    ];
    for (const s of subs) {
      await prisma.subVertical.upsert({
        where: { verticalId_name: { verticalId: mktVertical.id, name: s.name } },
        update: { sortOrder: s.sortOrder },
        create: { verticalId: mktVertical.id, name: s.name, sortOrder: s.sortOrder },
      });
    }
  }
  if (plcVertical) {
    await prisma.subVertical.upsert({
      where: { verticalId_name: { verticalId: plcVertical.id, name: "Campus Placements" } },
      update: {},
      create: { verticalId: plcVertical.id, name: "Campus Placements", sortOrder: 1 },
    });
  }

  // ── Priorities ──
  const priorities = [
    { code: "P1", label: "Critical", colorHex: "#dc2626", rank: 1 },
    { code: "P2", label: "High", colorHex: "#ea580c", rank: 2 },
    { code: "P3", label: "Medium", colorHex: "#ca8a04", rank: 3 },
    { code: "P4", label: "Low", colorHex: "#16a34a", rank: 4 },
  ];
  const priorityMap: Record<string, string> = {};
  for (const p of priorities) {
    const created = await prisma.priority.upsert({
      where: { code: p.code },
      update: { label: p.label, colorHex: p.colorHex, rank: p.rank },
      create: p,
    });
    priorityMap[p.code] = created.id;
  }

  // ── Feature Flags ──
  const flags = [
    { key: "dark_mode_toggle", category: "ux", label: "Dark Mode Toggle", description: "Enables the dark/light mode toggle in the header" },
    { key: "breadcrumbs", category: "ux", label: "Breadcrumbs", description: "Shows breadcrumb navigation on every page" },
    { key: "toasts", category: "ux", label: "Toast Notifications", description: "Shows success/error toast notifications" },
    { key: "sla_engine", category: "workflow", label: "SLA Engine", description: "Computes SLA deadlines for tasks" },
    { key: "audit_log_v2", category: "security", label: "Audit Log v2", description: "Writes before/after snapshots on every mutation" },
    { key: "csv_export", category: "scale", label: "CSV Export", description: "Allows exporting tasks as CSV" },
    { key: "task_bulk_actions", category: "workflow", label: "Bulk Task Actions", description: "Enables multi-select on task lists for bulk status/delete" },
    { key: "drop_reason", category: "workflow", label: "Drop Reason Required", description: "Requires a reason when dropping/deleting tasks" },
    { key: "parking_auto_promote", category: "workflow", label: "Parking Auto-Promote", description: "Allows CBO to activate parking items as tasks" },
  ];
  for (const f of flags) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: { category: f.category, label: f.label, description: f.description },
      create: f,
    });
  }
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });