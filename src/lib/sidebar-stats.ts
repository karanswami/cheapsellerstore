import { prisma } from "@/lib/prisma";

export type CustomerSidebarBadges = {
  pendingDeposits: number;
  activeReports: number;
  unreadNotifications: number;
};

export type AdminSidebarBadges = {
  pendingDeposits: number;
  openReports: number;
  pendingSellers: number;
  pendingDevSettlements: number;
  pendingOrders: number;
};

export type ConsoleSidebarStats = {
  orders: number;
  keys: number;
  deposits: number;
  customerBadges?: CustomerSidebarBadges;
  adminBadges?: AdminSidebarBadges;
};

/** @deprecated Use ConsoleSidebarStats */
export type CustomerSidebarStats = ConsoleSidebarStats;

/** Fast badge counts for customer nav links. */
export async function getCustomerSidebarBadges(
  userId: string,
): Promise<CustomerSidebarBadges> {
  const [pendingDeposits, activeReports, unreadNotifications] =
    await Promise.all([
      prisma.deposit.count({
        where: { userId, status: { in: ["PENDING", "PROCESSING"] } },
      }),
      prisma.issueReport.count({
        where: { userId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

  return { pendingDeposits, activeReports, unreadNotifications };
}

/** Tiny count-only snapshot for the customer console footer & nav. */
export async function getCustomerSidebarStats(
  userId: string,
): Promise<ConsoleSidebarStats> {
  const [orders, keys, deposits, customerBadges] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.key.count({ where: { order: { userId } } }),
    prisma.deposit.count({ where: { userId } }),
    getCustomerSidebarBadges(userId),
  ]);

  return { orders, keys, deposits, customerBadges };
}

/** Store-wide counts for the admin console footer & navigation badges. */
export async function getAdminSidebarStats(): Promise<ConsoleSidebarStats> {
  const [
    orders,
    keys,
    deposits,
    openReports,
    pendingSellers,
    pendingDevSettlements,
    pendingOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.key.count({ where: { status: "AVAILABLE" } }),
    prisma.deposit.count({
      where: { method: "MANUAL", status: { in: ["PENDING", "PROCESSING"] } },
    }),
    prisma.issueReport.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.resellerRequest.count({
      where: { status: "PENDING" },
    }),
    prisma.developerSettlementDay.count({
      where: { status: "PENDING" },
    }),
    prisma.order.count({
      where: { status: "PENDING" },
    }),
  ]);

  const adminBadges: AdminSidebarBadges = {
    pendingDeposits: deposits,
    openReports,
    pendingSellers,
    pendingDevSettlements,
    pendingOrders,
  };

  return { orders, keys, deposits, adminBadges };
}
