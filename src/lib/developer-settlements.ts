import {
  dateKeysBetween,
  daysAgoStart,
  todayStart,
} from "@/lib/admin-stats";
import { prisma } from "@/lib/prisma";
import { getDeveloperProfitShareRate } from "@/lib/settings";
import {
  DeveloperSettlementStatus,
  OrderStatus,
} from "@prisma/client";

const PAID_ORDER_STATUSES = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;
const LOOKBACK_DAYS = 89;
const DEFAULT_PAGE_SIZE = 8;

/** UTC day the site began — earliest user (or first paid order). Never list days before this. */
async function siteStartDay(now = new Date()): Promise<Date> {
  const [firstUser, firstOrder] = await Promise.all([
    prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.order.findFirst({
      where: { status: { in: [...PAID_ORDER_STATUSES] } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const candidates = [firstUser?.createdAt, firstOrder?.createdAt].filter(
    (d): d is Date => d instanceof Date,
  );
  if (candidates.length === 0) return todayStart(now);

  const earliest = candidates.reduce((a, b) => (a < b ? a : b));
  return todayStart(earliest);
}

/** Lower bound: site start, capped by LOOKBACK_DAYS (no pre-launch empty calendar). */
async function settlementSince(now = new Date()): Promise<Date> {
  const lookback = daysAgoStart(LOOKBACK_DAYS, now);
  const siteStart = await siteStartDay(now);
  return siteStart > lookback ? siteStart : lookback;
}

export type DeveloperSettlementRow = {
  dateKey: string;
  sales: number;
  orders: number;
  grossProfit: number;
  cost: number;
  developerShare: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
};

export type DeveloperSettlementsPayload = {
  shareRate: number;
  pendingDays: number;
  pendingShare: number;
  paidDays: number;
  paidShare: number;
  totalRows: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rows: DeveloperSettlementRow[];
};

type DayAgg = {
  sales: number;
  orders: number;
  grossProfit: number;
  cost: number;
};

function emptyDay(): DayAgg {
  return { sales: 0, orders: 0, grossProfit: 0, cost: 0 };
}

async function buildDailyAggregates(since: Date): Promise<Map<string, DayAgg>> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: [...PAID_ORDER_STATUSES] },
      createdAt: { gte: since },
    },
    select: {
      total: true,
      createdAt: true,
      items: {
        select: {
          durationId: true,
          unitPrice: true,
        },
      },
    },
  });

  const durationIds = Array.from(
    new Set(orders.flatMap((o) => o.items.map((i) => i.durationId))),
  );
  const prices =
    durationIds.length === 0
      ? []
      : await prisma.durationPrice.findMany({
          where: { durationId: { in: durationIds }, currency: "USD" },
          select: { durationId: true, buyPrice: true },
        });
  const buyByDuration = new Map(prices.map((p) => [p.durationId, p.buyPrice]));

  const byDay = new Map<string, DayAgg>();
  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? emptyDay();

    // Only count non-special items towards developer settlement sales/profit
    let orderEligibleSales = 0;
    let orderEligibleCost = 0;
    let orderEligibleGross = 0;
    let hasEligibleItems = false;

    for (const item of order.items) {
      hasEligibleItems = true;
      const cost = buyByDuration.get(item.durationId) ?? 0;
      orderEligibleSales += item.unitPrice;
      orderEligibleCost += cost;
      orderEligibleGross += item.unitPrice - cost;
    }

    if (hasEligibleItems) {
      cur.sales += orderEligibleSales;
      cur.orders += 1;
      cur.cost += orderEligibleCost;
      cur.grossProfit += orderEligibleGross;
      byDay.set(key, cur);
    }
  }
  return byDay;
}

function matchesSearch(row: DeveloperSettlementRow, q: string): boolean {
  if (!q) return true;
  const hay = [
    row.dateKey,
    row.status,
    String(row.sales),
    String(row.grossProfit),
    String(row.developerShare),
    String(row.cost),
    String(row.orders),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export async function getDeveloperSettlements(opts?: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<DeveloperSettlementsPayload> {
  const pageSize = Math.min(
    Math.max(opts?.pageSize ?? DEFAULT_PAGE_SIZE, 1),
    50,
  );
  const page = Math.max(opts?.page ?? 1, 1);
  const q = (opts?.q ?? "").trim().toLowerCase();

  const now = new Date();
  const since = await settlementSince(now);
  const dateKeys = dateKeysBetween(since, now);
  const shareRate = await getDeveloperProfitShareRate();

  const [aggs, settlements] = await Promise.all([
    buildDailyAggregates(since),
    prisma.developerSettlementDay.findMany({
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

  const allRows: DeveloperSettlementRow[] = dateKeys
    .slice()
    .reverse()
    .map((dateKey) => {
      const agg = aggs.get(dateKey) ?? emptyDay();
      const rec = settled.get(dateKey);
      const developerShare = Math.round(agg.grossProfit * shareRate);
      return {
        dateKey,
        sales: agg.sales,
        orders: agg.orders,
        grossProfit: agg.grossProfit,
        cost: agg.cost,
        developerShare,
        status: rec?.status === DeveloperSettlementStatus.PAID ? "PAID" : "PENDING",
        paidAt: rec?.paidAt?.toISOString() ?? null,
      };
    });

  const filtered = allRows.filter((r) => matchesSearch(r, q));

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

/** Mark settlement days paid. Does not touch wallets, orders, or deposits. */
export async function markDeveloperSettlementsPaid(opts: {
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

  const aggs = await buildDailyAggregates(since);
  const shareRate = await getDeveloperProfitShareRate();
  const paidAt = new Date();
  let updated = 0;

  for (const dateKey of validKeys) {
    const agg = aggs.get(dateKey) ?? emptyDay();
    const amount = Math.round(agg.grossProfit * shareRate);
    await prisma.developerSettlementDay.upsert({
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
