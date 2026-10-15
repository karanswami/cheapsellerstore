import { dateKeysBetween, daysAgoStart, todayStart } from "@/lib/admin-stats";
import { prisma } from "@/lib/prisma";
import { DeveloperSettlementStatus, TransactionType } from "@prisma/client";

const LOOKBACK_DAYS = 89;
const DEFAULT_PAGE_SIZE = 8;

async function marginSince(now = new Date()): Promise<Date> {
  const lookback = daysAgoStart(LOOKBACK_DAYS, now);
  const first = await prisma.transaction.findFirst({
    where: { type: TransactionType.API_FEE, status: "COMPLETED" },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (!first) return todayStart(now);
  const site = todayStart(first.createdAt);
  return site > lookback ? site : lookback;
}

export type ApiDeveloperMarginRow = {
  dateKey: string;
  purchases: number;
  marginMicrocents: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
};

export type ApiDeveloperMarginPayload = {
  feePercentLabel: string;
  todayMargin: number;
  last7Margin: number;
  pendingDays: number;
  pendingMargin: number;
  paidDays: number;
  paidMargin: number;
  totalRows: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rows: ApiDeveloperMarginRow[];
};

export async function getApiDeveloperMargins(opts: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<ApiDeveloperMarginPayload> {
  const now = new Date();
  const since = await marginSince(now);
  const page = Math.max(1, Math.floor(opts.page ?? 1) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Math.floor(opts.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE),
  );

  const txs = await prisma.transaction.findMany({
    where: {
      type: TransactionType.API_FEE,
      status: "COMPLETED",
      createdAt: { gte: since },
    },
    select: { amount: true, createdAt: true, reference: true },
  });

  const byDay = new Map<string, { margin: number; purchases: number }>();
  for (const tx of txs) {
    const key = tx.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? { margin: 0, purchases: 0 };
    cur.margin += Math.abs(tx.amount);
    cur.purchases += 1;
    byDay.set(key, cur);
  }

  const paidRows = await prisma.apiDeveloperMarginDay.findMany({
    where: { dateKey: { gte: since.toISOString().slice(0, 10) } },
  });
  const paidMap = new Map(paidRows.map((r) => [r.dateKey, r]));

  const allKeys = dateKeysBetween(since, todayStart(now)).reverse();
  const q = opts.q?.trim();
  const filtered = q
    ? allKeys.filter((k) => k.includes(q) || (byDay.get(k)?.margin ?? 0) > 0)
    : allKeys.filter((k) => (byDay.get(k)?.margin ?? 0) > 0 || paidMap.has(k));

  // Always include days with margin; if none, still show empty recent window lightly
  const keys =
    filtered.length > 0
      ? filtered
      : allKeys.slice(0, 14).filter((k) => byDay.has(k) || paidMap.has(k));

  let pendingMargin = 0;
  let pendingDays = 0;
  let paidMargin = 0;
  let paidDays = 0;
  const todayKey = todayStart(now).toISOString().slice(0, 10);
  const last7 = daysAgoStart(6, now);
  let todayMargin = 0;
  let last7Margin = 0;

  for (const key of allKeys) {
    const agg = byDay.get(key);
    const margin = agg?.margin ?? 0;
    const paid = paidMap.get(key);
    const status = paid?.status === "PAID" ? "PAID" : "PENDING";
    if (key === todayKey) todayMargin += margin;
    if (new Date(`${key}T00:00:00.000Z`) >= last7) last7Margin += margin;
    if (status === "PAID") {
      paidDays += 1;
      paidMargin += paid?.amount || margin;
    } else if (margin > 0) {
      pendingDays += 1;
      pendingMargin += margin;
    }
  }

  const totalRows = keys.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const slice = keys.slice((page - 1) * pageSize, page * pageSize);

  const rows: ApiDeveloperMarginRow[] = slice.map((dateKey) => {
    const agg = byDay.get(dateKey);
    const paid = paidMap.get(dateKey);
    const status = paid?.status === "PAID" ? "PAID" : "PENDING";
    return {
      dateKey,
      purchases: agg?.purchases ?? 0,
      marginMicrocents: agg?.margin ?? 0,
      status,
      paidAt: paid?.paidAt?.toISOString() ?? null,
    };
  });

  return {
    feePercentLabel: "Developer margin (API_FEE)",
    todayMargin,
    last7Margin,
    pendingDays,
    pendingMargin,
    paidDays,
    paidMargin,
    totalRows,
    page,
    pageSize,
    pageCount,
    rows,
  };
}

export async function markApiDeveloperMarginsPaid(input: {
  dateKeys: string[];
  paidById: string;
  note?: string;
}) {
  const keys = Array.from(
    new Set(input.dateKeys.map((k) => k.trim()).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))),
  );
  if (keys.length === 0) {
    return { ok: false as const, code: "INVALID", message: "No valid date keys." };
  }

  const since = new Date(`${keys.sort()[0]}T00:00:00.000Z`);
  const until = new Date(`${keys[keys.length - 1]}T23:59:59.999Z`);
  const txs = await prisma.transaction.findMany({
    where: {
      type: TransactionType.API_FEE,
      status: "COMPLETED",
      createdAt: { gte: since, lte: until },
    },
    select: { amount: true, createdAt: true },
  });

  const byDay = new Map<string, number>();
  for (const tx of txs) {
    const key = tx.createdAt.toISOString().slice(0, 10);
    if (!keys.includes(key)) continue;
    byDay.set(key, (byDay.get(key) ?? 0) + Math.abs(tx.amount));
  }

  let marked = 0;
  for (const dateKey of keys) {
    const amount = byDay.get(dateKey) ?? 0;
    await prisma.apiDeveloperMarginDay.upsert({
      where: { dateKey },
      create: {
        dateKey,
        status: DeveloperSettlementStatus.PAID,
        amount,
        paidAt: new Date(),
        paidById: input.paidById,
        note: input.note ?? null,
      },
      update: {
        status: DeveloperSettlementStatus.PAID,
        amount,
        paidAt: new Date(),
        paidById: input.paidById,
        note: input.note ?? null,
      },
    });
    marked += 1;
  }

  return { ok: true as const, marked };
}
