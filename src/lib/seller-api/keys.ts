import { prisma } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/seller-api/auth";
import { generateApiKeySecret } from "@/lib/seller-api/crypto";
import {
  getApiMaxKeysPerUser,
  getApiDefaultRateLimitRpm,
  getApiPlatformEnabled,
  getApiAllowedRoles,
  getApiSandboxEnabled,
  getPlatformApiSettings,
  roleAllowed,
} from "@/lib/seller-api/settings";
import { listUserWebhooks } from "@/lib/seller-api/webhooks";
import { getWalletBalance } from "@/lib/wallet";
import type { SellerApiKeyMode, UserRole } from "@prisma/client";
import { logActivity } from "@/lib/activity-log";
import { notifyTelegram } from "@/lib/telegram-notify";

export type ApiKeyPublic = {
  id: string;
  name: string;
  keyPrefix: string;
  mode: SellerApiKeyMode;
  status: string;
  scopes: string[];
  ipAllowlist: string[];
  rateLimitRpm: number | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

function mapKey(k: {
  id: string;
  name: string;
  keyPrefix: string;
  mode: SellerApiKeyMode;
  status: string;
  scopes: string[];
  ipAllowlist: string[];
  rateLimitRpm: number | null;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}): ApiKeyPublic {
  return {
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    mode: k.mode,
    status: k.status,
    scopes: k.scopes,
    ipAllowlist: k.ipAllowlist,
    rateLimitRpm: k.rateLimitRpm,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  };
}

export async function assertUserCanManageApi(user: {
  role: UserRole | string;
  banned: boolean;
  apiEnabled: boolean | null;
}) {
  if (user.banned) return { ok: false as const, code: "BANNED", message: "Account banned." };
  if (user.apiEnabled === false) {
    return {
      ok: false as const,
      code: "USER_API_DISABLED",
      message: "API access disabled for this account.",
    };
  }
  if (!(await getApiPlatformEnabled())) {
    return {
      ok: false as const,
      code: "PLATFORM_DISABLED",
      message: "Platform API is disabled.",
    };
  }
  const allowed = await getApiAllowedRoles();
  if (!roleAllowed(user.role, allowed)) {
    return {
      ok: false as const,
      code: "ROLE_NOT_ALLOWED",
      message: "API access is exclusively available for Seller and Reseller accounts.",
    };
  }
  return { ok: true as const };
}

/** All ACTIVE keys for a user, newest first. */
export async function getUserActiveCredentials(
  userId: string,
): Promise<ApiKeyPublic[]> {
  const keys = await prisma.sellerApiKey.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  return keys.map(mapKey);
}

/** Server snapshot for `/app/development` + `GET /api/platform-api/overview`. */
export async function getPlatformApiHubSnapshot(user: {
  id: string;
  role: UserRole | string;
  banned: boolean;
  apiEnabled: boolean | null;
}) {
  const gate = await assertUserCanManageApi(user);
  const settings = await getPlatformApiSettings();
  const balance = await getWalletBalance(user.id);
  const credentials = gate.ok ? await getUserActiveCredentials(user.id) : [];
  const maxKeysPerUser = settings.maxKeysPerUser;
  const webhooks = gate.ok ? await listUserWebhooks(user.id) : [];
  const stats = gate.ok ? await getUserApiStats(user.id) : null;
  const effectiveRpm = settings.defaultRateLimitRpm;

  return {
    overview: {
      allowed: gate.ok,
      gateCode: gate.ok ? null : gate.code,
      gateMessage: gate.ok ? null : gate.message,
      platformEnabled: settings.platformEnabled,
      defaultRateLimitRpm: effectiveRpm,
      maxKeysPerUser,
      sandboxEnabled: settings.sandboxEnabled,
      walletBalanceMicrocents: balance,
      hasCredential: credentials.length > 0,
      activeKeys: credentials.length,
      role: user.role,
      stats,
    },
    credentials,
    webhooks,
  };
}

export async function listUserApiKeys(userId: string) {
  const keys = await prisma.sellerApiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return keys.map(mapKey);
}

async function insertApiKey(input: {
  userId: string;
  name: string;
  mode: SellerApiKeyMode;
  scopes: string[];
  ipAllowlist?: string[];
  rateLimitRpm?: number | null;
}) {
  if (input.mode === "SANDBOX" && !(await getApiSandboxEnabled())) {
    return {
      ok: false as const,
      code: "SANDBOX_DISABLED",
      message: "Sandbox keys are disabled.",
    };
  }

  const scopes = input.scopes.filter((s) =>
    (API_SCOPES as readonly string[]).includes(s),
  );
  if (scopes.length === 0) {
    return {
      ok: false as const,
      code: "INVALID_SCOPES",
      message: "Select at least one valid scope.",
    };
  }

  const owner = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { username: true, email: true },
  });

  const baseRpm = await getApiDefaultRateLimitRpm();
  const maxRpm = baseRpm;
  const rpm =
    input.rateLimitRpm != null && input.rateLimitRpm > 0
      ? Math.min(Math.round(input.rateLimitRpm), maxRpm)
      : null;

  const { secret, prefix, hash } = generateApiKeySecret(input.mode);
  const key = await prisma.sellerApiKey.create({
    data: {
      userId: input.userId,
      name: input.name.trim().slice(0, 80) || "API Key",
      keyPrefix: prefix,
      keyHash: hash,
      mode: input.mode,
      scopes,
      ipAllowlist: (input.ipAllowlist ?? [])
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20),
      rateLimitRpm: rpm,
    },
  });
  void notifyTelegram(
    "apiKey",
    [
      "🔑 API key created",
      `User: @${owner?.username ?? "?"} (${owner?.email ?? input.userId})`,
      `Name: ${key.name}`,
      `Mode: ${key.mode}`,
      `Prefix: ${key.keyPrefix}`,
      `ID: ${key.id}`,
    ].join("\n"),
  );

  logActivity({
    action: "API_KEY_CREATE",
    category: "API",
    message: `API key created (${key.name})`,
    userId: input.userId,
    username: owner?.username,
    email: owner?.email,
    metadata: {
      keyId: key.id,
      name: key.name,
      mode: key.mode,
      prefix: key.keyPrefix,
    },
  });

  return {
    ok: true as const,
    key: mapKey(key),
    secret,
  };
}

