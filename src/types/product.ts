import type { Currency } from "@/lib/currencies";

export type ProductFlashSale = {
  id: string;
  title: string;
  discountPercent: number;
  scope: "GLOBAL" | "PRODUCT" | "DURATION";
  startsAt: string | null;
  expiresAt: string | null;
};

export type DurationOption = {
  id: string;
  label: string;
  /** Optional version group (Lite / Brutal). Empty = no version step. */
  version: string;
  days: number | null;
  /** Pay price (flash-adjusted when a sale applies). */
  price: number | null;
  /** Catalog list price before flash (null when no sale). */
  listPrice: number | null;
  currency: Currency;
  stock: number;
  flashSale: ProductFlashSale | null;
  requiresAndroidId?: boolean;
  deviceIdName?: string;
};

/** Cart / sheet display: "Lite · 1 Day" when version is set. */
export function formatDurationLabel(
  duration: Pick<DurationOption, "label" | "version">,
): string {
  const version = duration.version.trim();
  return version ? `${version} · ${duration.label}` : duration.label;
}

/** Distinct non-empty versions on a product (order = first seen). */
export function listProductVersions(
  durations: Pick<DurationOption, "version">[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of durations) {
    const v = d.version.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export type ProductCardData = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  /** Resolved demo URL (product override or site default). */
  demoUrl: string;
  features: string[];
  isBestSeller: boolean;
  isNew: boolean;
  isPinned: boolean;
  isMaintenance: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
  } | null;
  durations: DurationOption[];
  startingPrice: number | null;
  /** Pre-flash starting price when any duration is on sale. */
  startingListPrice: number | null;
  currency: Currency;
  /** Best active flash that applies to this product (for card ticker). */
  flashSale: ProductFlashSale | null;
  likeCount?: number;
  liked?: boolean;
};

export function getStartingPrice(durations: { price: number | null }[]): number | null {
  const prices = durations
    .map((d) => d.price)
    .filter((p): p is number => p != null);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}
