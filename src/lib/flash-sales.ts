import { notifyBulk } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import type { FlashSaleScope, PromoAudience, UserRole } from "@prisma/client";
import { PromoAudience as PromoAudienceEnum } from "@prisma/client";

export {
  flashAudienceLabel,
  flashDateInput,
  flashDateTimeInput,
  flashDateTimeLabel,
  flashScopeLabel,
  formatFlashCountdown,
} from "@/lib/flash-sale-format";

export type ActiveFlashSale = {
  id: string;
  title: string;
  discountPercent: number;
  scope: FlashSaleScope;
  targetRole: PromoAudience;
  productId: string | null;
  durationId: string | null;
  startsAt: Date | null;
  expiresAt: Date | null;
};

export type PublicFlashSale = {
  id: string;
  title: string;
  discountPercent: number;
  scope: FlashSaleScope;
  startsAt: string | null;
  expiresAt: string | null;
};

function audienceOk(target: PromoAudience, role: UserRole): boolean {
  if (target === PromoAudienceEnum.ALL) return true;
  if (target === PromoAudienceEnum.USER) return role === "USER";
  if (target === PromoAudienceEnum.SELLER) {
    return role === "SELLER" || role === "RESELLER";
  }
  return false;
}

/**
 * Parse admin start/end. Prefer full ISO with offset (`…Z`) from the browser
 * (`localDateTimeToIso`). Bare `YYYY-MM-DDTHH:mm` is treated as UTC on the
 * server (VPS), so clients should convert before save.
 */
export function parseFlashDateTime(
  value: string | null | undefined,
): Date | null {
  if (value == null || value === "") return null;
  const trimmed = value.trim();
  // Explicit offset / Z — authoritative instant from the admin browser.
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(
      trimmed,
    )
  ) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    // Legacy bare local string — interpret as UTC wall time (same as Node default on VPS).
    const d = new Date(`${trimmed}:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    const d = new Date(trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed) ? trimmed : `${trimmed}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseFlashStartsAt(value: string | null | undefined): Date | null {
  return parseFlashDateTime(value);
}

/** End-of-day only when date-only string; datetime-local uses exact minute. */
export function parseFlashExpiresAt(
  value: string | null | undefined,
): Date | null {
  if (value == null || value === "") return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T23:59:59.999`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return parseFlashDateTime(trimmed);
}

export function toPublicFlashSale(sale: ActiveFlashSale): PublicFlashSale {
  return {
    id: sale.id,
    title: sale.title,
    discountPercent: sale.discountPercent,
    scope: sale.scope,
    startsAt: sale.startsAt?.toISOString() ?? null,
    expiresAt: sale.expiresAt?.toISOString() ?? null,
  };
}

export async function notifyFlashSaleAudience(opts: {
  title: string;
  discountPercent: number;
  targetRole: PromoAudience;
  scope: string;
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

  const scopeHint =
    opts.scope === "PRODUCT"
      ? " on a selected product"
      : opts.scope === "DURATION"
        ? " on a selected duration"
        : " storewide";

  return notifyBulk(
    users.map((u) => u.id),
    {
      type: "flash_sale",
      title: `Flash sale: ${opts.title}`,
      message: `${opts.discountPercent}% off${scopeHint}. Limited time — shop now.`,
      actionUrl: "/app",
    },
  );
}

export async function listActiveFlashSales(): Promise<ActiveFlashSale[]> {
  const now = new Date();
  return prisma.flashSale.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ],
    },
    orderBy: { discountPercent: "desc" },
  });
}

export function pickFlashSale(
  sales: ActiveFlashSale[],
  opts: { role: UserRole; productId?: string; durationId?: string },
): ActiveFlashSale | null {
  for (const sale of sales) {
    if (!audienceOk(sale.targetRole, opts.role)) continue;
    if (sale.scope === "GLOBAL") return sale;
    if (sale.scope === "PRODUCT" && sale.productId === opts.productId) {
      return sale;
    }
    if (sale.scope === "DURATION" && sale.durationId === opts.durationId) {
      return sale;
    }
  }
  return null;
}

export async function getActiveFlashSale(opts: {
  role: UserRole;
  productId?: string;
  durationId?: string;
}) {
  const sales = await listActiveFlashSales();
  return pickFlashSale(sales, opts);
}

/** Apply percent discount to a microcents price; result stays integer microcents. */
export function applyFlashPercent(
  price: number,
  discountPercent: number,
): number {
  if (discountPercent <= 0) return Math.round(price);
  const next = price * (1 - discountPercent / 100);
  return Math.round(next);
}
