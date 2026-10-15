import {
  applyFlashPercent,
  listActiveFlashSales,
  pickFlashSale,
  toPublicFlashSale,
  type ActiveFlashSale,
} from "@/lib/flash-sales";
import { prisma } from "@/lib/prisma";
import {
  getStartingPrice,
  type ProductCardData,
  type ProductFlashSale,
} from "@/types/product";
import { Currency } from "@/lib/currencies";
import { getSpecialPricesForUser, resolveUnitPrice } from "@/lib/pricing";
import { getDefaultProductDemoUrl } from "@/lib/settings";
import { getEffectiveStockByDuration } from "@/lib/supplier/stock";
import { type Prisma, type UserRole } from "@prisma/client";

function productInclude(currency: Currency) {
  return {
    category: true,
    _count: {
      select: {
        // String literals avoid Turbopack stripping Prisma runtime enums.
        reviews: { where: { status: "APPROVED" } },
      },
    },
    durations: {
      include: {
        _count: {
          select: {
            keys: { where: { status: "AVAILABLE" } },
          },
        },
        prices: {
          where: { currency },
          select: { price: true, resellerPrice: true, currency: true },
        },
      },
    },
  } satisfies Prisma.ProductInclude;
}

export async function getCategories() {
  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = await getRedis();
    if (redis) {
      const cached = await redis.get("cheapseller:cache:categories");
      if (cached) {
        return JSON.parse(cached);
      }
    }
  } catch {
    // fallback to Mongo
  }

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });

  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = await getRedis();
    if (redis && categories.length > 0) {
      await redis.set("cheapseller:cache:categories", JSON.stringify(categories), "EX", 120);
    }
  } catch {
    // ignore cache write error
  }

  return categories;
}

function bestProductFlash(
  sales: ActiveFlashSale[],
  role: UserRole,
  productId: string,
  durationIds: string[],
  specialPrices?: Map<string, number>,
): ProductFlashSale | null {
  let best: ActiveFlashSale | null = null;
  for (const durationId of durationIds) {
    // Special-priced durations skip flash entirely.
    if (specialPrices?.has(durationId)) continue;
    const sale = pickFlashSale(sales, { role, productId, durationId });
    if (!sale) continue;
    if (!best || sale.discountPercent > best.discountPercent) {
      best = sale;
    }
  }
  return best ? toPublicFlashSale(best) : null;
}

type ProductWithCatalog = Prisma.ProductGetPayload<{
  include: ReturnType<typeof productInclude>;
}>;

function mapProductCard(
  product: ProductWithCatalog,
  sales: ActiveFlashSale[],
  currency: Currency,
  role: UserRole,
  defaultDemoUrl: string,
  specialPrices?: Map<string, number>,
): ProductCardData {
  const durations = product.durations
    .map((duration) => {
      const priceRow = duration.prices[0];
      const special = specialPrices?.get(duration.id);
      const isSpecial = special != null;
      const listPrice = priceRow
        ? resolveUnitPrice({ role, priceRow, specialPrice: special })
        : null;
      const flash =
        isSpecial || listPrice == null
          ? null
          : pickFlashSale(sales, {
              role,
              productId: product.id,
              durationId: duration.id,
            });
      const price =
        listPrice != null && flash
          ? applyFlashPercent(listPrice, flash.discountPercent)
          : listPrice;

      return {
        id: duration.id,
        label: duration.label,
        version: duration.version ?? "",
        days: duration.days,
        price,
        listPrice: flash && listPrice != null ? listPrice : null,
        currency,
        stock: duration._count.keys,
        flashSale: flash ? toPublicFlashSale(flash) : null,
        requiresAndroidId: duration.requiresAndroidId,
        deviceIdName: duration.deviceIdName ?? "",
      };
    })
    .sort(
      (a, b) =>
        (a.price ?? Number.POSITIVE_INFINITY) -
        (b.price ?? Number.POSITIVE_INFINITY),
    );

  const flashSale = bestProductFlash(
    sales,
    role,
    product.id,
    product.durations.map((d) => d.id),
    specialPrices,
  );

  const startingPrice = getStartingPrice(durations);
  const listPrices = durations
    .map((d) => d.listPrice ?? d.price)
    .filter((p): p is number => p != null);
  const startingListPrice =
    flashSale && listPrices.length > 0 ? Math.min(...listPrices) : null;

  const productDemo = product.demoUrl?.trim() ?? "";

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    rating: product.rating,
    reviewCount: product._count.reviews,
    imageUrl: product.imageUrl,
    demoUrl: productDemo || defaultDemoUrl,
    features: Array.isArray(product.features) ? product.features : [],
    isBestSeller: product.isBestSeller,
    isNew: product.isNew,
    isPinned: product.isPinned,
    isMaintenance: product.isMaintenance ?? false,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
          icon: product.category.icon ?? null,
        }
      : null,
    durations,
    startingPrice,
    startingListPrice:
      startingListPrice != null &&
      startingPrice != null &&
      startingListPrice > startingPrice
        ? startingListPrice
        : null,
    currency,
    flashSale,
  };
}

