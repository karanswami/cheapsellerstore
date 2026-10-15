import { formatMoney, microcentsToUsd } from "@/lib/currencies";
import {
  flashDateTimeInput,
  flashDateTimeLabel,
} from "@/lib/flash-sale-format";
import {
  parseFlashDateTime,
  parseFlashExpiresAt,
  parseFlashStartsAt,
} from "@/lib/flash-sales";
import { notifyMany } from "@/lib/notifications";
import {
  calcCartPromoDiscount,
  calcDiscount,
  eligiblePromoUnitPrices,
  lineMatchesPromoScope,
  lookupPromo,
  normalizePromoCode,
  promoAudienceLabel,
  promoDiscountSummary,
  PROMO_CODES,
  PROMO_STORAGE_KEY,
  type AppliedPromo,
  type PromoCartLine,
} from "@/lib/promo-calc";
import { prisma } from "@/lib/prisma";
import type { PromoAudience, PromoScope, UserRole } from "@prisma/client";
import { PromoAudience as PromoAudienceEnum } from "@prisma/client";

export type { AppliedPromo, PromoCartLine };
export type DbAppliedPromo = AppliedPromo & {
  amountOff: number;
  promoCodeId: string;
  scope: PromoScope;
  productId: string | null;
  durationId: string | null;
  maxUnits: number;
};

export {
  calcCartPromoDiscount,
  calcDiscount,
  eligiblePromoUnitPrices,
  lineMatchesPromoScope,
  lookupPromo,
  normalizePromoCode,
  promoAudienceLabel,
  promoDiscountSummary,
  PROMO_CODES,
  PROMO_STORAGE_KEY,
};

export const parsePromoStartsAt = parseFlashStartsAt;
export const parsePromoExpiresAt = parseFlashExpiresAt;
export const parsePromoDateTime = parseFlashDateTime;

export const promoDateTimeInput = flashDateTimeInput;
export const promoDateTimeLabel = flashDateTimeLabel;

/** @deprecated use promoDateTimeInput */
export function promoExpiresDateInput(
  iso: string | Date | null | undefined,
): string {
  return flashDateTimeInput(iso);
}

export async function notifyPromoAudience(opts: {
  code: string;
  description: string | null;
  targetRole: PromoAudience;
  discountPercent: number;
  discountAmount: number;
}): Promise<number> {
  const where =
    opts.targetRole === "ALL"
      ? { banned: false }
      : opts.targetRole === "SELLER"
        ? { banned: false, role: { in: ["SELLER", "RESELLER"] as UserRole[] } }
        : { banned: false, role: "USER" as UserRole };

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });
  if (users.length === 0) return 0;

  const discountLabel =
    opts.discountPercent > 0
      ? `${opts.discountPercent}% off`
      : `${formatMoney(opts.discountAmount)} off`;
  const title = `Promo ${opts.code}`;
  const message =
    opts.description?.trim() ||
    `New promo code ${opts.code} — ${discountLabel}. Use it at checkout.`;

  return notifyMany(
    users.map((u) => u.id),
    {
      type: "promo",
      title,
      message,
      actionUrl: "/app",
    },
  );
}

/** Flat USD dollars from stored microcents (for admin forms). */
export function promoFlatUsd(discountAmount: number): number {
  return microcentsToUsd(discountAmount);
}

function audienceOk(target: PromoAudience, role: UserRole): boolean {
  if (target === PromoAudienceEnum.ALL) return true;
  if (target === PromoAudienceEnum.USER) {
    return role === "USER";
  }
  if (target === PromoAudienceEnum.SELLER) {
    return role === "SELLER" || role === "RESELLER";
  }
  return false;
}

export type LookupPromoResult =
  | { ok: true; promo: DbAppliedPromo }
  | { ok: false; code: string; message: string };

export async function lookupPromoDb(
  raw: string,
  opts?: {
    role?: UserRole;
    userId?: string;
    items?: Array<{ productId: string; durationId: string; quantity?: number }>;
    productId?: string;
    durationId?: string;
  },
): Promise<DbAppliedPromo | null> {
  const result = await lookupPromoDetailed(raw, opts);
  return result.ok ? result.promo : null;
}

export async function lookupPromoDetailed(
  raw: string,
  opts?: {
    role?: UserRole;
    userId?: string;
    items?: Array<{ productId: string; durationId: string; quantity?: number }>;
    productId?: string;
    durationId?: string;
  },
): Promise<LookupPromoResult> {
  const code = normalizePromoCode(raw);
  if (!code) {
    return { ok: false, code: "INVALID", message: "Enter a promo code." };
  }

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Invalid or inactive promo code.",
    };
  }

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) {
    return {
      ok: false,
      code: "NOT_STARTED",
      message: "This promo has not started yet.",
    };
  }
  if (promo.expiresAt && promo.expiresAt < now) {
    return {
      ok: false,
      code: "EXPIRED",
      message: "This promo has expired.",
    };
  }

  if (opts?.role && !audienceOk(promo.targetRole, opts.role)) {
    return {
      ok: false,
      code: "AUDIENCE",
      message: "This promo is not available for your account.",
    };
  }

  if (promo.maxRedemptions != null) {
    const count = await prisma.promoRedemption.count({
      where: { promoCodeId: promo.id },
    });
    if (count >= promo.maxRedemptions) {
      return {
        ok: false,
        code: "MAXED",
        message: "This promo has reached its usage limit.",
      };
    }
  }

  let remainingUses = promo.perUserLimit;
  if (opts?.userId) {
    const used = await prisma.promoRedemption.count({
      where: { promoCodeId: promo.id, userId: opts.userId },
    });
    remainingUses = promo.perUserLimit - used;
    if (remainingUses <= 0) {
      return {
        ok: false,
        code: "USER_LIMIT",
        message: "You have already used this promo.",
      };
    }
  }

  const cartLines = opts?.items ?? [];
  if (cartLines.length > 0) {
    const hasMatch = cartLines.some((line) =>
      lineMatchesPromoScope(line, promo),
    );
    if (!hasMatch) {
      return {
        ok: false,
        code: "SCOPE",
        message:
          promo.scope === "PRODUCT"
            ? "This promo only applies to a specific product in your cart."
            : promo.scope === "DURATION"
              ? "This promo only applies to a specific duration in your cart."
              : "No eligible cart items for this promo.",
      };
    }
  } else if (opts?.productId || opts?.durationId) {
    if (
      promo.scope === "PRODUCT" &&
      opts.productId &&
      promo.productId !== opts.productId
    ) {
      return {
        ok: false,
        code: "SCOPE",
        message: "This promo only applies to a specific product.",
      };
    }
    if (
      promo.scope === "DURATION" &&
      opts.durationId &&
      promo.durationId !== opts.durationId
    ) {
      return {
        ok: false,
        code: "SCOPE",
        message: "This promo only applies to a specific duration.",
      };
    }
  }

  return {
    ok: true,
    promo: {
      code: promo.code,
      label:
        promo.description ||
        `${promo.discountPercent || promo.discountAmount} off`,
      percentOff: promo.discountPercent,
      amountOff: promo.discountAmount,
      promoCodeId: promo.id,
      scope: promo.scope,
      productId: promo.productId,
      durationId: promo.durationId,
      maxUnits: remainingUses,
    },
  };
}
