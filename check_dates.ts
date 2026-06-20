import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const earliest = await p.task.findFirst({ orderBy: { createdAt: "asc" }, select: { code: true, title: true, createdAt: true } });
  const latest = await p.task.findFirst({ orderBy: { createdAt: "desc" }, select: { code: true, title: true, createdAt: true } });
  
  console.log("Earliest task:", earliest?.code, "|", earliest?.title?.substring(0, 40), "|", earliest?.createdAt);
  console.log("Latest task:  ", latest?.code, "|", latest?.title?.substring(0, 40), "|", latest?.createdAt);
  
  // Check a few random ones
  const samples = await p.task.findMany({ take: 8, orderBy: { createdAt: "asc" }, select: { code: true, createdAt: true } });
  console.log("\nFirst 8 by date:");
  for (const s of samples) {
    console.log(`  ${s.code} | ${s.createdAt.toISOString()}`);
  }
}

main().then(() => p.$disconnect());