const DEFAULT_PRODUCT_PAGE_SIZE = 12;

export type ProductsPage = {
  products: ProductCardData[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export async function getProductsPage(options?: {
  categorySlug?: string;
  currency?: Currency;
  role?: UserRole;
  userId?: string | null;
  page?: number;
  limit?: number;
}): Promise<ProductsPage> {
  const currency = options?.currency ?? Currency.USD;
  const role = options?.role ?? "USER";
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(
    48,
    Math.max(1, options?.limit ?? DEFAULT_PRODUCT_PAGE_SIZE),
  );
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    durations: { some: {} },
    ...(options?.categorySlug
      ? { category: { slug: options.categorySlug } }
      : undefined),
  };

  const [total, products, sales, defaultDemoUrl, specialPrices] =
    await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude(currency),
        // Pin → bestseller → oldest (admin pin + flags; first-added at top within tier)
        orderBy: [
          { isPinned: "desc" },
          { isBestSeller: "desc" },
          { createdAt: "asc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      listActiveFlashSales(),
      getDefaultProductDemoUrl(),
      getSpecialPricesForUser(options?.userId),
    ]);

  const cards = products.map((product) =>
    mapProductCard(
      product,
      sales,
      currency,
      role,
      defaultDemoUrl,
      specialPrices,
    ),
  );

  const durationIds = cards.flatMap((p) => p.durations.map((d) => d.id));
  const stockMap = await getEffectiveStockByDuration(durationIds);
  for (const card of cards) {
    for (const d of card.durations) {
      d.stock = stockMap.get(d.id) ?? d.stock;
    }
  }

  return {
    products: cards,
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}

/** Full catalog (admin / rare callers). Prefer `getProductsPage` on storefront. */
export async function getProducts(
  categorySlug?: string,
  currency: Currency = Currency.USD,
  role: UserRole = "USER",
  userId?: string | null,
): Promise<ProductCardData[]> {
  const page = await getProductsPage({
    categorySlug,
    currency,
    role,
    userId,
    page: 1,
    limit: 500,
  });
  return page.products;
}

/** Active products by id (featured picks on public profiles). Preserves `ids` order. */
export async function getProductsByIds(
  ids: string[],
  currency: Currency = Currency.USD,
  role: UserRole = "USER",
  userId?: string | null,
): Promise<ProductCardData[]> {
  if (ids.length === 0) return [];

  const [products, sales, defaultDemoUrl, specialPrices] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids }, isActive: true, durations: { some: {} } },
      include: productInclude(currency),
    }),
    listActiveFlashSales(),
    getDefaultProductDemoUrl(),
    getSpecialPricesForUser(userId),
  ]);

  const byId = new Map(
    products.map((product) => [
      product.id,
      mapProductCard(
        product,
        sales,
        currency,
        role,
        defaultDemoUrl,
        specialPrices,
      ),
    ]),
  );

  const cards = ids
    .map((id) => byId.get(id))
    .filter((product): product is ProductCardData => Boolean(product));

  const durationIds = cards.flatMap((p) => p.durations.map((d) => d.id));
  const stockMap = await getEffectiveStockByDuration(durationIds);
  for (const card of cards) {
    for (const d of card.durations) {
      d.stock = stockMap.get(d.id) ?? d.stock;
    }
  }

  return cards;
}

export { getStartingPrice };
