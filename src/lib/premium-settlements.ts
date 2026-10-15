import {
  dateKeysBetween,
  daysAgoStart,
  todayStart,
} from "@/lib/admin-stats";
import { prisma } from "@/lib/prisma";
import { getPremiumDeveloperShareRate } from "@/lib/settings";
import {
  DeveloperSettlementStatus,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

const LOOKBACK_DAYS = 89;
const DEFAULT_PAGE_SIZE = 8;

/** UTC day the site began — earliest user (or first Premium purchase). Never list days before this. */
async function siteStartDay(now = new Date()): Promise<Date> {
  const [firstUser, firstPremium] = await Promise.all([
    prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.transaction.findFirst({
      where: {
        type: TransactionType.PREMIUM_PURCHASE,
        status: TransactionStatus.COMPLETED,
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const candidates = [firstUser?.createdAt, firstPremium?.createdAt].filter(
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

export type PremiumSettlementRow = {
  dateKey: string;
  revenue: number;
  purchases: number;
  developerShare: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
};

export type PremiumSettlementsPayload = {
  shareRate: number;
  pendingDays: number;
  pendingShare: number;
  paidDays: number;
  paidShare: number;
  totalRows: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rows: PremiumSettlementRow[];
};

type DayAgg = {
  revenue: number;
  purchases: number;
};

function emptyDay(): DayAgg {
  return { revenue: 0, purchases: 0 };
}

async function buildDailyAggregates(since: Date): Promise<Map<string, DayAgg>> {
  const txs = await prisma.transaction.findMany({
    where: {
      type: TransactionType.PREMIUM_PURCHASE,
      status: TransactionStatus.COMPLETED,
      createdAt: { gte: since },
    },
    select: {
      amount: true,
      createdAt: true,
    },
  });

  const byDay = new Map<string, DayAgg>();
  for (const tx of txs) {
    const key = tx.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? emptyDay();
    cur.revenue += Math.abs(tx.amount);
    cur.purchases += 1;
    byDay.set(key, cur);
  }
  return byDay;
}

function matchesSearch(row: PremiumSettlementRow, q: string): boolean {
  if (!q) return true;
  const hay = [
    row.dateKey,
    row.status,
    String(row.revenue),
    String(row.developerShare),
    String(row.purchases),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export async function getPremiumSettlements(opts?: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<PremiumSettlementsPayload> {
  const pageSize = Math.min(
    Math.max(opts?.pageSize ?? DEFAULT_PAGE_SIZE, 1),
    50,
  );
  const page = Math.max(opts?.page ?? 1, 1);
  const q = (opts?.q ?? "").trim().toLowerCase();

  const now = new Date();
  const since = await settlementSince(now);
  const dateKeys = dateKeysBetween(since, now);
  const shareRate = await getPremiumDeveloperShareRate();

  const [aggs, settlements] = await Promise.all([
    buildDailyAggregates(since),
    prisma.premiumSettlementDay.findMany({
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

  const allRows: PremiumSettlementRow[] = dateKeys
    .slice()
    .reverse()
    .map((dateKey) => {
      const agg = aggs.get(dateKey) ?? emptyDay();
      const rec = settled.get(dateKey);
      const developerShare = Math.round(agg.revenue * shareRate);
      return {
        dateKey,
        revenue: agg.revenue,
        purchases: agg.purchases,
        developerShare,
        status:
          rec?.status === DeveloperSettlementStatus.PAID ? "PAID" : "PENDING",
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

/** Mark Premium settlement days paid. Does not touch wallets or Premium status. */
export async function markPremiumSettlementsPaid(opts: {
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
  const shareRate = await getPremiumDeveloperShareRate();
  const paidAt = new Date();
  let updated = 0;

  for (const dateKey of validKeys) {
    const agg = aggs.get(dateKey) ?? emptyDay();
    const amount = Math.round(agg.revenue * shareRate);
    await prisma.premiumSettlementDay.upsert({
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
