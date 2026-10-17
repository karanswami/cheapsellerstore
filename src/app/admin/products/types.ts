import { microcentsToUsd } from "@/lib/currencies";

export type Price = { id: string; price: number; resellerPrice: number; buyPrice: number };

export type DurationRow = {
  id: string;
  number: number;
  label: string;
  days: number | null;
  hours: number | null;
  requiresAndroidId: boolean;
  deviceIdName: string;
  prices: Price[];
  available: number;
  sold: number;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  _count: { products: number };
};

export type ProductRow = {
  id: string;
  number: number;
  title: string;
  description: string;
  imageUrl: string | null;
  demoUrl: string | null;
  features: string[];
  isBestSeller: boolean;
  isNew: boolean;
  isPinned: boolean;
  isMaintenance: boolean;
  isActive: boolean;
  categoryId: string | null;
  category: CategoryRow | null;
  durations: DurationRow[];
  keyAvailable: number;
  keySold: number;
};

/** Duration form values — prices are USD decimals (not microcents). */
export type DurationDraft = {
  id?: string;
  number?: number;
  label: string;
  days: number | null;
  hours: number | null;
  price: number;
  resellerPrice: number;
  buyPrice: number;
  requiresAndroidId: boolean;
  deviceIdName: string;
  available?: number;
  sold?: number;
};

export function rowToDraft(d: DurationRow): DurationDraft {
  const p = d.prices[0];
  return {
    id: d.id,
    number: d.number,
    label: d.label,
    days: d.days,
    hours: d.hours,
    price: p ? microcentsToUsd(p.price) : 0,
    resellerPrice: p ? microcentsToUsd(p.resellerPrice) : 0,
    buyPrice: p ? microcentsToUsd(p.buyPrice) : 0,
    requiresAndroidId: d.requiresAndroidId,
    deviceIdName: d.deviceIdName,
    available: d.available,
    sold: d.sold,
  };
}

export const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export function formatLength(d: { days: number | null; hours: number | null }) {
  if (d.hours) return `${d.hours} hour${d.hours === 1 ? "" : "s"}`;
  if (d.days) return `${d.days} day${d.days === 1 ? "" : "s"}`;
  return "Lifetime";
}
