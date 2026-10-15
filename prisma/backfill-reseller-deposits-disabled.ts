/**
 * One-shot: set depositsEnabled=false on all RESELLER accounts
 * (self-serve deposits are seller-funded by default).
 *
 * Usage: npx tsx prisma/backfill-reseller-deposits-disabled.ts
 */
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { role: UserRole.RESELLER },
    data: { depositsEnabled: false },
  });
  console.log(`Disabled self-serve deposits on ${result.count} reseller(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