export async function createUserApiKey(input: {
  userId: string;
  name: string;
  mode: SellerApiKeyMode;
  scopes: string[];
  ipAllowlist?: string[];
  rateLimitRpm?: number | null;
}) {
  const activeCount = await prisma.sellerApiKey.count({
    where: { userId: input.userId, status: "ACTIVE" },
  });
  const maxKeys = await getApiMaxKeysPerUser();
  if (activeCount >= maxKeys) {
    return {
      ok: false as const,
      code: "KEY_LIMIT_REACHED",
      message: `You can have at most ${maxKeys} active API key${maxKeys === 1 ? "" : "s"}. Revoke one to create another.`,
    };
  }

  return insertApiKey(input);
}

export async function rotateUserApiKey(userId: string, keyId: string) {
  const existing = await prisma.sellerApiKey.findFirst({
    where: { id: keyId, userId, status: "ACTIVE" },
  });
  if (!existing) {
    return { ok: false as const, code: "NOT_FOUND", message: "Key not found." };
  }

  await prisma.sellerApiKey.update({
    where: { id: existing.id },
    data: { status: "REVOKED" },
  });

  const created = await insertApiKey({
    userId,
    name: existing.name,
    mode: existing.mode,
    scopes: existing.scopes,
    ipAllowlist: existing.ipAllowlist,
    rateLimitRpm: existing.rateLimitRpm,
  });

  if (!created.ok) {
    await prisma.sellerApiKey.update({
      where: { id: existing.id },
      data: { status: "ACTIVE" },
    });
    return created;
  }

  logActivity({
    action: "API_KEY_ROTATE",
    category: "API",
    message: `API key rotated (${existing.name})`,
    userId,
    metadata: {
      oldKeyId: existing.id,
      newKeyId: created.key.id,
      name: existing.name,
    },
  });

  return created;
}

export async function revokeUserApiKey(userId: string, keyId: string) {
  const existing = await prisma.sellerApiKey.findFirst({
    where: { id: keyId, userId },
  });
  if (!existing) {
    return { ok: false as const, code: "NOT_FOUND", message: "Key not found." };
  }
  if (existing.status === "REVOKED") {
    return { ok: true as const };
  }
  await prisma.sellerApiKey.update({
    where: { id: existing.id },
    data: { status: "REVOKED" },
  });
  return { ok: true as const };
}

/** One-time ops helper: keep newest ACTIVE per user, revoke older ACTIVE. */
export async function enforceSingleActiveKeyPerUser() {
  const active = await prisma.sellerApiKey.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true, createdAt: true },
  });
  const seen = new Set<string>();
  const revokeIds: string[] = [];
  for (const row of active) {
    if (seen.has(row.userId)) {
      revokeIds.push(row.id);
    } else {
      seen.add(row.userId);
    }
  }
  if (revokeIds.length === 0) return { revoked: 0 };
  await prisma.sellerApiKey.updateMany({
    where: { id: { in: revokeIds } },
    data: { status: "REVOKED" },
  });
  return { revoked: revokeIds.length };
}

