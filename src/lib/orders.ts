import {
  claimKey,
  countAvailableKeysByDuration,
  releaseKeysForOrder,
} from "@/lib/keys";
import {
  applyFlashPercent,
  listActiveFlashSales,
  pickFlashSale,
} from "@/lib/flash-sales";
import {
  calcDiscount,
  lineMatchesPromoScope,
  lookupPromoDetailed,
} from "@/lib/promos";
import { prisma } from "@/lib/prisma";
import { formatMoney, type Currency } from "@/lib/currencies";
import { creditReferralReward } from "@/lib/referral-rewards";
import { debitWalletForPurchase } from "@/lib/wallet";
import { getSpecialPricesForUser, resolveUnitPrice } from "@/lib/pricing";
import { logActivity } from "@/lib/activity-log";
import {
  formatTelegramPurchaseLines,
  notifyTelegram,
} from "@/lib/telegram-notify";
import { notifyUser } from "@/lib/notifications";
import {
  OrderStatus,
  type Prisma,
  type UserRole,
} from "@prisma/client";
import type {
  AdminOrderAudience,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderStatusFilter,
} from "@/types/admin-orders";
import { randomBytes } from "crypto";

export type {
  AdminOrderAudience,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderStatusFilter,
} from "@/types/admin-orders";

const ORDER_STATUSES = new Set<string>(Object.values(OrderStatus));

export function parseAdminOrderAudience(
  raw: string | null | undefined,
): AdminOrderAudience {
  switch (raw) {
    case "users":
    case "resellers":
    case "admins":
    case "guests":
      return raw;
    default:
      return "all";
  }
}

export function parseAdminOrderStatus(
  raw: string | null | undefined,
): AdminOrderStatusFilter {
  if (!raw || raw === "all") return "all";
  if (ORDER_STATUSES.has(raw)) return raw as OrderStatus;
  return "all";
}

function buildAdminOrderWhere(opts: {
  q?: string;
  status?: AdminOrderStatusFilter;
  audience?: AdminOrderAudience;
}): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (opts.status && opts.status !== "all") {
    where.status = opts.status;
  }

  if (opts.audience === "users") {
    where.user = { role: "USER" };
  } else if (opts.audience === "resellers") {
    where.user = { role: { in: ["SELLER", "RESELLER"] } };
  } else if (opts.audience === "admins") {
    where.user = { role: "ADMIN" };
  } else if (opts.audience === "guests") {
    where.userId = null;
  }

  const q = opts.q?.trim();
  if (q) {
    where.OR = [
      { id: q },
      { buyerEmail: { contains: q } },
      { buyerDiscord: { contains: q } },
      { user: { username: { contains: q } } },
      { user: { email: { contains: q } } },
      { user: { name: { contains: q } } },
      { items: { some: { productTitle: { contains: q } } } },
      { items: { some: { durationLabel: { contains: q } } } },
    ];
  }

  return where;
}

function productSummary(
  items: { productTitle: string; durationLabel: string }[],
) {
  if (!items.length) return "Empty order";
  const first = items[0];
  const base = `${first.productTitle} · ${first.durationLabel}`;
  if (items.length === 1) return base;
  return `${base} +${items.length - 1} more`;
}

export async function listAdminOrders(opts: {
  page?: number;
  limit?: number;
  q?: string;
  status?: AdminOrderStatusFilter;
  audience?: AdminOrderAudience;
}) {
  const page = Math.max(1, Math.floor(opts.page ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Math.floor(opts.limit ?? 15) || 15));
  const skip = (page - 1) * limit;
  const where = buildAdminOrderWhere(opts);

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
          },
        },
        items: {
          select: {
            productTitle: true,
            durationLabel: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  ]);

  const orders: AdminOrderListItem[] = rows.map((o) => ({
    id: o.id,
    buyerEmail: o.buyerEmail,
    buyerDiscord: o.buyerDiscord,
    status: o.status,
    total: o.total,
    currency: o.currency,
    itemCount: o.items.length,
    productSummary: productSummary(o.items),
    createdAt: o.createdAt.toISOString(),
    user: o.user
      ? {
          id: o.user.id,
          name: o.user.name,
          username: o.user.username,
          email: o.user.email,
          role: o.user.role,
        }
      : null,
  }));

  return {
    orders,
    page,
    limit,
    total,
    hasMore: skip + rows.length < total,
  };
}

