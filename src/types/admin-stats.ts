import type { AdminHistoryEvent, AdminHistoryKind } from "@/lib/admin-stats";

export type {
  AdminHistoryEvent,
  AdminHistoryKind,
  DayCount,
  DayPoint,
  HistoryEventsPage,
  NamedCount,
  WindowKpis,
} from "@/lib/admin-stats";

export type DashboardRecentDeposit = {
  id: string;
  username: string;
  method: string;
  amount: number;
  status: string;
  badge: string;
  at: string;
};

export type DashboardRecentOrder = {
  id: string;
  productTitle: string;
  username: string;
  durationLabel: string;
  amount: number;
  status: string;
  at: string;
};

export type DashboardPayload = {
  today: { revenue: number; orders: number };
  week: { revenue: number; orders: number };
  pendingPayments: number;
  completedDepositsToday: number;
  openReports: number;
  expiredDeposits: number;
  stock: {
    availableKeys: number;
    soldKeys: number;
  };
  sparkline: import("@/lib/admin-stats").DayPoint[];
  recentDeposits: DashboardRecentDeposit[];
  recentOrders: DashboardRecentOrder[];
};

export type StatisticsPeriod = import("@/lib/admin-stats").StatisticsPeriod;

export type StatisticsProductRow = {
  productTitle: string;
  durationLabel: string;
  sold: number;
  revenue: number;
  profit: number;
  developer: number;
  owner: number;
  cost: number;
  discount: number;
};

export type StatisticsPayload = {
  period: StatisticsPeriod;
  updatedAt: string;
  /** Developer share of gross profit (0–1) from Settings. */
  shareRate: number;
  revenue: number;
  orders: number;
  grossProfit: number;
  missingCost: number;
  depositCredit: number;
  depositsCompleted: number;
  buyers: number;
  orderDepositPct: number;
  chart: Array<{ date: string; sales: number; profit: number }>;
  topProduct: {
    title: string;
    durationLabel: string;
    sold: number;
    revenue: number;
    profit: number;
  } | null;
  totals: {
    owner: number;
    developer: number;
    discount: number;
    cost: number;
  };
  stock: {
    users: number;
    resellers: number;
    availableKeys: number;
    soldKeys: number;
  };
  productRows: StatisticsProductRow[];
};

export type AnalyticsPayload = {
  totals: { users: number; orders: number; deposits: number };
  usersByRole: import("@/lib/admin-stats").NamedCount[];
  ordersByStatus: import("@/lib/admin-stats").NamedCount[];
  depositsByMethod: import("@/lib/admin-stats").NamedCount[];
  depositsByStatus: import("@/lib/admin-stats").NamedCount[];
  keysByStatus: import("@/lib/admin-stats").NamedCount[];
  reviewsByStatus: import("@/lib/admin-stats").NamedCount[];
};

export function shortDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compact stamp for overview activity rows (e.g. 17 Jul, 06:53 pm). */
export function formatWhenCompact(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function humanStatus(raw: string): string {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const HISTORY_KIND_LABEL: Record<AdminHistoryKind | "all", string> = {
  all: "All",
  order: "Orders",
  deposit: "Deposits",
  transaction: "Wallet",
  key: "Keys",
  review: "Reviews",
  reseller: "Resellers",
};
