import { claimKey, countAvailableKeysByDuration, releaseKey } from "@/lib/keys";
import { prisma } from "@/lib/prisma";
import { getSpecialPricesForUser, resolveUnitPrice } from "@/lib/pricing";
import { creditReferralReward } from "@/lib/referral-rewards";
import { resolveDurationForApi } from "@/lib/seller-api/catalog";
import { dispatchOrderFulfilledWebhooks } from "@/lib/seller-api/webhooks";
import {
  debitWalletForPurchase,
} from "@/lib/wallet";
import { OrderStatus, type UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { formatMoney, microcentsToUsdString } from "@/lib/currencies";
import { notifyTelegram } from "@/lib/telegram-notify";

function makeAccessToken() {
  return randomBytes(24).toString("hex");
}

function buildOrderDetail(input: {
  id: string;
  status: string;
  sku: number | null;
  quantity: number;
  price: number;
  total: number;
  currency: string;
  createdAt?: string;
  accessToken?: string;
  items: {
    name: string;
    key: string;
    price: number;
  }[];
}) {
  const keys = input.items.map((it) => it.key).filter(Boolean);
  return {
    id: input.id,
    status: input.status,
    sku: input.sku,
    quantity: input.quantity,
    price: input.price,
    priceUsd: microcentsToUsdString(input.price),
    total: input.total,
    totalUsd: microcentsToUsdString(input.total),
    currency: input.currency,
    keys,
    items: input.items.map((it) => ({
      name: it.name,
      key: it.key,
      price: it.price,
      priceUsd: microcentsToUsdString(it.price),
    })),
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    ...(input.accessToken ? { accessToken: input.accessToken } : {}),
    // Soft-compat aliases for older clients
    durationSku: input.sku,
    subtotalMicrocents: input.price,
    totalMicrocents: input.total,
  };
}

export async function createAndFulfillApiOrder(input: {
  userId: string;
  buyerEmail: string;
  role: UserRole;
  /** SKU number (duration). Body may send `sku` or legacy `duration`. */
  duration: string;
  quantity: number;
  sandbox?: boolean;
}) {
  const qty = Math.floor(input.quantity);
  if (!Number.isFinite(qty) || qty < 1 || qty > 50) {
    return {
      ok: false as const,
      code: "INVALID_QTY",
      message: "Quantity must be between 1 and 50.",
    };
  }

  const resolved = await resolveDurationForApi(input.duration);
  if (!resolved.ok) {
    return {
      ok: false as const,
      code: resolved.code,
      message: resolved.message,
    };
  }
  const duration = resolved.duration;
  if (!duration.product.isActive) {
    return {
      ok: false as const,
      code: "UNKNOWN_DURATION",
      message:
        "Unknown SKU. Call GET /api/v1/products and use items[].sku.",
    };
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
      message: "No USD price for this SKU.",
    };
  }

  const specialPrices = await getSpecialPricesForUser(input.userId, [
    duration.id,
  ]);
  // Price always from server + role — never trust client.
  const unitPrice = resolveUnitPrice({
    role: input.role,
    priceRow,
    specialPrice: specialPrices.get(duration.id),
  });
  const subtotal = Math.round(unitPrice * qty);
  const labelPart = duration.label;
  const displayName = `${duration.product.title} — ${labelPart}`;

  if (input.sandbox) {
    const sandboxItems = Array.from({ length: qty }, () => {
      const randHex = randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
      return {
        name: displayName,
        key: `TEST-${randHex}`,
        price: unitPrice,
      };
    });
    return {
      ok: true as const,
      sandbox: true as const,
      order: buildOrderDetail({
        id: `sandbox_${randomBytes(8).toString("hex")}`,
        status: "FULFILLED",
        sku: duration.number,
        quantity: qty,
        price: subtotal,
        total: subtotal,
        currency: "USD",
        items: sandboxItems,
      }),
    };
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    return { ok: false as const, code: "UNAUTHORIZED", message: "User not found." };
  }
  if (user.banned) {
    return { ok: false as const, code: "BANNED", message: "Account is banned." };
  }
  if (user.walletBalance < subtotal) {
    return {
      ok: false as const,
      code: "INSUFFICIENT_BALANCE",
      message: "Insufficient wallet balance.",
    };
  }

  const stockMap = await countAvailableKeysByDuration([duration.id]);
  if ((stockMap.get(duration.id) ?? 0) < qty) {
    return {
      ok: false as const,
      code: "STOCK_UNAVAILABLE",
      message: "Not enough stock for this SKU.",
    };
  }

  const accessToken = makeAccessToken();
  const order = await prisma.order.create({
    data: {
      userId: input.userId,
      buyerEmail: input.buyerEmail,
      status: OrderStatus.PENDING,
      total: subtotal,
      currency: "USD",
      accessToken,
    },
  });

  const claimedKeyIds: string[] = [];

  try {
    for (let i = 0; i < qty; i++) {
      const key = await claimKey(duration.id, order.id);
      if (!key) throw new Error("STOCK_UNAVAILABLE");
      claimedKeyIds.push(key.id);
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          durationId: duration.id,
          keyId: key.id,
          productTitle: duration.product.title,
          durationLabel: labelPart,
          unitPrice,
        },
      });
    }

    await debitWalletForPurchase({
      userId: input.userId,
      amount: subtotal,
      orderId: order.id,
      note: "Platform API purchase",
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.FULFILLED },
    });

    await creditReferralReward({
      buyerId: input.userId,
      orderId: order.id,
      orderTotal: subtotal,
    }).catch(() => undefined);

    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      include: { key: { select: { code: true } } },
      orderBy: { createdAt: "asc" },
    });

    const payload = buildOrderDetail({
      id: order.id,
      status: "FULFILLED",
      sku: duration.number,
      quantity: qty,
      price: subtotal,
      total: subtotal,
      currency: "USD",
      accessToken,
      items: items.map((it) => ({
        name: `${it.productTitle} — ${it.durationLabel}`,
        key: it.key?.code ?? "",
        price: it.unitPrice,
      })),
    });

    void dispatchOrderFulfilledWebhooks(input.userId, payload).catch(
      () => undefined,
    );

    void notifyTelegram(
      "apiKeyTf",
      [
        "🔌 API purchase fulfilled",
        `Order: ${order.id}`,
        `User: @${user.username} (${user.email})`,
        `Product: ${displayName}`,
        `SKU: ${duration.number}`,
        `Qty: ${qty}`,
        `Unit: ${formatMoney(unitPrice)}`,
        `Subtotal: ${formatMoney(subtotal)}`,
        `Total: ${formatMoney(subtotal)}`,
      ].join("\n"),
    );

    return { ok: true as const, sandbox: false as const, order: payload };
  } catch (e) {
    for (const keyId of claimedKeyIds) {
      await releaseKey(keyId).catch(() => undefined);
    }
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } }).catch(
      () => undefined,
    );
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.FAILED },
    });

    if (e instanceof Error && e.message === "STOCK_UNAVAILABLE") {
      return {
        ok: false as const,
        code: "BUSY",
        message: "Busy — this SKU is out of stock. Retry later.",
      };
    }
    if (e instanceof Error && e.message === "INSUFFICIENT_BALANCE") {
      return {
        ok: false as const,
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient wallet balance.",
      };
    }
    throw e;
  }
}

