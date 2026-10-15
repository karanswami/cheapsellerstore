import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  SpecialPriceHistoryAction,
  SpecialPriceHistoryPage,
  SpecialPriceHistoryRow,
} from "@/types/special-price-history";
import { SPECIAL_PRICE_HISTORY_ACTIONS } from "@/types/special-price-history";
import type { Prisma } from "@prisma/client";

export type { SpecialPriceHistoryAction, SpecialPriceHistoryPage, SpecialPriceHistoryRow };
export { SPECIAL_PRICE_HISTORY_ACTIONS };

export type SpecialPriceHistoryActor = {
  id: string;
  username: string | null;
};

export type SpecialPriceHistoryTarget = {
  userId: string;
  username?: string | null;
  durationId: string;
  durationLabel?: string | null;
  productId?: string | null;
  productTitle?: string | null;
};

export type RecordSpecialPriceHistoryInput = {
  action: SpecialPriceHistoryAction;
  target: SpecialPriceHistoryTarget;
  previousPrice?: number | null;
  newPrice?: number | null;
  admin?: SpecialPriceHistoryActor | null;
};

/**
 * Fire-and-forget special-price audit write. Never throws to the caller.
 */
export function recordSpecialPriceHistory(
  input: RecordSpecialPriceHistoryInput,
): void {
  void writeSpecialPriceHistory(input).catch((err) => {
    console.warn("[special-price-history] write failed", err);
  });
}

async function writeSpecialPriceHistory(
  input: RecordSpecialPriceHistoryInput,
): Promise<void> {
  await prisma.userSpecialPriceHistory.create({
    data: {
      userId: input.target.userId,
      username: input.target.username ?? null,
      durationId: input.target.durationId,
      durationLabel: input.target.durationLabel ?? null,
      productId: input.target.productId ?? null,
      productTitle: input.target.productTitle ?? null,
      action: input.action,
      previousPrice:
        input.previousPrice != null && Number.isFinite(input.previousPrice)
          ? input.previousPrice
          : null,
      newPrice:
        input.newPrice != null && Number.isFinite(input.newPrice)
          ? input.newPrice
          : null,
      adminId: input.admin?.id ?? null,
      adminUsername: input.admin?.username ?? null,
    },
  });
}

export async function getSpecialPriceHistoryPage(opts: {
  page?: number;
  limit?: number;
  userId?: string | null;
  q?: string | null;
  action?: string | null;
}): Promise<SpecialPriceHistoryPage> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(48, Math.max(1, opts.limit ?? 20));
  const q = opts.q?.trim() ?? "";
  const userId = opts.userId?.trim() || null;
  const action = opts.action?.trim().toUpperCase() || null;

  const where: Prisma.UserSpecialPriceHistoryWhereInput = {
    ...(userId ? { userId } : {}),
    ...(action &&
    SPECIAL_PRICE_HISTORY_ACTIONS.includes(
      action as SpecialPriceHistoryAction,
    )
      ? { action }
      : {}),
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { productTitle: { contains: q, mode: "insensitive" } },
            { durationLabel: { contains: q, mode: "insensitive" } },
            { adminUsername: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.userSpecialPriceHistory.count({ where }),
    prisma.userSpecialPriceHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: rows.map(
      (row): SpecialPriceHistoryRow => ({
        id: row.id,
        userId: row.userId,
        username: row.username,
        durationId: row.durationId,
        durationLabel: row.durationLabel,
        productId: row.productId,
        productTitle: row.productTitle,
        action: row.action,
        previousPrice: row.previousPrice,
        newPrice: row.newPrice,
        adminId: row.adminId,
        adminUsername: row.adminUsername,
        createdAt: row.createdAt.toISOString(),
      }),
    ),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}
