/**
 * Enforce one ACTIVE Platform API key per user.
 * Keeps the newest ACTIVE key; revokes older ACTIVE duplicates.
 *
 * Run: npx tsx prisma/enforce-single-api-key.ts
 * Or:  npm run db:enforce-single-api-key
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const active = await prisma.sellerApiKey.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true, keyPrefix: true, createdAt: true },
  });

  const seen = new Set<string>();
  const revokeIds: string[] = [];
  for (const row of active) {
    if (seen.has(row.userId)) {
      revokeIds.push(row.id);
      console.log(`revoke ${row.keyPrefix} (user ${row.userId})`);
    } else {
      seen.add(row.userId);
    }
  }

  if (revokeIds.length === 0) {
    console.log("No duplicate ACTIVE keys.");
    return;
  }

  await prisma.sellerApiKey.updateMany({
    where: { id: { in: revokeIds } },
    data: { status: "REVOKED" },
  });
  console.log(`Revoked ${revokeIds.length} duplicate ACTIVE key(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