export async function getApiOrderForUser(userId: string, orderId: string) {
  if (!orderId || !/^[a-f\d]{24}$/i.test(orderId.trim())) return null;
  const order = await prisma.order.findFirst({
    where: { id: orderId.trim(), userId },
    include: {
      items: {
        include: { key: { select: { code: true } }, duration: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!order) return null;

  const sku =
    order.items[0]?.duration.number ?? null;

  return buildOrderDetail({
    id: order.id,
    status: order.status,
    sku,
    quantity: order.items.length,
    price: order.total,
    total: order.total,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((it) => ({
      name: `${it.productTitle} — ${it.durationLabel}`,
      key: it.key?.code ?? "",
      price: it.unitPrice,
    })),
  });
}

/** Paginated order history — list never includes key codes (secure). */
export async function listApiOrdersForUser(
  userId: string,
  page = 1,
  limit = 20,
) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
      include: {
        items: {
          include: { duration: { select: { number: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  ]);

  const items = orders.map((order) => {
    const sku =
      order.items[0]?.duration.number ?? null;
    const name = order.items[0]
      ? `${order.items[0].productTitle} — ${order.items[0].durationLabel}`
      : "Order";
    const total = order.total;
    return {
      id: order.id,
      status: order.status,
      sku,
      name,
      quantity: order.items.length,
      total,
      totalUsd: microcentsToUsdString(total),
      keysCount: order.items.length,
      createdAt: order.createdAt.toISOString(),
    };
  });

  return {
    page: safePage,
    limit: safeLimit,
    total,
    hasMore: skip + orders.length < total,
    items,
  };
}

export async function getIdempotentResponse(userId: string, key: string) {
  const row = await prisma.sellerApiIdempotency.findUnique({
    where: { userId_key: { userId, key } },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.sellerApiIdempotency.delete({ where: { id: row.id } }).catch(
      () => undefined,
    );
    return null;
  }
  return {
    statusCode: row.statusCode,
    body: JSON.parse(row.responseJson) as unknown,
  };
}

export async function saveIdempotentResponse(input: {
  userId: string;
  key: string;
  statusCode: number;
  body: unknown;
}) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.sellerApiIdempotency.upsert({
    where: { userId_key: { userId: input.userId, key: input.key } },
    create: {
      userId: input.userId,
      key: input.key,
      statusCode: input.statusCode,
      responseJson: JSON.stringify(input.body),
      expiresAt,
    },
    update: {
      statusCode: input.statusCode,
      responseJson: JSON.stringify(input.body),
      expiresAt,
    },
  });
}