export async function getAdminOrder(
  id: string,
): Promise<AdminOrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
        },
      },
      promoCode: { select: { id: true, code: true } },
      flashSale: { select: { id: true, title: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          key: { select: { id: true, code: true, status: true } },
        },
      },
    },
  });

  if (!order) return null;

  return {
    id: order.id,
    buyerEmail: order.buyerEmail,
    buyerDiscord: order.buyerDiscord,
    status: order.status,
    total: order.total,
    currency: order.currency,
    itemCount: order.items.length,
    productSummary: productSummary(order.items),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    accessToken: order.accessToken,
    promoCode: order.promoCode,
    flashSale: order.flashSale,
    user: order.user
      ? {
          id: order.user.id,
          name: order.user.name,
          username: order.user.username,
          email: order.user.email,
          role: order.user.role,
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productTitle: item.productTitle,
      durationLabel: item.durationLabel,
      unitPrice: item.unitPrice,
      androidId: item.androidId,
      key: item.key
        ? {
            id: item.key.id,
            code: item.key.code,
            status: item.key.status,
          }
        : null,
    })),
  };
}

export type CheckoutLineInput = {
  durationId: string;
  quantity: number;
  androidId?: string | null;
};

export type CreateOrderInput = {
  userId: string;
  buyerEmail: string;
  buyerDiscord?: string;
  currency: Currency;
  items: CheckoutLineInput[];
  role?: UserRole;
  promoCode?: string;
};

function makeAccessToken() {
  return randomBytes(24).toString("hex");
}

