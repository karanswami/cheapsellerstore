import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/currencies";
import type { PublicOfferBanner } from "@/types/offer-banner";
import { cache } from "react";

/** Max stacked flash/promo offer cards under the main home carousel. */
export const MAX_OFFER_BANNERS = 3;

function windowFilter(now: Date) {
  return {
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
    ],
  };
}

const DEFAULT_OFFER_DESC =
  "Grab premium products at an unbeatable price before the timer runs out.";

/** Title-case words; map bare "flash" → "Flash Sale" for storefront polish. */
function polishOfferTitle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Flash Sale";
  if (/^flash$/i.test(trimmed) || /^flash\s*sale$/i.test(trimmed)) {
    return "Flash Sale";
  }
  return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Prefer custom copy; skip empty / duplicate-of-title strings. */
function resolveOfferDescription(
  title: string,
  raw: string | null | undefined,
): string {
  const desc = raw?.trim() ?? "";
  if (!desc) return DEFAULT_OFFER_DESC;
  if (desc.toLowerCase() === title.trim().toLowerCase()) return DEFAULT_OFFER_DESC;
  if (/^flash$/i.test(desc)) return DEFAULT_OFFER_DESC;
  return desc;
}

function flashToBanner(flash: {
  id: string;
  title: string;
  discountPercent: number;
  bannerDescription: string | null;
  displayPromoCode: string | null;
  expiresAt: Date | null;
}): PublicOfferBanner {
  const title = polishOfferTitle(flash.title || "Flash Sale");
  return {
    kind: "flash",
    id: flash.id,
    title,
    description: resolveOfferDescription(title, flash.bannerDescription),
    discountLabel: `${Math.round(flash.discountPercent)}% OFF`,
    promoCode: flash.displayPromoCode?.trim() || null,
    expiresAt: flash.expiresAt?.toISOString() ?? null,
  };
}

function promoToBanner(promo: {
  id: string;
  code: string;
  description: string | null;
  discountPercent: number;
  discountAmount: number;
  expiresAt: Date | null;
}): PublicOfferBanner {
  const discountLabel =
    promo.discountPercent > 0
      ? `${Math.round(promo.discountPercent)}% OFF`
      : promo.discountAmount > 0
        ? `${formatMoney(promo.discountAmount)} OFF`
        : "SPECIAL";

  const title = polishOfferTitle(
    promo.description?.trim() || "Limited Time Special Offer",
  );

  return {
    kind: "promo",
    id: promo.id,
    title,
    description: resolveOfferDescription(title, null),
    discountLabel,
    promoCode: promo.code,
    expiresAt: promo.expiresAt?.toISOString() ?? null,
  };
}

/**
 * Active flash/promo cards with `showBanner` on (up to {@link MAX_OFFER_BANNERS}).
 * Flash sales first (higher % first), then promos — stacked under the image carousel.
 */
export const getActiveOfferBanners = cache(
  async (): Promise<PublicOfferBanner[]> => {
    const now = new Date();
    const offers: PublicOfferBanner[] = [];

    const flashes = await prisma.flashSale.findMany({
      where: {
        active: true,
        showBanner: true,
        ...windowFilter(now),
      },
      orderBy: { discountPercent: "desc" },
      take: MAX_OFFER_BANNERS,
    });

    for (const flash of flashes) {
      offers.push(flashToBanner(flash));
      if (offers.length >= MAX_OFFER_BANNERS) return offers;
    }

    const remaining = MAX_OFFER_BANNERS - offers.length;
    if (remaining <= 0) return offers;

    const promos = await prisma.promoCode.findMany({
      where: {
        active: true,
        showBanner: true,
        ...windowFilter(now),
      },
      orderBy: [{ discountPercent: "desc" }, { createdAt: "desc" }],
      take: remaining,
    });

    for (const promo of promos) {
      offers.push(promoToBanner(promo));
    }

    return offers;
  },
);

/** @deprecated Prefer {@link getActiveOfferBanners} — kept for single-card callers. */
export const getActiveOfferBanner = cache(
  async (): Promise<PublicOfferBanner | null> => {
    const list = await getActiveOfferBanners();
    return list[0] ?? null;
  },
);
