import { formatMoney } from "@/lib/currencies";
import type { PromoAudience, PromoScope } from "@prisma/client";

/** Client cart promo shape */
export type AppliedPromo = {
  code: string;
  label: string;
  percentOff: number;
  amountOff?: number;
  promoCodeId?: string;
  scope?: PromoScope;
  productId?: string | null;
  durationId?: string | null;
  /** Remaining per-user uses — caps how many units get the discount. */
  maxUnits?: number;
};

export type PromoCartLine = {
  productId: string;
  durationId: string;
  unitPrice: number;
  quantity: number;
};

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function lineMatchesPromoScope(
  line: { productId: string; durationId: string },
  promo: {
    scope: PromoScope;
    productId: string | null;
    durationId: string | null;
  },
): boolean {
  if (promo.scope === "GLOBAL") return true;
  if (promo.scope === "PRODUCT") {
    return Boolean(promo.productId) && line.productId === promo.productId;
  }
  if (promo.scope === "DURATION") {
    return Boolean(promo.durationId) && line.durationId === promo.durationId;
  }
  return false;
}

/** Eligible unit prices (one entry per unit), capped by maxUnits. */
export function eligiblePromoUnitPrices(
  items: PromoCartLine[],
  promo: {
    scope: PromoScope;
    productId: string | null;
    durationId: string | null;
    maxUnits: number;
  },
): number[] {
  const units: number[] = [];
  for (const item of items) {
    if (!lineMatchesPromoScope(item, promo)) continue;
    const qty = Math.max(0, Math.floor(item.quantity));
    for (let i = 0; i < qty; i++) {
      units.push(item.unitPrice);
    }
  }
  const cap = Math.max(0, Math.floor(promo.maxUnits));
  return units.slice(0, cap);
}

export function calcDiscount(
  subtotal: number,
  promo: { percentOff: number; amountOff?: number } | null,
): number {
  if (!promo || subtotal <= 0) return 0;
  let discount = 0;
  if (promo.percentOff > 0) {
    discount += Math.round(subtotal * (promo.percentOff / 100));
  }
  if (promo.amountOff && promo.amountOff > 0) {
    discount += Math.round(promo.amountOff);
  }
  return Math.min(subtotal, discount);
}

/**
 * Discount only on scoped product/duration units, and only up to maxUnits
 * (remaining per-user uses). Example: cart qty 5 + maxUnits 1 → 1 unit off.
 */
export function calcCartPromoDiscount(
  items: PromoCartLine[],
  promo: {
    percentOff: number;
    amountOff?: number;
    scope?: PromoScope;
    productId?: string | null;
    durationId?: string | null;
    maxUnits?: number;
  } | null,
): number {
  if (!promo) return 0;
  const scope = promo.scope ?? "GLOBAL";
  const cap =
    promo.maxUnits != null && Number.isFinite(promo.maxUnits)
      ? Math.max(0, Math.floor(promo.maxUnits))
      : items.reduce(
          (sum, i) => sum + Math.max(0, Math.floor(i.quantity)),
          0,
        );
  const units = eligiblePromoUnitPrices(items, {
    scope,
    productId: promo.productId ?? null,
    durationId: promo.durationId ?? null,
    maxUnits: cap,
  });
  const eligibleSubtotal = units.reduce((sum, p) => sum + p, 0);
  return calcDiscount(eligibleSubtotal, promo);
}

export const PROMO_STORAGE_KEY = "drip-promo-v2";

/** Soft fallback codes until admin seeds DB promos — cart still works offline. */
export const PROMO_CODES: Record<string, AppliedPromo> = {
  DRIP10: { code: "DRIP10", label: "10% off", percentOff: 10, maxUnits: 1 },
  DRIP15: { code: "DRIP15", label: "15% off", percentOff: 15, maxUnits: 1 },
  WELCOME: { code: "WELCOME", label: "5% off", percentOff: 5, maxUnits: 1 },
};

export function lookupPromo(raw: string): AppliedPromo | null {
  const code = normalizePromoCode(raw);
  if (!code) return null;
  const found = PROMO_CODES[code];
  if (!found) return null;
  return found;
}

export function promoDiscountSummary(promo: {
  discountPercent: number;
  discountAmount: number;
}): string {
  if (promo.discountPercent > 0) return `${promo.discountPercent}% off`;
  if (promo.discountAmount > 0) {
    return `${formatMoney(promo.discountAmount)} off`;
  }
  return "No discount";
}

export function promoAudienceLabel(role: PromoAudience | string): string {
  switch (role) {
    case "USER":
      return "Users only";
    case "SELLER":
      return "Sellers and resellers";
    default:
      return "All users";
  }
}
