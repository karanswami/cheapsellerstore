/**
 * One-shot: force every User.currency to USD.
 * Also normalizes Order / Deposit / Transaction currency fields to USD.
 *
 * Usage: npx tsx prisma/migrate-currency-usd.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.updateMany({
    data: { currency: "USD" },
  });
  const orders = await prisma.order.updateMany({
    data: { currency: "USD" },
  });
  const deposits = await prisma.deposit.updateMany({
    data: { currency: "USD" },
  });
  const transactions = await prisma.transaction.updateMany({
    data: { currency: "USD" },
  });

  // Drop leftover non-USD DurationPrice rows (catalog is USD-only).
  const removedPrices = await prisma.durationPrice.deleteMany({
    where: { currency: { not: "USD" } },
  });

  const remaining = await prisma.user.findMany({
    select: { id: true, username: true, currency: true },
  });
  const nonUsd = remaining.filter((u) => u.currency !== "USD");

  console.log(
    JSON.stringify(
      {
        updated: {
          users: users.count,
          orders: orders.count,
          deposits: deposits.count,
          transactions: transactions.count,
          removedNonUsdPrices: removedPrices.count,
        },
        usersTotal: remaining.length,
        stillNonUsd: nonUsd.length,
      },
      null,
      2,
    ),
  );

  if (nonUsd.length > 0) {
    console.error("Some users still non-USD:", nonUsd);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
