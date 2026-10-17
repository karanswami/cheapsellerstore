import {
  looksLikeObjectId,
  parseCatalogNumber,
} from "@/lib/seller-api/codes";
import { countAvailableKeysByDuration } from "@/lib/keys";
import { MICROCENTS_PER_USD, microcentsToUsdString } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import { getSpecialPricesForUser, resolveUnitPrice } from "@/lib/pricing";
import { isWholesaleRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

export const API_MONEY_HINT = {
  unit: "USD_MICROCENTS" as const,
  perUsd: MICROCENTS_PER_USD,
};

export const PRICE_TIERS_NOTE =
  "Public (no key) always returns retail price. With Bearer, price is your account tier: USER/ADMIN → retail, SELLER/RESELLER → wholesale (special overrides both). Charge on POST /orders is always computed server-side — never send price in the body.";

export type PriceTier = "retail" | "wholesale" | "special";

export type ApiSku = {
  /** Buyable SKU number (duration). Use as `sku` on pricing / stock / orders. */
  sku: number;
  name: string;
  product: string;
  productNumber: number;
  category: string;
  label: string;
  days: number | null;
  hours: number | null;
  imageUrl: string | null;
  description: string;
  price: number;
  priceUsd: string;
  currency: "USD";
  stock: number;
  inStock: boolean;
  priceTier: PriceTier;
  requires_android_id: boolean;
  is_maintenance?: boolean;
};

export type DurationLookupFail = {
  ok: false;
  code: "DURATION_REQUIRED" | "UNKNOWN_DURATION";
  message: string;
};

export type DurationLookupOk<T> = { ok: true; duration: T };

/** Reserved sandbox SKU — real SKUs start at 500. */
export const SANDBOX_SKU = 499;

type DurationWithProduct = NonNullable<
  Awaited<ReturnType<typeof loadDurationByCodeOrId>>
>;

async function loadDurationByCodeOrId(codeOrId: string) {
  const raw = codeOrId.trim();
  if (!raw) return null;

  if (looksLikeObjectId(raw)) {
    const byId = await prisma.duration.findUnique({
      where: { id: raw },
      include: {
        product: { include: { category: true } },
        prices: { where: { currency: "USD" } },
      },
    });
    if (byId) return byId;
  }

  const number = parseCatalogNumber(raw);
  if (number === null) return null;
  if (number === SANDBOX_SKU) {
    return {
      id: "sandbox_demo_duration_id",
      number: SANDBOX_SKU,
      label: "30 Days",
      days: 30,
      hours: null,
      requiresAndroidId: false,
      deviceIdName: "",
      productId: "sandbox_demo_product_id",
      createdAt: new Date(),
      updatedAt: new Date(),
      prices: [
        {
          id: "sandbox_price_id",
          durationId: "sandbox_demo_duration_id",
          currency: "USD" as const,
          price: 100_000_000,
          resellerPrice: 80_000_000,
          buyPrice: 50_000_000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      product: {
        id: "sandbox_demo_product_id",
        title: "Sandbox Demo Product",
        description: "Fake catalog item for sandbox keys.",
        number: 0,
        rating: 5,
        imageUrl: null,
        demoUrl: null,
        features: [],
        isBestSeller: false,
        isNew: false,
        isPinned: false,
        isMaintenance: false,
        isActive: true,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }
  return prisma.duration.findUnique({
    where: { number },
    include: {
      product: { include: { category: true } },
      prices: { where: { currency: "USD" } },
    },
  });
}

export async function resolveDurationByCodeOrId(codeOrId: string) {
  return loadDurationByCodeOrId(codeOrId);
}

/** Resolve SKU (duration number); if value is a product number, return DURATION_REQUIRED. */
export async function resolveDurationForApi(
  codeOrId: string,
): Promise<DurationLookupOk<DurationWithProduct> | DurationLookupFail> {
  const raw = codeOrId.trim();
  if (!raw) {
    return {
      ok: false,
      code: "UNKNOWN_DURATION",
      message:
        "SKU is required. Call GET /api/v1/products and use items[].sku (or body field sku).",
    };
  }

  const duration = await loadDurationByCodeOrId(raw);
  if (duration && duration.product.isActive) {
    return { ok: true, duration };
  }

  const product = await resolveProductByCodeOrId(raw);
  if (product?.isActive) {
    const sample = product.durations[0]?.number;
    return {
      ok: false,
      code: "DURATION_REQUIRED",
      message: `${product.number} is a product number. Pass a SKU from items[].sku${sample ? ` (e.g. ${sample})` : ""} — not the product number.`,
    };
  }

  return {
    ok: false,
    code: "UNKNOWN_DURATION",
    message:
      "Unknown SKU. Call GET /api/v1/products and use items[].sku (not the product title or product number).",
  };
}

export async function resolveProductByCodeOrId(codeOrId: string) {
  const raw = codeOrId.trim();
  if (!raw) return null;

  const include = {
    category: true,
    durations: {
      include: { prices: { where: { currency: "USD" as const } } },
      orderBy: { number: "asc" as const },
    },
  };

  if (looksLikeObjectId(raw)) {
    const byId = await prisma.product.findUnique({
      where: { id: raw },
      include,
    });
    if (byId) return byId;
  }

  const number = parseCatalogNumber(raw);
  if (number === null) return null;
  return prisma.product.findUnique({
    where: { number },
    include,
  });
}

export function resolvePriceTier(
  role: UserRole | undefined,
  specialPrice?: number | null,
): PriceTier {
  if (specialPrice != null && Number.isFinite(specialPrice)) return "special";
  if (role && isWholesaleRole(role)) return "wholesale";
  return "retail";
}

function unitPriceForViewer(
  priceRow: { price: number; resellerPrice: number } | undefined,
  role?: UserRole,
  specialPrice?: number | null,
) {
  if (!priceRow) return 0;
  // Public (no role) → retail only (do not leak wholesale).
  if (!role) return priceRow.price;
  return resolveUnitPrice({ role, priceRow, specialPrice });
}

function mapSku(input: {
  sku: number;
  label: string;
  days: number | null;
  hours?: number | null;
  productTitle: string;
  productNumber: number;
  categoryName: string | null;
  imageUrl: string | null;
  description: string;
  price: number;
  stock: number;
  priceTier: PriceTier;
  requiresAndroidId?: boolean;
  isMaintenance?: boolean;
}): ApiSku {
  const isMaintenance = Boolean(input.isMaintenance);
  const effectiveStock = isMaintenance ? 0 : input.stock;
  return {
    sku: input.sku,
    name: `${input.productTitle} — ${input.label}`,
    product: input.productTitle,
    productNumber: input.productNumber,
    category: input.categoryName?.trim() || "Uncategorized",
    label: input.label,
    days: input.days,
    hours: input.hours ?? null,
    imageUrl: input.imageUrl,
    description: input.description,
    price: input.price,
    priceUsd: microcentsToUsdString(input.price),
    currency: "USD",
    stock: effectiveStock,
    inStock: effectiveStock > 0 && !isMaintenance,
    priceTier: input.priceTier,
    requires_android_id: input.requiresAndroidId ?? false,
    is_maintenance: isMaintenance,
  };
}

type ProductRow = {
  title: string;
  description: string;
  imageUrl: string | null;
  number: number;
  isMaintenance?: boolean;
  category: { name: string } | null;
  durations: {
    id: string;
    number: number;
    label: string;
    days: number | null;
    hours?: number | null;
    requiresAndroidId: boolean;
    prices: { price: number; resellerPrice: number }[];
  }[];
};

async function mapProductSkus(
  p: ProductRow,
  role?: UserRole,
  specialPrices?: Map<string, number>,
): Promise<ApiSku[]> {
  const durationIds = p.durations.map((d) => d.id);
  const stockMap = await countAvailableKeysByDuration(durationIds);
  const out: ApiSku[] = [];
  for (const d of p.durations) {
    const priceRow = d.prices[0];
    const special = specialPrices?.get(d.id) ?? null;
    const price = unitPriceForViewer(priceRow, role, special);
    const stock = stockMap.get(d.id) ?? 0;
    out.push(
      mapSku({
        sku: d.number,
        label: d.label,
        days: d.days,
        hours: d.hours,
        productTitle: p.title,
        productNumber: p.number,
        categoryName: p.category?.name ?? null,
        imageUrl: p.imageUrl,
        description: p.description,
        price,
        stock,
        priceTier: resolvePriceTier(role, special),
        requiresAndroidId: d.requiresAndroidId,
        isMaintenance: p.isMaintenance,
      }),
    );
  }
  return out;
}

/** Flat buyable SKU catalog. Public = retail; Bearer = account tier price. */
export async function listApiCatalog(role?: UserRole, userId?: string) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { number: "asc" },
    include: {
      category: true,
      durations: {
        include: { prices: { where: { currency: "USD" } } },
        orderBy: { number: "asc" },
      },
    },
  });

  const durationIds = products.flatMap((p) => p.durations.map((d) => d.id));
  const specialPrices = await getSpecialPricesForUser(userId, durationIds);

  const items: ApiSku[] = [];
  for (const p of products) {
    items.push(...(await mapProductSkus(p, role, specialPrices)));
  }
  return items;
}

export async function getApiProduct(
  codeOrId: string,
  role?: UserRole,
  userId?: string,
) {
  // Prefer product match; if code is a SKU, return that product + single item.
  const asProduct = await resolveProductByCodeOrId(codeOrId);
  if (asProduct?.isActive) {
    const durationIds = asProduct.durations.map((d) => d.id);
    const specialPrices = await getSpecialPricesForUser(userId, durationIds);
    const items = await mapProductSkus(asProduct, role, specialPrices);
    return {
      product: {
        productNumber: asProduct.number,
        title: asProduct.title,
        description: asProduct.description,
        imageUrl: asProduct.imageUrl,
        category: asProduct.category?.name?.trim() || "Uncategorized",
        is_maintenance: Boolean(asProduct.isMaintenance),
      },
      items,
    };
  }

  const asDuration = await loadDurationByCodeOrId(codeOrId);
  if (asDuration && asDuration.product.isActive) {
    const specialPrices = await getSpecialPricesForUser(userId, [
      asDuration.id,
    ]);
    const items = await mapProductSkus(
      {
        title: asDuration.product.title,
        description: asDuration.product.description,
        imageUrl: asDuration.product.imageUrl,
        number: asDuration.product.number,
        category: asDuration.product.category,
        isMaintenance: asDuration.product.isMaintenance,
        durations: [asDuration],
      },
      role,
      specialPrices,
    );
    return {
      product: {
        productNumber: asDuration.product.number,
        title: asDuration.product.title,
        description: asDuration.product.description,
        imageUrl: asDuration.product.imageUrl,
        category:
          asDuration.product.category?.name?.trim() || "Uncategorized",
        is_maintenance: Boolean(asDuration.product.isMaintenance),
      },
      items,
    };
  }

  return null;
}

export async function getApiPricing(
  codeOrId: string,
  role?: UserRole,
  userId?: string,
) {
  const resolved = await resolveDurationForApi(codeOrId);
  if (!resolved.ok) return resolved;

  const d = resolved.duration;
  if (!d.product.isActive) {
    return {
      ok: false as const,
      code: "UNKNOWN_DURATION" as const,
      message:
        "Unknown SKU. Call GET /api/v1/products and use items[].sku.",
    };
  }
  const priceRow = d.prices[0];
  if (!priceRow) {
    return {
      ok: false as const,
      code: "UNKNOWN_DURATION" as const,
      message: "No USD price for this SKU.",
    };
  }

  const specialPrices = await getSpecialPricesForUser(userId, [d.id]);
  const special = specialPrices.get(d.id) ?? null;
  const price = unitPriceForViewer(priceRow, role, special);
  const stockMap = await countAvailableKeysByDuration([d.id]);
  const rawStock = stockMap.get(d.id) ?? 0;
  const isMaintenance = Boolean(d.product.isMaintenance);
  const stock = isMaintenance ? 0 : rawStock;
  const priceTier = resolvePriceTier(role, special);

  return {
    ok: true as const,
    data: {
      sku: d.number,
      name: `${d.product.title} — ${d.label}`,
      product: d.product.title,
      productNumber: d.product.number,
      label: d.label,
      price,
      priceUsd: microcentsToUsdString(price),
      currency: "USD" as const,
      stock,
      inStock: stock > 0 && !isMaintenance,
      priceTier,
      requires_android_id: d.requiresAndroidId ?? false,
      is_maintenance: isMaintenance,
      money: API_MONEY_HINT,
    },
  };
}

export async function getApiStock(codeOrId: string) {
  const resolved = await resolveDurationForApi(codeOrId);
  if (!resolved.ok) return resolved;

  const d = resolved.duration;
  if (!d.product.isActive) {
    return {
      ok: false as const,
      code: "UNKNOWN_DURATION" as const,
      message:
        "Unknown SKU. Call GET /api/v1/products and use items[].sku.",
    };
  }

  if (d.product.isMaintenance) {
    return {
      ok: true as const,
      data: {
        sku: d.number,
        stock: 0,
        inStock: false,
        busy: true,
        is_maintenance: true,
        message: `Maintenance — "${d.product.title}" is currently under maintenance.`,
      },
    };
  }

  const stockMap = await countAvailableKeysByDuration([d.id]);
  const stock = stockMap.get(d.id) ?? 0;
  return {
    ok: true as const,
    data: {
      sku: d.number,
      stock,
      inStock: stock > 0,
      busy: stock <= 0,
      is_maintenance: false,
      message:
        stock <= 0
          ? "Busy — this SKU is out of stock. Retry later."
          : undefined,
    },
  };
}

export async function sandboxSkus(
  role?: UserRole,
  userId?: string,
): Promise<ApiSku[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    take: 10,
    orderBy: { number: "asc" },
    include: {
      category: true,
      durations: {
        include: { prices: { where: { currency: "USD" } } },
        orderBy: { number: "asc" },
      },
    },
  });

  const fallbackRetail = 100_000_000;
  const fallbackReseller = 80_000_000;
  const fallbackPrice =
    role && isWholesaleRole(role) ? fallbackReseller : fallbackRetail;
  const fallbackPriceTier = resolvePriceTier(role, null);

  const fallbackSku = mapSku({
    sku: SANDBOX_SKU,
    label: "30 Days",
    days: 30,
    hours: null,
    productTitle: "Sandbox Demo Product",
    productNumber: 0,
    categoryName: "Sandbox",
    imageUrl: null,
    description: "Fake catalog item for sandbox keys.",
    price: fallbackPrice,
    stock: 999,
    priceTier: fallbackPriceTier,
    requiresAndroidId: false,
  });

  if (products.length === 0) {
    return [fallbackSku];
  }

  const durationIds = products.flatMap((p) => p.durations.map((d) => d.id));
  const specialPrices = await getSpecialPricesForUser(userId, durationIds);
  const items: ApiSku[] = [];

  for (const p of products) {
    for (const d of p.durations) {
      const priceRow = d.prices[0];
      const special = specialPrices?.get(d.id) ?? null;
      const price = unitPriceForViewer(priceRow, role, special);
      items.push(
        mapSku({
          sku: d.number,
          label: d.label,
          days: d.days,
          hours: d.hours,
          productTitle: p.title,
          productNumber: p.number,
          categoryName: p.category?.name ?? null,
          imageUrl: p.imageUrl,
          description: p.description,
          price,
          stock: 999, // Unlimited mock stock for sandbox testing
          priceTier: resolvePriceTier(role, special),
          requiresAndroidId: d.requiresAndroidId,
        }),
      );
      if (items.length >= 10) break;
    }
    if (items.length >= 10) break;
  }

  if (items.length === 0) {
    return [fallbackSku];
  }

  return items;
}

export async function sandboxCatalogProduct(
  codeOrId: string,
  role?: UserRole,
  userId?: string,
) {
  const skus = await sandboxSkus(role, userId);
  const wanted = parseCatalogNumber(codeOrId);
  const matchedSku = skus.find(
    (s) => s.sku === wanted || s.productNumber === wanted,
  );

  if (matchedSku) {
    return {
      product: {
        productNumber: matchedSku.productNumber,
        title: matchedSku.product,
        description: matchedSku.description,
        imageUrl: matchedSku.imageUrl,
        category: matchedSku.category,
      },
      items: skus.filter(
        (s) =>
          s.productNumber === matchedSku.productNumber ||
          s.sku === matchedSku.sku,
      ),
    };
  }

  return {
    product: {
      productNumber: 0,
      title: "Sandbox Demo Product",
      description: "Fake catalog item for sandbox keys.",
      imageUrl: null as string | null,
      category: "Sandbox",
    },
    items: skus,
  };
}

export function catalogListPayload(
  items: ApiSku[],
  role?: UserRole,
  extra?: Record<string, unknown>,
) {
  return {
    money: API_MONEY_HINT,
    priceTier: resolvePriceTier(role, null),
    items,
    ...extra,
  };
}