export async function listUserApiUsage(input: {
  userId: string;
  page?: number;
  limit?: number;
  filter?: "all" | "ok" | "error" | "purchases";
}) {
  const page = Math.max(1, Math.floor(input.page ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Math.floor(input.limit ?? 20) || 20));
  const skip = (page - 1) * limit;
  const filter = input.filter ?? "all";

  const where: {
    userId: string;
    statusCode?: { lt?: number; gte?: number };
    AND?: Array<Record<string, unknown>>;
  } = { userId: input.userId };

  if (filter === "ok") where.statusCode = { lt: 400 };
  else if (filter === "error") where.statusCode = { gte: 400 };
  else if (filter === "purchases") {
    where.AND = [
      { method: "POST" },
      {
        OR: [
          { path: { contains: "/orders" } },
          { path: { endsWith: "/orders" } },
        ],
      },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.sellerApiUsage.count({ where }),
    prisma.sellerApiUsage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { apiKey: { select: { keyPrefix: true, name: true } } },
    }),
  ]);
  return {
    page,
    limit,
    total,
    hasMore: skip + rows.length < total,
    filter,
    items: rows.map((r) => ({
      id: r.id,
      requestId: r.requestId,
      method: r.method,
      path: r.path,
      statusCode: r.statusCode,
      durationMs: r.durationMs,
      errorCode: r.errorCode,
      keyPrefix: r.apiKey.keyPrefix,
      keyName: r.apiKey.name,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getUserApiStats(userId: string) {
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [
    requests24h,
    requests7d,
    errors24h,
    rateLimited24h,
    purchases24h,
    purchasesAll,
    spendAggAll,
    avgDuration,
  ] = await Promise.all([
    prisma.sellerApiUsage.count({
      where: { userId, createdAt: { gte: since24h } },
    }),
    prisma.sellerApiUsage.count({
      where: { userId, createdAt: { gte: since7d } },
    }),
    prisma.sellerApiUsage.count({
      where: {
        userId,
        createdAt: { gte: since24h },
        statusCode: { gte: 400 },
      },
    }),
    prisma.sellerApiUsage.count({
      where: {
        userId,
        createdAt: { gte: since24h },
        statusCode: 429,
      },
    }),
    prisma.transaction.count({
      where: {
        userId,
        type: "PURCHASE",
        status: "COMPLETED",
        note: "Platform API purchase",
        createdAt: { gte: since24h },
      },
    }),
    prisma.transaction.count({
      where: {
        userId,
        type: "PURCHASE",
        status: "COMPLETED",
        note: "Platform API purchase",
      },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "PURCHASE",
        status: "COMPLETED",
        note: "Platform API purchase",
      },
      _sum: { amount: true },
    }),
    prisma.sellerApiUsage.aggregate({
      where: { userId, createdAt: { gte: since24h } },
      _avg: { durationMs: true },
    }),
  ]);

  const success24h = Math.max(0, requests24h - errors24h);
  const successRate24h =
    requests24h === 0
      ? 100
      : Math.round((success24h / requests24h) * 1000) / 10;

  return {
    requests24h,
    requests7d,
    errors24h,
    rateLimited24h,
    successRate24h,
    avgDurationMs24h: Math.round(avgDuration._avg.durationMs ?? 0),
    purchases24h,
    purchasesAll,
    spendAllMicrocents: Math.abs(spendAggAll._sum.amount ?? 0),
  };
}

const API_PURCHASE_NOTE = "Platform API purchase";

export async function listUserApiPurchases(input: {
  userId: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Math.floor(input.page ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Math.floor(input.limit ?? 20) || 20));
  const skip = (page - 1) * limit;

  const noteTxs = await prisma.transaction.findMany({
    where: {
      userId: input.userId,
      type: "PURCHASE",
      status: "COMPLETED",
      note: API_PURCHASE_NOTE,
    },
    select: { reference: true },
  });

  const orderIdSet = new Set<string>();
  for (const t of noteTxs) {
    if (t.reference) orderIdSet.add(t.reference);
  }

  const orderIds = [...orderIdSet];
  const total = orderIds.length;

  if (total === 0) {
    return { page, limit, total: 0, hasMore: false, items: [] };
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, userId: input.userId },
    include: {
      items: {
        select: {
          productTitle: true,
          durationLabel: true,
          unitPrice: true,
          duration: { select: { number: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  const pageOrderIds = orders.map((o) => o.id);
  const purchaseTxs = await prisma.transaction.findMany({
    where: {
      userId: input.userId,
      type: "PURCHASE",
      status: "COMPLETED",
      reference: { in: pageOrderIds },
    },
    select: { reference: true, amount: true },
  });

  const subtotalByOrder = new Map(
    purchaseTxs.map((t) => [t.reference!, Math.abs(t.amount)]),
  );

  return {
    page,
    limit,
    total,
    hasMore: skip + orders.length < total,
    items: orders.map((order) => {
      const products = order.items;
      const first = products[0];
      const qty = products.length;
      const subtotal = subtotalByOrder.get(order.id) ?? order.total;
      return {
        id: order.id,
        orderId: order.id,
        status: order.status,
        productTitle: first?.productTitle ?? "Product",
        durationLabel: first?.durationLabel ?? null,
        durationSku: first?.duration?.number ?? null,
        quantity: qty,
        uniqueProducts: new Set(products.map((p) => p.productTitle)).size,
        subtotalMicrocents: subtotal,
        totalMicrocents: subtotal,
        createdAt: order.createdAt.toISOString(),
        items: products.map((p) => ({
          productTitle: p.productTitle,
          durationLabel: p.durationLabel,
          durationSku: p.duration?.number ?? null,
          unitPriceMicrocents: p.unitPrice,
        })),
      };
    }),
  };
}