export async function createAndFulfillOrder(input: CreateOrderInput) {
  const accessToken = makeAccessToken();
  const role = input.role ?? "USER";

  const durationIds = input.items.map((i) => i.durationId);
  const durations = await prisma.duration.findMany({
    where: { id: { in: durationIds } },
    include: {
      product: true,
      prices: {
        where: { currency: input.currency },
        select: { price: true, resellerPrice: true },
      },
    },
  });

  const byId = new Map(durations.map((d) => [d.id, d]));
  const [flashSales, specialPrices] = await Promise.all([
    listActiveFlashSales(),
    getSpecialPricesForUser(input.userId, durationIds),
  ]);

  type PlannedLine = {
    durationId: string;
    productId: string;
    productTitle: string;
    durationLabel: string;
    unitPrice: number;
    flashSaleId: string | null;
    isSpecialPrice: boolean;
    androidId: string | null;
  };

  const planned: PlannedLine[] = [];

  for (const line of input.items) {
    const duration = byId.get(line.durationId);
    if (!duration) {
      return { ok: false as const, code: "INVALID_DURATION", message: "Invalid duration in cart." };
    }
    if (duration.product.isMaintenance) {
      return {
        ok: false as const,
        code: "PRODUCT_MAINTENANCE",
        message: `Product "${duration.product.title}" is currently under maintenance.`,
      };
    }
    const priceRow = duration.prices[0];
    if (!priceRow) {
      return {
        ok: false as const,
        code: "PRICE_MISSING",
        message: `No price for this product in ${input.currency}.`,
      };
    }
    if (line.quantity < 1) {
      return { ok: false as const, code: "INVALID_QTY", message: "Quantity must be at least 1." };
    }

    const special = specialPrices.get(duration.id);
    const isSpecialPrice = special != null;
    const listPrice = resolveUnitPrice({
      role,
      priceRow,
      specialPrice: special,
    });
    // Special prices are exact — no flash sale.
    const flash = isSpecialPrice
      ? null
      : pickFlashSale(flashSales, {
          role,
          productId: duration.productId,
          durationId: duration.id,
        });
    const unitPrice = flash
      ? applyFlashPercent(listPrice, flash.discountPercent)
      : listPrice;

    for (let i = 0; i < line.quantity; i++) {
      const labelPart = duration.label;
      planned.push({
        durationId: duration.id,
        productId: duration.productId,
        productTitle: duration.product.title,
        durationLabel: labelPart,
        unitPrice,
        flashSaleId: flash?.id ?? null,
        isSpecialPrice,
        androidId: line.androidId ?? null,
      });
    }
  }

  let promoCodeId: string | null = null;
  let promoDiscount = 0;

  if (input.promoCode?.trim()) {
    // Promo cannot apply to special-priced durations.
    const cartItems = input.items
      .filter((line) => !specialPrices.has(line.durationId))
      .map((line) => {
        const duration = byId.get(line.durationId)!;
        return {
          productId: duration.productId,
          durationId: duration.id,
          quantity: line.quantity,
        };
      });

    if (cartItems.length === 0) {
      return {
        ok: false as const,
        code: "SCOPE",
        message: "Promo codes do not apply to special-priced items.",
      };
    }

    const promoResult = await lookupPromoDetailed(input.promoCode, {
      role,
      userId: input.userId,
      items: cartItems,
    });

    if (!promoResult.ok) {
      return {
        ok: false as const,
        code: promoResult.code,
        message: promoResult.message,
      };
    }

    const promo = promoResult.promo;
    const eligibleIdx: number[] = [];
    let remaining = promo.maxUnits;
    let eligibleSubtotal = 0;

    for (let i = 0; i < planned.length && remaining > 0; i++) {
      if (planned[i].isSpecialPrice) continue;
      if (!lineMatchesPromoScope(planned[i], promo)) continue;
      eligibleIdx.push(i);
      eligibleSubtotal += planned[i].unitPrice;
      remaining -= 1;
    }

    if (eligibleIdx.length === 0) {
      return {
        ok: false as const,
        code: "SCOPE",
        message: "This promo does not apply to items in your cart.",
      };
    }

    promoDiscount = calcDiscount(eligibleSubtotal, {
      percentOff: promo.percentOff,
      amountOff: promo.amountOff,
    });

    let left = promoDiscount;
    for (const i of eligibleIdx) {
      if (left <= 0) break;
      const cut = Math.min(planned[i].unitPrice, left);
      planned[i].unitPrice -= cut;
      left -= cut;
    }

    promoCodeId = promo.promoCodeId;
  }

  const total = Math.round(
    planned.reduce((sum, row) => sum + row.unitPrice, 0),
  );

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    return { ok: false as const, code: "UNAUTHORIZED", message: "User not found." };
  }
  if (user.banned) {
    return { ok: false as const, code: "BANNED", message: "Account is banned." };
  }
  if (user.walletBalance < total) {
    return {
      ok: false as const,
      code: "INSUFFICIENT_BALANCE",
      message: "Deposit wallet balance to checkout.",
    };
  }

  const flashSaleId = planned.find((p) => p.flashSaleId)?.flashSaleId ?? null;

  // Fail fast when qty exceeds available stock.
  const neededByDuration = new Map<string, number>();
  for (const line of planned) {
    neededByDuration.set(
      line.durationId,
      (neededByDuration.get(line.durationId) ?? 0) + 1,
    );
  }
  const stockByDuration = await countAvailableKeysByDuration([
    ...neededByDuration.keys(),
  ]);
  for (const [durationId, needed] of neededByDuration) {
    if ((stockByDuration.get(durationId) ?? 0) < needed) {
      return {
        ok: false as const,
        code: "STOCK_UNAVAILABLE",
        message: "One or more items are out of stock. Cart was not charged.",
      };
    }
  }

  const order = await prisma.order.create({
    data: {
      userId: input.userId,
      buyerEmail: input.buyerEmail,
      buyerDiscord: input.buyerDiscord || null,
      status: OrderStatus.PENDING,
      total,
      currency: input.currency,
      accessToken,
      promoCodeId,
      flashSaleId,
    },
  });

  try {
    for (const line of planned) {
      const key = await claimKey(line.durationId, order.id);
      if (!key) {
        throw new Error("STOCK_UNAVAILABLE");
      }
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          durationId: line.durationId,
          keyId: key.id,
          productTitle: line.productTitle,
          durationLabel: line.durationLabel,
          unitPrice: line.unitPrice,
          androidId: line.androidId ?? undefined,
        },
      });
    }

    await debitWalletForPurchase({
      userId: input.userId,
      amount: total,
      orderId: order.id,
    });

    if (promoCodeId) {
      await prisma.promoRedemption.create({
        data: {
          promoCodeId,
          userId: input.userId,
          orderId: order.id,
          discount: promoDiscount,
        },
      });
    }

    const fulfilled = await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.FULFILLED },
      include: {
        items: {
          include: { key: true },
        },
      },
    });

    await creditReferralReward({
      buyerId: input.userId,
      orderId: fulfilled.id,
      orderTotal: total,
    });

    const purchaseLines = formatTelegramPurchaseLines(fulfilled.items);
    void notifyTelegram(
      "purchase",
      [
        "🛒 Purchase fulfilled",
        `Order: ${fulfilled.id}`,
        `Buyer: ${input.buyerEmail}`,
        `Total: ${formatMoney(total)}`,
        `Items (${fulfilled.items.length}):`,
        ...purchaseLines,
        `User: ${input.userId}`,
      ].join("\n"),
    );

    const productSummary = purchaseLines
      .map((line) => line.replace(/^•\s*/, ""))
      .join("; ");

    const itemsSummary = fulfilled.items
      .map((it) => `${it.productTitle} (${it.durationLabel})`)
      .slice(0, 3)
      .join(", ");
    const extraCount = fulfilled.items.length > 3 ? ` +${fulfilled.items.length - 3} more` : "";

    void notifyUser({
      userId: input.userId,
      type: "order_fulfilled",
      title: "Purchase complete, keys delivered",
      message: `Your key for ${itemsSummary}${extraCount} is ready in your vault.`,
      actionUrl: `/app/order/${fulfilled.id}`,
    }).catch((err) => {
      console.warn("[orders] Failed to send user notification:", err);
    });

    // Check if any purchased item's duration is now out of stock (manual local stock only; skip supplier-linked items)
    void (async () => {
      try {
        const isObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
        const uniqueDurationIds = Array.from(
          new Set(
            fulfilled.items
              .map((it) => it.durationId)
              .filter((id): id is string => typeof id === "string" && isObjectId(id)),
          ),
        );
        if (uniqueDurationIds.length === 0) return;

        const checkedDurationIds = new Set<string>();
        for (const it of fulfilled.items) {
          if (!it.durationId || !isObjectId(it.durationId)) continue;
          if (checkedDurationIds.has(it.durationId)) continue;
          checkedDurationIds.add(it.durationId);

          const remaining = await prisma.key.count({
            where: { durationId: it.durationId, status: "AVAILABLE" },
          });
          if (remaining === 0) {
            void notifyTelegram(
              "adminUpdate",
              [
                "⚠️ OUT OF STOCK ALERT",
                `Product: ${it.productTitle}`,
                `Duration: ${it.durationLabel}`,
                "Remaining Available Stock: 0 keys",
                "Action: Please restock keys in Admin Panel.",
              ].join("\n"),
            );
          }
        }
      } catch {
        // ignore out-of-stock notification failure
      }
    })();

    logActivity({
      action: "PURCHASE",
      category: "ORDER",
      message: `Purchase ${formatMoney(total)} — ${productSummary || `${fulfilled.items.length} item${fulfilled.items.length === 1 ? "" : "s"}`}`,
      userId: input.userId,
      email: input.buyerEmail,
      metadata: {
        orderId: fulfilled.id,
        total,
        items: fulfilled.items.length,
        products: fulfilled.items.map((it) => ({
          productTitle: it.productTitle,
          durationLabel: it.durationLabel,
          unitPrice: it.unitPrice,
        })),
      },
    });

    return {
      ok: true as const,
      orderId: fulfilled.id,
      accessToken: fulfilled.accessToken,
      order: fulfilled,
    };
  } catch (err) {
    const code =
      err instanceof Error && err.message === "INSUFFICIENT_BALANCE"
        ? "INSUFFICIENT_BALANCE"
        : "STOCK_UNAVAILABLE";
    // Return claimed keys to AVAILABLE — matches Platform API rollback.
    await releaseKeysForOrder(order.id).catch(() => undefined);
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } }).catch(
      () => undefined,
    );
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.FAILED },
    });
    return {
      ok: false as const,
      code,
      message:
        code === "INSUFFICIENT_BALANCE"
          ? "Deposit wallet balance to checkout."
          : "One or more items are out of stock. Cart was not charged.",
    };
  }
}

