import {
  dateKeysBetween,
  daysAgoStart,
  todayStart,
} from "@/lib/admin-stats";
import { prisma } from "@/lib/prisma";
import { getSpecialStockDeveloperShareRate } from "@/lib/settings";
import {
  DeveloperSettlementStatus,
  KeyStatus,
  OrderStatus,
} from "@prisma/client";

const PAID_ORDER_STATUSES = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;
const LOOKBACK_DAYS = 89;
const DEFAULT_SETTLEMENT_PAGE_SIZE = 8;

export type SpecialStockSettlementRow = {
  dateKey: string;
  sales: number;
  keysSold: number;
  orders: number;
  cost: number;
  grossProfit: number;
  developerShare: number; // 50%
  ownerShare: number;     // 50%
  status: "PENDING" | "PAID";
  paidAt: string | null;
};

export type SpecialStockSettlementsPayload = {
  shareRate: number;
  pendingDays: number;
  pendingShare: number;
  paidDays: number;
  paidShare: number;
  totalRows: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rows: SpecialStockSettlementRow[];
};

export type SpecialInventorySummary = {
  totalKeys: number;
  availableKeys: number;
  soldKeys: number;
  totalRealizedRevenue: number;
  potentialRevenue: number;
  productGroups: {
    productId: string;
    productTitle: string;
    durationId: string;
    durationLabel: string;
    total: number;
    available: number;
    sold: number;
    realizedRevenue: number;
    potentialRevenue: number;
  }[];
};

export type SpecialInventoryKeyItem = {
  id: string;
  code: string;
  status: KeyStatus;
  productTitle: string;
  durationLabel: string;
  durationId: string;
  createdAt: string;
  soldAt: string | null;
  orderId: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  salePrice: number | null;
};

