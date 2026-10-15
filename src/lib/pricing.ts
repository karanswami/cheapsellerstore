import type { UserRole } from "@prisma/client";
import { isWholesaleRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/** Retail `price` vs wholesale `resellerPrice` (Seller + Reseller). */
export function catalogUnitPrice(
  row: { price: number; resellerPrice?: number | null },
  role: UserRole | string,
): number {
  const wholesale = row.resellerPrice ?? 0;
  if (isWholesaleRole(role) && wholesale > 0) return wholesale;
  return row.price;
}

/**
 * Prefer per-user special price when set; otherwise role catalog tier.
 * Special prices are exact — callers must skip flash/promo on those lines.
 */
export function resolveUnitPrice(opts: {
  role: UserRole | string;
  priceRow: { price: number; resellerPrice?: number | null };
  specialPrice?: number | null;
}): number {
  const special = opts.specialPrice;
  if (special != null && Number.isFinite(special) && special >= 0) {
    return Math.round(special);
  }
  return catalogUnitPrice(opts.priceRow, opts.role);
}

/** Batch-load special prices for a user → Map<durationId, price microcents>. */
export async function getSpecialPricesForUser(
  userId: string | null | undefined,
  durationIds?: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!userId) return map;

  const rows = await prisma.userSpecialPrice.findMany({
    where: {
      userId,
      ...(durationIds && durationIds.length > 0
        ? { durationId: { in: durationIds } }
        : {}),
    },
    select: { durationId: true, price: true },
  });

  for (const row of rows) {
    map.set(row.durationId, row.price);
  }
  return map;
}

export function hasSpecialPrice(
  specialPrices: Map<string, number> | undefined,
  durationId: string,
): boolean {
  return Boolean(specialPrices?.has(durationId));
}