/** Order page lookup: the share link (token) or the signed-in owner (no token needed). */
export async function getOrderForViewer(orderId: string, token: string | undefined, userId: string | undefined) {
  if (!token && !userId) return null;
  return prisma.order.findFirst({
    where: token ? { id: orderId, accessToken: token } : { id: orderId, userId },
    include: {
      items: {
        include: {
          key: true,
          duration: { select: { productId: true, deviceIdName: true, product: { select: { imageUrl: true } } } },
        },
      },
      promoCode: { select: { code: true } },
    },
  });
}

export async function getOrderByAccessToken(orderId: string, token: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, accessToken: token },
    include: {
      items: {
        include: { key: true },
      },
      promoCode: { select: { code: true } },
    },
  });
  return order;
}

export async function getUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId, status: OrderStatus.FULFILLED },
    include: {
      items: {
        include: { key: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type UserKeyRow = {
  id: string;
  productTitle: string;
  durationLabel: string;
  code: string | null;
  unitPrice: number;
  currency: Currency;
  createdAt: string;
  androidId?: string | null;
  orderId: string;
  productImage: string | null;
};

export type UserKeysPage = {
  keys: UserKeyRow[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

const DEFAULT_KEYS_PAGE_SIZE = 25;

/** Paginated purchased keys (OrderItems on FULFILLED orders) — newest first. */
export async function getUserKeysPage(
  userId: string,
  options?: { page?: number; limit?: number; q?: string },
): Promise<UserKeysPage> {
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(
    100,
    Math.max(1, options?.limit ?? DEFAULT_KEYS_PAGE_SIZE),
  );
  const q = options?.q?.trim();

  const where = {
    order: { userId, status: OrderStatus.FULFILLED },
    ...(q
      ? {
          OR: [
            { productTitle: { contains: q } },
            { durationLabel: { contains: q } },
            { key: { code: { contains: q } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.orderItem.count({ where }),
    prisma.orderItem.findMany({
      where,
      include: {
        key: { select: { code: true } },
        order: { select: { currency: true, createdAt: true } },
        duration: { select: { product: { select: { imageUrl: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    keys: items.map((item) => ({
      id: item.id,
      productTitle: item.productTitle,
      durationLabel: item.durationLabel,
      code: item.key?.code ?? null,
      unitPrice: item.unitPrice,
      currency: item.order.currency as Currency,
      createdAt: item.order.createdAt.toISOString(),
      androidId: item.androidId,
      orderId: item.orderId,
      productImage: item.duration?.product?.imageUrl ?? null,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}

/** Store-wide order counts per status plus revenue (PAID + FULFILLED) and today's orders. */
export async function getAdminOrderStats() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const [groups, revenue, today] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.aggregate({
      where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
  ]);
  const counts: Record<string, number> = {};
  let all = 0;
  for (const g of groups) {
    counts[g.status] = g._count._all;
    all += g._count._all;
  }
  return { counts, all, revenue: revenue._sum.total ?? 0, today };
}