export type SpecialInventoryListPayload = {
  summary: SpecialInventorySummary;
  keys: SpecialInventoryKeyItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export async function getSpecialInventoryData(opts?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: "all" | "AVAILABLE" | "SOLD";
  productId?: string;
}): Promise<SpecialInventoryListPayload> {
  const page = Math.max(1, Math.floor(opts?.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(opts?.limit ?? 30) || 30));
  const skip = (page - 1) * limit;
  const q = (opts?.q ?? "").trim().toLowerCase();
  const statusFilter = opts?.status && opts.status !== "all" ? opts.status : undefined;
  const productIdFilter = opts?.productId?.trim() || undefined;

  // 1. Fetch all special keys to compute overall summary and matrix
  const allSpecialKeys = await prisma.key.findMany({
    where: {
      isSpecialInventory: true,
    },
    include: {
      duration: {
        include: {
          product: {
            select: { id: true, title: true },
          },
          prices: {
            where: { currency: "USD" },
            select: { price: true },
          },
        },
      },
      orderItem: {
        select: { unitPrice: true },
      },
    },
  });

  let totalKeys = allSpecialKeys.length;
  let availableKeys = 0;
  let soldKeys = 0;
  let totalRealizedRevenue = 0;
  let potentialRevenue = 0;

  const groupMap = new Map<
    string,
    {
      productId: string;
      productTitle: string;
      durationId: string;
      durationLabel: string;
      total: number;
      available: number;
      sold: number;
      realizedRevenue: number;
      potentialRevenue: number;
    }
  >();

  for (const k of allSpecialKeys) {
    const pId = k.duration?.product?.id || "unknown";
    const pTitle = k.duration?.product?.title || "Unknown Product";
    const dId = k.durationId;
    const dLabel = k.duration?.label || "Unknown Duration";
    const unitListPrice = k.duration?.prices[0]?.price ?? 0;
    const groupKey = `${pId}::${dId}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        productId: pId,
        productTitle: pTitle,
        durationId: dId,
        durationLabel: dLabel,
        total: 0,
        available: 0,
        sold: 0,
        realizedRevenue: 0,
        potentialRevenue: 0,
      });
    }

    const grp = groupMap.get(groupKey)!;
    grp.total += 1;

    if (k.status === KeyStatus.AVAILABLE) {
      availableKeys += 1;
      grp.available += 1;
      potentialRevenue += unitListPrice;
      grp.potentialRevenue += unitListPrice;
    } else if (k.status === KeyStatus.SOLD) {
      soldKeys += 1;
      grp.sold += 1;
      const saleAmt = k.orderItem?.unitPrice ?? unitListPrice;
      totalRealizedRevenue += saleAmt;
      grp.realizedRevenue += saleAmt;
    }
  }

  const productGroups = Array.from(groupMap.values()).sort((a, b) =>
    a.productTitle.localeCompare(b.productTitle),
  );

  // 2. Query paginated keys with search & filters
  const whereClause: any = {
    isSpecialInventory: true,
  };

  if (statusFilter) {
    whereClause.status = statusFilter;
  }

  if (productIdFilter) {
    whereClause.duration = {
      productId: productIdFilter,
    };
  }

  if (q) {
    whereClause.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { duration: { product: { title: { contains: q, mode: "insensitive" } } } },
      { duration: { label: { contains: q, mode: "insensitive" } } },
      { order: { user: { username: { contains: q, mode: "insensitive" } } } },
      { order: { user: { email: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [filteredCount, pageKeys] = await Promise.all([
    prisma.key.count({ where: whereClause }),
    prisma.key.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: [
        { status: "asc" }, // AVAILABLE first, then SOLD
        { createdAt: "desc" },
      ],
      include: {
        duration: {
          include: {
            product: {
              select: { title: true },
            },
            prices: {
              where: { currency: "USD" },
              select: { price: true },
            },
          },
        },
        orderItem: {
          select: { unitPrice: true },
        },
        order: {
          select: {
            id: true,
            user: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const keys: SpecialInventoryKeyItem[] = pageKeys.map((k) => {
    const pTitle = k.duration?.product?.title || "Unknown Product";
    const dLabel = k.duration?.label || "Unknown Duration";
    const unitListPrice = k.duration?.prices[0]?.price ?? 0;
    const salePrice =
      k.status === KeyStatus.SOLD
        ? k.orderItem?.unitPrice ?? unitListPrice
        : null;

    return {
      id: k.id,
      code: k.code,
      status: k.status,
      productTitle: pTitle,
      durationLabel: dLabel,
      durationId: k.durationId,
      createdAt: k.createdAt.toISOString(),
      soldAt: k.soldAt?.toISOString() ?? null,
      orderId: k.orderId ?? null,
      buyerName: k.order?.user?.username ?? null,
      buyerEmail: k.order?.user?.email ?? null,
      salePrice,
    };
  });

  return {
    summary: {
      totalKeys,
      availableKeys,
      soldKeys,
      totalRealizedRevenue,
      potentialRevenue,
      productGroups,
    },
    keys,
    page,
    limit,
    total: filteredCount,
    hasMore: skip + pageKeys.length < filteredCount,
  };
}

export async function importSpecialInventoryKeys(opts: {
  durationId: string;
  rawKeys: string;
  batchTag?: string;
}): Promise<{ added: number; skipped: number }> {
  const lines = opts.rawKeys
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let added = 0;
  let skipped = 0;

  for (const line of lines) {
    if (!line) continue;
    try {
      await prisma.key.create({
        data: {
          code: line,
          durationId: opts.durationId,
          status: KeyStatus.AVAILABLE,
          isSpecialInventory: true,
          specialBatchTag: opts.batchTag?.trim() || "SPECIAL_IMPORT",
        },
      });
      added += 1;
    } catch {
      // Duplicate key code in DB
      skipped += 1;
    }
  }

  return { added, skipped };
}

/** UTC day the site began or earliest special inventory key/order. */
async function settlementSince(now = new Date()): Promise<Date> {
  const [firstUser, firstOrder, firstKey] = await Promise.all([
    prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.order.findFirst({
      where: {
        status: { in: [...PAID_ORDER_STATUSES] },
        items: { some: { key: { isSpecialInventory: true } } },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.key.findFirst({
      where: { isSpecialInventory: true },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const candidates = [
    firstUser?.createdAt,
    firstOrder?.createdAt,
    firstKey?.createdAt,
  ].filter((d): d is Date => d instanceof Date);

  const lookback = daysAgoStart(LOOKBACK_DAYS, now);
  if (candidates.length === 0) return lookback;

  const earliest = todayStart(candidates.reduce((a, b) => (a < b ? a : b)));
  return earliest > lookback ? earliest : lookback;
}

type DaySpecialAgg = {
  sales: number;
  keysSold: number;
  orders: number;
  cost: number;
  grossProfit: number;
};

function emptySpecialDay(): DaySpecialAgg {
  return { sales: 0, keysSold: 0, orders: 0, cost: 0, grossProfit: 0 };
}

async function buildDailySpecialAggregates(since: Date): Promise<Map<string, DaySpecialAgg>> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: [...PAID_ORDER_STATUSES] },
      createdAt: { gte: since },
      items: {
        some: {
          key: {
            isSpecialInventory: true,
          },
        },
      },
    },
    select: {
      id: true,
      createdAt: true,
      items: {
        select: {
          durationId: true,
          unitPrice: true,
          key: {
            select: {
              isSpecialInventory: true,
            },
          },
        },
      },
    },
  });

  const byDay = new Map<string, DaySpecialAgg>();
  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? emptySpecialDay();

    let hasSpecial = false;
    for (const item of order.items) {
      if (!item.key?.isSpecialInventory) continue;
      hasSpecial = true;
      // Special inventory has 0 cost basis (100% profit margin before 50/50 split)
      const cost = 0;
      const profit = item.unitPrice;
      cur.sales += item.unitPrice;
      cur.cost += cost;
      cur.grossProfit += profit;
      cur.keysSold += 1;
    }

    if (hasSpecial) {
      cur.orders += 1;
      byDay.set(key, cur);
    }
  }

  return byDay;
}

function matchesSpecialSearch(
  row: SpecialStockSettlementRow,
  q: string,
): boolean {
  if (!q) return true;
  const hay = [
    row.dateKey,
    row.status,
    String(row.sales),
    String(row.grossProfit),
    String(row.developerShare),
    String(row.ownerShare),
    String(row.keysSold),
    String(row.orders),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export async function getSpecialStockSettlements(opts?: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<SpecialStockSettlementsPayload> {
  const pageSize = Math.min(
    Math.max(opts?.pageSize ?? DEFAULT_SETTLEMENT_PAGE_SIZE, 1),
    50,
  );
  const page = Math.max(opts?.page ?? 1, 1);
  const q = (opts?.q ?? "").trim().toLowerCase();

  const now = new Date();
  const since = await settlementSince(now);
  const dateKeys = dateKeysBetween(since, now);
  const shareRate = await getSpecialStockDeveloperShareRate();

  const [aggs, settlements] = await Promise.all([
    buildDailySpecialAggregates(since),
    prisma.specialStockSettlementDay.findMany({
      where: { dateKey: { in: dateKeys } },
      select: {
        dateKey: true,
        status: true,
        paidAt: true,
        amount: true,
      },
    }),
  ]);

  const settled = new Map(settlements.map((s) => [s.dateKey, s]));

  const allRows: SpecialStockSettlementRow[] = dateKeys
    .slice()
    .reverse()
    .map((dateKey) => {
      const agg = aggs.get(dateKey) ?? emptySpecialDay();
      const rec = settled.get(dateKey);
      const developerShare = Math.round(agg.grossProfit * shareRate);
      const ownerShare = Math.max(0, agg.grossProfit - developerShare);
      return {
        dateKey,
        sales: agg.sales,
        keysSold: agg.keysSold,
        orders: agg.orders,
        cost: agg.cost,
        grossProfit: agg.grossProfit,
        developerShare,
        ownerShare,
        status:
          rec?.status === DeveloperSettlementStatus.PAID ? "PAID" : "PENDING",
        paidAt: rec?.paidAt?.toISOString() ?? null,
      };
    });

  const filtered = allRows.filter((r) => matchesSpecialSearch(r, q));

  const pendingRows = allRows.filter(
    (r) => r.status === "PENDING" && r.developerShare > 0,
  );
  const paidRows = allRows.filter((r) => r.status === "PAID");

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;

  return {
    shareRate,
    pendingDays: pendingRows.length,
    pendingShare: pendingRows.reduce((s, r) => s + r.developerShare, 0),
    paidDays: paidRows.length,
    paidShare: paidRows.reduce((s, r) => s + r.developerShare, 0),
    totalRows: filtered.length,
    page: safePage,
    pageSize,
    pageCount,
    rows: filtered.slice(start, start + pageSize),
  };
}

/** Mark Special Stock settlement days paid. Does not touch wallets or orders. */
export async function markSpecialStockSettlementsPaid(opts: {
  dateKeys: string[];
  adminId: string;
}): Promise<{ updated: number; dateKeys: string[] }> {
  const keys = Array.from(
    new Set(
      opts.dateKeys
        .map((k) => k.trim())
        .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)),
    ),
  );
  if (keys.length === 0) {
    return { updated: 0, dateKeys: [] };
  }

  const now = new Date();
  const since = await settlementSince(now);
  const today = todayStart(now).toISOString().slice(0, 10);
  const allowed = new Set(dateKeysBetween(since, now));
  const validKeys = keys.filter((k) => allowed.has(k) && k <= today);
  if (validKeys.length === 0) {
    return { updated: 0, dateKeys: [] };
  }

  const aggs = await buildDailySpecialAggregates(since);
  const shareRate = await getSpecialStockDeveloperShareRate();
  const paidAt = new Date();
  let updated = 0;

  for (const dateKey of validKeys) {
    const agg = aggs.get(dateKey) ?? emptySpecialDay();
    const amount = Math.round(agg.grossProfit * shareRate);
    await prisma.specialStockSettlementDay.upsert({
      where: { dateKey },
      create: {
        dateKey,
        status: DeveloperSettlementStatus.PAID,
        amount,
        paidAt,
        paidById: opts.adminId,
      },
      update: {
        status: DeveloperSettlementStatus.PAID,
        amount,
        paidAt,
        paidById: opts.adminId,
      },
    });
    updated += 1;
  }

  return { updated, dateKeys: validKeys };
}

