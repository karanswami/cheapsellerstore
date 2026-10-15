import { prisma } from "@/lib/prisma";
import { maskUsername } from "@/lib/username";
import { OrderStatus, TransactionType, UserRole } from "@prisma/client";

export type SellerLeaderboardEntry = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  role: UserRole;
  totalCustomers: number;
  referrals: number;
  sales: number;
  balance: number;
  earnings: number;
  emailVerified: boolean;
  emojiStatus: string | null;
};

export async function getSellerLeaderboard(
  limit = 50,
  viewerId?: string | null,
): Promise<SellerLeaderboardEntry[]> {
  const sellers = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.SELLER, UserRole.RESELLER] },
      banned: false,
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      role: true,
      walletBalance: true,
      emailVerified: true,
      emojiStatus: true,
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  if (sellers.length === 0) return [];

  const ids = sellers.map((s) => s.id);

  const [referralCounts, orders, earnings] = await Promise.all([
    prisma.user.groupBy({
      by: ["referredById"],
      where: { referredById: { in: ids } },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["userId"],
      where: {
        userId: { in: ids },
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
      },
      _sum: { total: true },
    }),
    prisma.transaction.groupBy({
      by: ["userId"],
      where: {
        userId: { in: ids },
        type: TransactionType.REFERRAL_REWARD,
        status: "COMPLETED",
      },
      _sum: { amount: true },
    }),
  ]);

  const refMap = new Map(
    referralCounts
      .filter((r) => r.referredById)
      .map((r) => [r.referredById!, r._count._all]),
  );
  const salesMap = new Map(
    orders.map((o) => [o.userId, o._sum.total ?? 0]),
  );
  const earnMap = new Map(
    earnings.map((e) => [e.userId, e._sum.amount ?? 0]),
  );

  const rows: SellerLeaderboardEntry[] = sellers.map((s) => {
    const referrals = refMap.get(s.id) ?? 0;
    const isViewer = viewerId != null && s.id === viewerId;
    return {
      id: s.id,
      name: s.name,
      username: isViewer ? s.username : maskUsername(s.username),
      avatarUrl: s.avatarUrl,
      role: s.role,
      totalCustomers: referrals,
      referrals,
      sales: salesMap.get(s.id) ?? 0,
      balance: s.walletBalance,
      earnings: earnMap.get(s.id) ?? 0,
      emailVerified: s.emailVerified ?? false,
      emojiStatus: s.emojiStatus?.trim() || null,
    };
  });

  rows.sort((a, b) => b.earnings - a.earnings || b.sales - a.sales);
  return rows.slice(0, limit);
}
