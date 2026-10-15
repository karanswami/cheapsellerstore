import { toSafeUser } from "@/lib/auth/customer";
import { Currency, formatMoney, usdToMicrocents } from "@/lib/currencies";
import { hasPremiumAccess } from "@/lib/premium-utils";
import { prisma } from "@/lib/prisma";
import { getPremiumPriceUsd } from "@/lib/settings";
import { logActivity } from "@/lib/activity-log";
import { notifyTelegram } from "@/lib/telegram-notify";
import type {
  AdminPremiumListResult,
  AdminPremiumUserRow,
} from "@/types/admin-premium";
import type { SafeUser } from "@/types/user";
import { TransactionStatus, TransactionType } from "@prisma/client";

export type { AdminPremiumListResult, AdminPremiumUserRow };

export {
  canChangeUsername,
  hasPremiumAccess,
  isReservedReferralCode,
  normalizeVanityReferralCode,
  USERNAME_CHANGE_COOLDOWN_MS,
} from "@/lib/premium-utils";

export async function purchasePremium(userId: string): Promise<SafeUser> {
  const priceUsd = await getPremiumPriceUsd();
  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    throw new Error("INVALID_PRICE");
  }
  const amount = usdToMicrocents(priceUsd);
  if (amount <= 0) {
    throw new Error("INVALID_PRICE");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (hasPremiumAccess(user)) throw new Error("ALREADY_PREMIUM");
  if (user.walletBalance < amount) throw new Error("INSUFFICIENT_BALANCE");

  // MongoDB may omit booleans that only exist as Prisma schema defaults.
  // `where: { isPremium: false }` does not match a missing field — materialize it
  // via Prisma (proper BSON types) before the atomic debit.
  await prisma.user.update({
    where: { id: userId },
    data: { isPremium: false },
  });

  const next = user.walletBalance - amount;
  const now = new Date();

  const result = await prisma.user.updateMany({
    where: {
      id: userId,
      isPremium: false,
      walletBalance: { gte: amount },
    },
    data: {
      walletBalance: next,
      isPremium: true,
      premiumPurchasedAt: now,
      // Premium purchase verifies email + account trust badge.
      emailVerified: true,
    },
  });

  if (result.count === 0) {
    const again = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, walletBalance: true },
    });
    if (again?.isPremium) throw new Error("ALREADY_PREMIUM");
    throw new Error("INSUFFICIENT_BALANCE");
  }

  await prisma.transaction.create({
    data: {
      userId,
      type: TransactionType.PREMIUM_PURCHASE,
      status: TransactionStatus.COMPLETED,
      amount: -amount,
      currency: Currency.USD,
      note: "Premium membership",
      reference: `premium:${userId}`,
    },
  });

  const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  logActivity({
    action: "PREMIUM_PURCHASE",
    category: "ACCOUNT",
    message: `Premium unlocked (${formatMoney(amount)})`,
    user: updated,
    metadata: { amount },
  });
  void notifyTelegram(
    "premium",
    [
      "⭐ Premium unlocked",
      `User: @${updated.username}`,
      `Email: ${updated.email}`,
      `Amount: ${formatMoney(amount)}`,
      `User ID: ${updated.id}`,
    ].join("\n"),
  );
  return toSafeUser(updated);
}

function mapAdminPremiumRow(user: {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  walletBalance: number;
  banned: boolean;
  emailVerified: boolean;
  isPremium: boolean;
  premiumPurchasedAt: Date | null;
  createdAt: Date;
}): AdminPremiumUserRow {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    walletBalance: user.walletBalance ?? 0,
    banned: user.banned ?? false,
    emailVerified: user.emailVerified ?? false,
    isPremium: user.isPremium ?? false,
    premiumPurchasedAt: user.premiumPurchasedAt
      ? user.premiumPurchasedAt.toISOString()
      : null,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Paginated admin Premium desk list. */
export async function listAdminPremiumUsers(input: {
  page: number;
  limit: number;
  q?: string;
  filter?: "premium" | "all" | "non_premium";
}): Promise<AdminPremiumListResult> {
  const page = Math.max(1, input.page);
  const limit = Math.min(50, Math.max(1, input.limit));
  const q = input.q?.trim() ?? "";
  const filter = input.filter ?? "premium";

  const where: {
    isPremium?: boolean;
    OR?: Array<
      | { username: { contains: string } }
      | { email: { contains: string } }
      | { name: { contains: string } }
    >;
  } = {};

  if (filter === "premium") where.isPremium = true;
  if (filter === "non_premium") where.isPremium = false;

  if (q) {
    where.OR = [
      { username: { contains: q } },
      { email: { contains: q } },
      { name: { contains: q } },
    ];
  }

  const [total, premiumCount, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.findMany({
      where,
      orderBy: [{ isPremium: "desc" }, { premiumPurchasedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        walletBalance: true,
        banned: true,
        emailVerified: true,
        isPremium: true,
        premiumPurchasedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    users: rows.map(mapAdminPremiumRow),
    total,
    page,
    limit,
    hasMore: page * limit < total,
    premiumCount,
  };
}

/** Admin grant/revoke Premium and/or email verification. */
export async function adminUpdatePremium(
  userId: string,
  input: { isPremium?: boolean; emailVerified?: boolean },
): Promise<AdminPremiumUserRow> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error("USER_NOT_FOUND");

  const data: {
    isPremium?: boolean;
    premiumPurchasedAt?: Date | null;
    emailVerified?: boolean;
  } = {};

  if (input.isPremium !== undefined) {
    data.isPremium = input.isPremium;
    if (input.isPremium) {
      data.emailVerified = true;
      if (!existing.premiumPurchasedAt) {
        data.premiumPurchasedAt = new Date();
      }
    }
  }

  if (input.emailVerified !== undefined) {
    data.emailVerified = input.emailVerified;
  }

  // Granting Premium always verifies the account.
  if (input.isPremium === true) {
    data.emailVerified = true;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      walletBalance: true,
      banned: true,
      emailVerified: true,
      isPremium: true,
      premiumPurchasedAt: true,
      createdAt: true,
    },
  });

  return mapAdminPremiumRow(updated);
}

export async function getPurchasedProductsForUser(userId: string) {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      status: { in: ["PAID", "FULFILLED"] },
    },
    select: {
      items: {
        select: {
          duration: {
            select: {
              product: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                  rating: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const map = new Map<
    string,
    {
      id: string;
      name: string;
      imageUrl: string | null;
      rating: number | null;
    }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const product = item.duration.product;
      if (!map.has(product.id)) {
        map.set(product.id, {
          id: product.id,
          name: product.title,
          imageUrl: product.imageUrl ?? null,
          rating: product.rating ?? null,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
