import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  // Only seed the 3 login users — no other data
  await prisma.user.upsert({
    where: { email: "superadmin@scp.cloud" },
    update: { name: "Super Admin", systemRole: "SUPER_ADMIN" },
    create: { name: "Super Admin", email: "superadmin@scp.cloud", passwordHash, systemRole: "SUPER_ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "cbo@rtc.cloud" },
    update: { name: "Dr. BN", systemRole: "CBO" },
    create: { name: "Dr. BN", email: "cbo@rtc.cloud", passwordHash, systemRole: "CBO" },
  });
  await prisma.user.upsert({
    where: { email: "sm@scp.cloud" },
    update: { name: "Strategic Manager", systemRole: "SM" },
    create: { name: "Strategic Manager", email: "sm@scp.cloud", passwordHash, systemRole: "SM" },
  });
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });