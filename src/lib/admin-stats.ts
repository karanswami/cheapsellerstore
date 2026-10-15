import { prisma } from "@/lib/prisma";
import { getDeveloperProfitShareRate } from "@/lib/settings";
import {
  DepositStatus,
  KeyStatus,
  OrderStatus,
  UserRole,
  type DepositMethod,
  type OrderStatus as OrderStatusType,
} from "@prisma/client";

/** @deprecated Prefer getDeveloperProfitShareRate() from settings — kept as fallback default. */
export const DEVELOPER_PROFIT_SHARE = 0.1;

export type StatisticsPeriod = "today" | "7" | "30" | "90";

export type WindowKpis = {
  revenue: number;
  orders: number;
  deposits: number;
  depositSum: number;
  newUsers: number;
};

export type DayPoint = { date: string; total: number };
export type DayCount = { date: string; count: number };

export type NamedCount = { name: string; count: number };

export type AdminHistoryKind =
  | "order"
  | "deposit"
  | "transaction"
  | "key"
  | "review"
  | "reseller";

export type AdminHistoryEvent = {
  id: string;
  kind: AdminHistoryKind;
  at: string;
  title: string;
  subtitle: string;
  meta: string | null;
  amount: number | null;
  status: string | null;
  href: string | null;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function daysAgoStart(days: number, from = new Date()): Date {
  const d = startOfUtcDay(from);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export function todayStart(from = new Date()): Date {
  return startOfUtcDay(from);
}

/** Inclusive YYYY-MM-DD keys from `since` through today (UTC). */
export function dateKeysBetween(since: Date, until = new Date()): string[] {
  const keys: string[] = [];
  const cur = startOfUtcDay(since);
  const end = startOfUtcDay(until);
  while (cur <= end) {
    keys.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return keys;
}

async function windowKpis(since: Date | null): Promise<WindowKpis> {
  const createdAt = since ? { gte: since } : undefined;
  const orderWhere = {
    status: OrderStatus.FULFILLED,
    ...(createdAt ? { createdAt } : {}),
  };
  const depositWhere = {
    status: DepositStatus.COMPLETED,
    ...(createdAt ? { createdAt } : {}),
  };
  const userWhere = createdAt ? { createdAt } : {};

  const [revenueAgg, depositAgg, newUsers] = await Promise.all([
    prisma.order.aggregate({
      where: orderWhere,
      _sum: { total: true },
      _count: true,
    }),
    prisma.deposit.aggregate({
      where: depositWhere,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.user.count({ where: userWhere }),
  ]);

  return {
    revenue: revenueAgg._sum.total ?? 0,
    orders: revenueAgg._count,
    deposits: depositAgg._count,
    depositSum: depositAgg._sum.amount ?? 0,
    newUsers,
  };
}

const PAID_ORDER_STATUSES = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;

async function orderWindow(since: Date) {
  const agg = await prisma.order.aggregate({
    where: {
      status: { in: [...PAID_ORDER_STATUSES] },
      createdAt: { gte: since },
    },
    _sum: { total: true },
    _count: true,
  });
  return {
    revenue: agg._sum.total ?? 0,
    orders: agg._count,
  };
}

export async function getDashboardStats() {
  const now = new Date();
  const today = todayStart(now);
  const d7 = daysAgoStart(6, now);
  const sparkSince = d7;

  const [
    todayOrders,
    weekOrders,
    pendingPayments,
    completedDepositsToday,
    openReports,
    expiredDeposits,
    availableKeys,
    soldKeys,
    sparkOrders,
    recentDepositsRaw,
    recentOrdersRaw,
  ] = await Promise.all([
    orderWindow(today),
    orderWindow(d7),
    prisma.deposit.count({
      where: {
        status: {
          in: [DepositStatus.PENDING, DepositStatus.PROCESSING],
        },
      },
    }),
    prisma.deposit.count({
      where: {
        status: DepositStatus.COMPLETED,
        createdAt: { gte: today },
      },
    }),
    prisma.issueReport.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.deposit.count({ where: { status: DepositStatus.EXPIRED } }),
    prisma.key.count({ where: { status: KeyStatus.AVAILABLE } }),
    prisma.key.count({ where: { status: KeyStatus.SOLD } }),
    prisma.order.findMany({
      where: {
        status: { in: [...PAID_ORDER_STATUSES] },
        createdAt: { gte: sparkSince },
      },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.deposit.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        method: true,
        status: true,
        adminAction: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        user: { select: { username: true } },
        buyerEmail: true,
        items: {
          take: 1,
          select: { productTitle: true, durationLabel: true },
        },
      },
    }),
  ]);

  const dayMap = new Map<string, number>();
  for (const key of dateKeysBetween(sparkSince, now)) {
    dayMap.set(key, 0);
  }
  for (const o of sparkOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + o.total);
  }

  return {
    today: todayOrders,
    week: weekOrders,
    pendingPayments,
    completedDepositsToday,
    openReports,
    expiredDeposits,
    stock: {
      availableKeys,
      soldKeys,
    },
    sparkline: Array.from(dayMap.entries()).map(([date, total]) => ({
      date,
      total,
    })),
    recentDeposits: recentDepositsRaw.map((d) => ({
      id: d.id,
      username: d.user.username,
      method: d.method,
      amount: d.amount,
      status: d.status,
      badge: depositBadgeLabel(d.status, d.adminAction),
      at: d.createdAt.toISOString(),
    })),
    recentOrders: recentOrdersRaw.map((o) => {
      const item = o.items[0];
      return {
        id: o.id,
        productTitle: item?.productTitle ?? "Order",
        username: o.user?.username ?? o.buyerEmail.split("@")[0] ?? "—",
        durationLabel: item?.durationLabel ?? "—",
        amount: o.total,
        status: o.status,
        at: o.createdAt.toISOString(),
      };
    }),
  };
}

function depositBadgeLabel(
  status: string,
  adminAction: string | null,
): string {
  if (
    adminAction &&
    !["approved", "rejected", "reported", "dismissed"].includes(adminAction)
  ) {
    return adminAction.toUpperCase();
  }
  return status;
}

function periodSince(period: StatisticsPeriod, now = new Date()): Date {
  if (period === "today") return todayStart(now);
  if (period === "7") return daysAgoStart(6, now);
  if (period === "90") return daysAgoStart(89, now);
  return daysAgoStart(29, now);
}

function splitGrossProfit(
  gross: number,
  shareRate: number,
): { owner: number; developer: number } {
  const developer = Math.round(gross * shareRate);
  return { owner: gross - developer, developer };
}

export async function getStatisticsStats(period: StatisticsPeriod = "today") {
  const now = new Date();
  const since = periodSince(period, now);
  const paidStatuses = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;
  const shareRate = await getDeveloperProfitShareRate();

  const [orders, windowDeposits, users, resellers, availableKeys, soldKeys] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          status: { in: [...paidStatuses] },
          createdAt: { gte: since },
        },
        select: {
          id: true,
          total: true,
          userId: true,
          createdAt: true,
          items: {
            select: {
              productTitle: true,
              durationLabel: true,
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
        orderBy: { createdAt: "asc" },
      }),
      prisma.deposit.findMany({
        where: {
          status: DepositStatus.COMPLETED,
          createdAt: { gte: since },
        },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          role: { in: [UserRole.SELLER, UserRole.RESELLER] },
        },
      }),
      prisma.key.count({ where: { status: KeyStatus.AVAILABLE } }),
      prisma.key.count({ where: { status: KeyStatus.SOLD } }),
    ]);

  const durationIds = Array.from(
    new Set(orders.flatMap((o) => o.items.map((i) => i.durationId))),
  );
  const priceRows =
    durationIds.length === 0
      ? []
      : await prisma.durationPrice.findMany({
          where: { durationId: { in: durationIds }, currency: "USD" },
          select: { durationId: true, price: true, buyPrice: true },
        });
  const priceByDuration = new Map(
    priceRows.map((p) => [p.durationId, p] as const),
  );

  type RowAgg = {
    productTitle: string;
    durationLabel: string;
    sold: number;
    revenue: number;
    cost: number;
    discount: number;
    profit: number;
    developer: number;
    owner: number;
    missingCost: number;
  };

  const productMap = new Map<string, RowAgg>();
  const salesByDay = new Map<string, number>();
  const profitByDay = new Map<string, number>();
  for (const key of dateKeysBetween(since, now)) {
    salesByDay.set(key, 0);
    profitByDay.set(key, 0);
  }

  let revenue = 0;
  let grossProfit = 0;
  let totalCost = 0;
  let totalDiscount = 0;
  let missingCost = 0;
  const buyerIds = new Set<string>();

  for (const order of orders) {
    revenue += order.total;
    if (order.userId) buyerIds.add(order.userId);
    const day = order.createdAt.toISOString().slice(0, 10);
    salesByDay.set(day, (salesByDay.get(day) ?? 0) + order.total);

    let orderProfit = 0;
    for (const item of order.items) {
      const isSpecial = item.key?.isSpecialInventory === true;
      const catalog = priceByDuration.get(item.durationId);
      const listPrice = catalog?.price ?? item.unitPrice;
      // Special inventory has 0 buy cost basis
      const cost = isSpecial ? 0 : catalog?.buyPrice ?? 0;
      const discount = Math.max(0, listPrice - item.unitPrice);
      const profit = item.unitPrice - cost;
      // Special inventory gives 0 developer share, 100% to owner
      const split = isSpecial
        ? { owner: profit, developer: 0 }
        : splitGrossProfit(profit, shareRate);

      if (!isSpecial && (!catalog || cost <= 0)) missingCost += 1;
      totalCost += cost;
      totalDiscount += discount;
      grossProfit += profit;
      orderProfit += profit;

      const key = `${item.productTitle}::${item.durationLabel}`;
      const cur = productMap.get(key) ?? {
        productTitle: item.productTitle,
        durationLabel: item.durationLabel,
        sold: 0,
        revenue: 0,
        cost: 0,
        discount: 0,
        profit: 0,
        developer: 0,
        owner: 0,
        missingCost: 0,
      };
      cur.sold += 1;
      cur.revenue += item.unitPrice;
      cur.cost += cost;
      cur.discount += discount;
      cur.profit += profit;
      cur.developer += split.developer;
      cur.owner += split.owner;
      if (!isSpecial && (!catalog || cost <= 0)) cur.missingCost += 1;
      productMap.set(key, cur);
    }
    profitByDay.set(day, (profitByDay.get(day) ?? 0) + orderProfit);
  }

  const depositCredit = windowDeposits.reduce((s, d) => s + d.amount, 0);
  const depositsCompleted = windowDeposits.length;
  const orderDepositPct =
    depositsCompleted > 0
      ? Math.round((orders.length / depositsCompleted) * 100)
      : 0;

  const productRows = Array.from(productMap.values()).sort(
    (a, b) => b.revenue - a.revenue,
  );
  const top = productRows[0] ?? null;
  const periodSplit = splitGrossProfit(grossProfit, shareRate);

  const chart = Array.from(salesByDay.entries()).map(([date, sales]) => ({
    date,
    sales,
    profit: profitByDay.get(date) ?? 0,
  }));

  return {
    period,
    updatedAt: now.toISOString(),
    shareRate,
    revenue,
    orders: orders.length,
    grossProfit,
    missingCost,
    depositCredit,
    depositsCompleted,
    buyers: buyerIds.size,
    orderDepositPct,
    chart,
    topProduct: top
      ? {
          title: top.productTitle,
          durationLabel: top.durationLabel,
          sold: top.sold,
          revenue: top.revenue,
          profit: top.profit,
        }
      : null,
    totals: {
      owner: periodSplit.owner,
      developer: periodSplit.developer,
      discount: totalDiscount,
      cost: totalCost,
    },
    stock: {
      users,
      resellers,
      availableKeys,
      soldKeys,
    },
    productRows: productRows.map((r) => ({
      productTitle: r.productTitle,
      durationLabel: r.durationLabel,
      sold: r.sold,
      revenue: r.revenue,
      profit: r.profit,
      developer: r.developer,
      owner: r.owner,
      cost: r.cost,
      discount: r.discount,
    })),
  };
}

export async function getAnalyticsStats() {
  const [
    users,
    fulfilledOrders,
    completedDeposits,
    usersByRole,
    ordersByStatus,
    depositsByMethod,
    depositsByStatus,
    keysByStatus,
    reviewsByStatus,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.order.count({ where: { status: OrderStatus.FULFILLED } }),
    prisma.deposit.count({ where: { status: DepositStatus.COMPLETED } }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.deposit.groupBy({
      by: ["method"],
      _count: { _all: true },
    }),
    prisma.deposit.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.key.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.productReview.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  return {
    totals: {
      users,
      orders: fulfilledOrders,
      deposits: completedDeposits,
    },
    usersByRole: usersByRole.map((r) => ({
      name: r.role as UserRole,
      count: r._count._all,
    })),
    ordersByStatus: ordersByStatus.map((r) => ({
      name: r.status as OrderStatusType,
      count: r._count._all,
    })),
    depositsByMethod: depositsByMethod.map((r) => ({
      name: r.method as DepositMethod,
      count: r._count._all,
    })),
    depositsByStatus: depositsByStatus.map((r) => ({
      name: r.status,
      count: r._count._all,
    })),
    keysByStatus: keysByStatus.map((r) => ({
      name: r.status,
      count: r._count._all,
    })),
    reviewsByStatus: reviewsByStatus.map((r) => ({
      name: r.status,
      count: r._count._all,
    })),
  };
}

function humanLabel(raw: string): string {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type HistoryEventsPage = {
  events: AdminHistoryEvent[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

const HISTORY_PAGE_DEFAULT = 15;
const HISTORY_PAGE_MAX = 50;
/** Cap per-source fetch when merging “all” kinds for a page window. */
const HISTORY_MERGE_CAP = 200;

function matchesHistoryQuery(event: AdminHistoryEvent, q: string): boolean {
  if (!q) return true;
  const hay = [event.title, event.subtitle, event.meta ?? "", event.status ?? ""]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export async function getHistoryEvents(opts: {
  kind?: AdminHistoryKind | "all";
  page?: number;
  limit?: number;
  q?: string;
}): Promise<HistoryEventsPage> {
  const kind = opts.kind ?? "all";
  const page = Math.max(opts.page ?? 1, 1);
  const limit = Math.min(
    Math.max(opts.limit ?? HISTORY_PAGE_DEFAULT, 1),
    HISTORY_PAGE_MAX,
  );
  const q = opts.q?.trim().toLowerCase() ?? "";
  const want = (k: AdminHistoryKind) => kind === "all" || kind === k;

  // Fetch enough from each source to fill `page * limit` after merge+sort.
  const windowTake = Math.min(page * limit, HISTORY_MERGE_CAP);

  const orderWhere = q ? { buyerEmail: { contains: q } } : undefined;
  const depositWhere = q
    ? {
        OR: [
          { user: { email: { contains: q } } },
          { adminAction: { contains: q } },
          { adminNote: { contains: q } },
        ],
      }
    : undefined;
  const txWhere = q
    ? {
        OR: [
          { user: { email: { contains: q } } },
          { note: { contains: q } },
          { reference: { contains: q } },
        ],
      }
    : undefined;
  const keyWhere = {
    status: KeyStatus.SOLD,
    ...(q
      ? {
          OR: [
            { order: { buyerEmail: { contains: q } } },
            { duration: { label: { contains: q } } },
            { duration: { product: { title: { contains: q } } } },
          ],
        }
      : {}),
  };
  const reviewWhere = q
    ? {
        OR: [
          { user: { email: { contains: q } } },
          { product: { title: { contains: q } } },
          { body: { contains: q } },
        ],
      }
    : undefined;
  const resellerWhere = q
    ? {
        OR: [
          { user: { email: { contains: q } } },
          { fullName: { contains: q } },
        ],
      }
    : undefined;

  const [
    orders,
    deposits,
    transactions,
    soldKeys,
    reviews,
    resellerReqs,
    orderCount,
    depositCount,
    txCount,
    keyCount,
    reviewCount,
    resellerCount,
  ] = await Promise.all([
    want("order")
      ? prisma.order.findMany({
          where: orderWhere,
          take: windowTake,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            buyerEmail: true,
            status: true,
            total: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    want("deposit")
      ? prisma.deposit.findMany({
          where: depositWhere,
          take: windowTake,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { email: true } } },
        })
      : Promise.resolve([]),
    want("transaction")
      ? prisma.transaction.findMany({
          where: txWhere,
          take: windowTake,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { email: true } } },
        })
      : Promise.resolve([]),
    want("key")
      ? prisma.key.findMany({
          where: keyWhere,
          take: windowTake,
          orderBy: { soldAt: "desc" },
          include: {
            duration: {
              include: { product: { select: { title: true } } },
            },
            order: { select: { buyerEmail: true, id: true } },
          },
        })
      : Promise.resolve([]),
    want("review")
      ? prisma.productReview.findMany({
          where: reviewWhere,
          take: windowTake,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { email: true } },
            product: { select: { title: true } },
          },
        })
      : Promise.resolve([]),
    want("reseller")
      ? prisma.resellerRequest.findMany({
          where: resellerWhere,
          take: windowTake,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { email: true } } },
        })
      : Promise.resolve([]),
    want("order")
      ? prisma.order.count({ where: orderWhere })
      : Promise.resolve(0),
    want("deposit")
      ? prisma.deposit.count({ where: depositWhere })
      : Promise.resolve(0),
    want("transaction")
      ? prisma.transaction.count({ where: txWhere })
      : Promise.resolve(0),
    want("key") ? prisma.key.count({ where: keyWhere }) : Promise.resolve(0),
    want("review")
      ? prisma.productReview.count({ where: reviewWhere })
      : Promise.resolve(0),
    want("reseller")
      ? prisma.resellerRequest.count({ where: resellerWhere })
      : Promise.resolve(0),
  ]);

  const events: AdminHistoryEvent[] = [];

  for (const o of orders) {
    events.push({
      id: `order-${o.id}`,
      kind: "order",
      at: o.createdAt.toISOString(),
      title: `Order · ${humanLabel(o.status)}`,
      subtitle: o.buyerEmail,
      meta: null,
      amount: o.total,
      status: o.status,
      href: `/admin/orders/${o.id}`,
    });
  }

  for (const d of deposits) {
    events.push({
      id: `dep-${d.id}`,
      kind: "deposit",
      at: d.createdAt.toISOString(),
      title: `Deposit · ${humanLabel(d.status)}`,
      subtitle: d.user.email,
      meta: d.adminAction ?? humanLabel(d.method),
      amount: d.amount,
      status: d.status,
      href: "/admin/deposits",
    });
  }

  for (const t of transactions) {
    events.push({
      id: `tx-${t.id}`,
      kind: "transaction",
      at: t.createdAt.toISOString(),
      title: `Wallet · ${humanLabel(t.type)}`,
      subtitle: t.user.email,
      meta: t.note,
      amount: t.amount,
      status: t.status,
      href: null,
    });
  }

  for (const k of soldKeys) {
    events.push({
      id: `key-${k.id}`,
      kind: "key",
      at: (k.soldAt ?? k.createdAt).toISOString(),
      title: `Key sold · ${k.duration.product.title}`,
      subtitle: k.order?.buyerEmail ?? "—",
      meta: k.duration.label,
      amount: null,
      status: k.status,
      href: "/admin/keys",
    });
  }

  for (const r of reviews) {
    events.push({
      id: `rev-${r.id}`,
      kind: "review",
      at: r.createdAt.toISOString(),
      title: `Review · ${r.rating}★ · ${humanLabel(r.status)}`,
      subtitle: r.user ? r.user.email : (r.customAuthorName || "Guest Author"),
      meta: r.product.title,
      amount: null,
      status: r.status,
      href: "/admin/reviews",
    });
  }

  for (const r of resellerReqs) {
    events.push({
      id: `rr-${r.id}`,
      kind: "reseller",
      at: r.createdAt.toISOString(),
      title: `Reseller · ${humanLabel(r.status)}`,
      subtitle: r.user.email,
      meta: r.fullName,
      amount: null,
      status: r.status,
      href: "/admin/sellers",
    });
  }

  const sorted = events
    .filter((e) => matchesHistoryQuery(e, q))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const total =
    orderCount +
    depositCount +
    txCount +
    keyCount +
    reviewCount +
    resellerCount;

  const start = (page - 1) * limit;
  const pageEvents = sorted.slice(start, start + limit);
  const hasMore = start + pageEvents.length < total;

  return {
    events: pageEvents,
    page,
    limit,
    total,
    hasMore,
  };
}
