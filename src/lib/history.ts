import { prisma } from "@/lib/prisma";
import {
  isInAllActivityFeed,
  type ActivityFilter,
  type ActivityItem,
} from "@/types/history";

const METHOD_LABEL: Record<string, string> = {
  BINANCE: "Binance Pay",
  QRIS: "QRIS / Rupiah",
  NASIONALPAY: "QRIS / DANA (IDR)",
  UPI: "UPI / INR",
  ESEWA: "eSewa Nepal",
  // legacy rows
  MANUAL: "Manual",
  BANK_TRANSFER: "Bank transfer",
  CRYPTO: "Crypto",
  OTHER: "Other",
};

const TX_TITLE: Record<string, string> = {
  DEPOSIT: "Wallet deposit",
  PURCHASE: "Purchase debit",
  REFUND: "Refund",
  REFERRAL_REWARD: "Referral reward",
  ADMIN_ADJUSTMENT: "Balance adjustment",
  PREMIUM_PURCHASE: "Premium membership",
  GIFT_CODE: "Gift code credit",
  API_FEE: "API purchase fee",
};

function formatStatus(raw: string) {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const DEFAULT_HISTORY_PAGE_SIZE = 20;
const SOURCE_CAP = 200;

export type ActivityHistoryPage = {
  items: ActivityItem[];
  page: number;
  limit: number;
  hasMore: boolean;
};

function matchesQuery(item: ActivityItem, q: string) {
  if (!q) return true;
  const hay = [
    item.title,
    item.subtitle,
    item.status,
    item.kind,
    ...item.details.map((d) => `${d.label} ${d.value}`),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function matchesFilter(item: ActivityItem, filter: ActivityFilter) {
  if (filter === "all") return isInAllActivityFeed(item);
  return item.kind === filter;
}

/**
 * Unified customer activity: orders, deposits, and full wallet ledger.
 * The All feed omits DEPOSIT/PURCHASE ledger rows (shown via deposit/order).
 * Paginated — never dump the full timeline on first paint.
 */
export async function getUserActivityHistoryPage(
  userId: string,
  options?: {
    page?: number;
    limit?: number;
    filter?: ActivityFilter;
    q?: string;
  },
): Promise<ActivityHistoryPage> {
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(
    50,
    Math.max(1, options?.limit ?? DEFAULT_HISTORY_PAGE_SIZE),
  );
  const filter = options?.filter ?? "all";
  const q = options?.q?.trim().toLowerCase() ?? "";

  // Fetch enough rows from each source to cover this page after merge/filter.
  const fetchTake = Math.min(SOURCE_CAP, page * limit + 1);

  const [orders, deposits, transactions] = await Promise.all([
    filter === "deposit" || filter === "wallet"
      ? Promise.resolve([])
      : prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: fetchTake,
          select: {
            id: true,
            status: true,
            total: true,
            currency: true,
            createdAt: true,
            items: {
              select: {
                productTitle: true,
                durationLabel: true,
                unitPrice: true,
              },
            },
          },
        }),
    filter === "order" || filter === "wallet"
      ? Promise.resolve([])
      : prisma.deposit.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: fetchTake,
          select: {
            id: true,
            method: true,
            status: true,
            amount: true,
            adminAction: true,
            adminNote: true,
            failReason: true,
            createdAt: true,
            reviewedAt: true,
          },
        }),
    filter === "order" || filter === "deposit"
      ? Promise.resolve([])
      : prisma.transaction.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: fetchTake,
          select: {
            id: true,
            type: true,
            status: true,
            amount: true,
            note: true,
            reference: true,
            createdAt: true,
          },
        }),
  ]);

  const orderItems: ActivityItem[] = orders.map((o) => {
    const summary =
      o.items.length === 0
        ? "No items"
        : o.items.length === 1
          ? `${o.items[0].productTitle} · ${o.items[0].durationLabel}`
          : `${o.items[0].productTitle} +${o.items.length - 1} more`;
    return {
      id: `order-${o.id}`,
      kind: "order" as const,
      title: "Order",
      subtitle: summary,
      status: o.status,
      amount: -Math.abs(o.total),
      createdAt: o.createdAt.toISOString(),
      details: [
        { label: "Order ID", value: o.id },
        { label: "Status", value: formatStatus(o.status) },
        { label: "Items", value: String(o.items.length) },
        ...o.items.map((item, i) => ({
          label: `Item ${i + 1}`,
          value: `${item.productTitle} · ${item.durationLabel}`,
        })),
      ],
    };
  });

  const depositItems: ActivityItem[] = deposits.map((d) => {
    const isRejected =
      d.adminAction === "rejected" ||
      (d.status === "FAILED" &&
        Boolean(d.failReason) &&
        d.failReason !== "expired" &&
        d.failReason !== "cancelled_by_user");
    const rejectReason = d.adminNote || d.failReason;

    return {
      id: `deposit-${d.id}`,
      kind: "deposit" as const,
      title: "Deposit",
      subtitle: isRejected && rejectReason
        ? `Rejected: ${rejectReason}`
        : (METHOD_LABEL[d.method] ?? d.method),
      status: isRejected ? "REJECTED" : d.status,
      amount: d.amount,
      createdAt: d.createdAt.toISOString(),
      details: [
        { label: "Deposit ID", value: d.id },
        { label: "Method", value: METHOD_LABEL[d.method] ?? d.method },
        { label: "Status", value: isRejected ? "Rejected" : formatStatus(d.status) },
        ...(isRejected && rejectReason
          ? [{ label: "Rejection reason", value: rejectReason }]
          : [
              ...(d.adminNote ? [{ label: "Admin note", value: d.adminNote }] : []),
              ...(d.failReason ? [{ label: "Fail reason", value: d.failReason }] : []),
            ]),
        ...(d.reviewedAt
          ? [
              {
                label: "Reviewed",
                value: d.reviewedAt.toLocaleString(),
              },
            ]
          : []),
      ],
    };
  });

  const walletItems: ActivityItem[] = transactions.map((t) => ({
    id: `tx-${t.id}`,
    kind: "wallet" as const,
    title: TX_TITLE[t.type] ?? t.type,
    subtitle: t.note?.trim() || formatStatus(t.status),
    status: t.type,
    amount: t.amount,
    createdAt: t.createdAt.toISOString(),
    details: [
      { label: "Transaction ID", value: t.id },
      { label: "Type", value: formatStatus(t.type) },
      { label: "Status", value: formatStatus(t.status) },
      ...(t.note ? [{ label: "Note", value: t.note }] : []),
      ...(t.reference
        ? [{ label: "Reference", value: t.reference }]
        : []),
    ],
  }));

  const merged = [...orderItems, ...depositItems, ...walletItems]
    .filter((item) => matchesFilter(item, filter) && matchesQuery(item, q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const start = (page - 1) * limit;
  const items = merged.slice(start, start + limit);
  const hasMore = merged.length > start + limit;

  return { items, page, limit, hasMore };
}

/** @deprecated Prefer `getUserActivityHistoryPage` — kept for callers needing a flat list. */
export async function getUserActivityHistory(
  userId: string,
  limit = 120,
): Promise<ActivityItem[]> {
  const page = await getUserActivityHistoryPage(userId, {
    page: 1,
    limit: Math.min(limit, SOURCE_CAP),
  });
  return page.items;
}

export type ActivitySummary = {
  /** Completed deposits, all time (USD microcents). */
  deposited: number;
  /** Paid / fulfilled orders, all time. */
  spent: number;
  orders: number;
  deposits: number;
  /** Last 14 UTC days, oldest first. */
  days: { date: string; in: number; out: number }[];
};

const SUMMARY_DAYS = 14;

/** All-time totals plus a 14-day in/out series for the statement card. */
export async function getUserActivitySummary(userId: string): Promise<ActivitySummary> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today.getTime() - (SUMMARY_DAYS - 1) * 86_400_000);
  const paid = { in: ["PAID", "FULFILLED"] as ("PAID" | "FULFILLED")[] };

  const [dep, ord, recentDeps, recentOrders] = await Promise.all([
    prisma.deposit.aggregate({ where: { userId, status: "COMPLETED" }, _sum: { amount: true }, _count: true }),
    prisma.order.aggregate({ where: { userId, status: paid }, _sum: { total: true }, _count: true }),
    prisma.deposit.findMany({
      where: { userId, status: "COMPLETED", createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { userId, status: paid, createdAt: { gte: since } },
      select: { total: true, createdAt: true },
    }),
  ]);

  const days = Array.from({ length: SUMMARY_DAYS }, (_, i) => ({
    date: new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10),
    in: 0,
    out: 0,
  }));
  const index = new Map(days.map((d, i) => [d.date, i]));
  for (const d of recentDeps) {
    const i = index.get(d.createdAt.toISOString().slice(0, 10));
    if (i != null) days[i].in += d.amount;
  }
  for (const o of recentOrders) {
    const i = index.get(o.createdAt.toISOString().slice(0, 10));
    if (i != null) days[i].out += Math.abs(o.total);
  }

  return {
    deposited: dep._sum.amount ?? 0,
    spent: Math.abs(ord._sum.total ?? 0),
    orders: ord._count,
    deposits: dep._count,
    days,
  };
}
