import { formatMoney } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import { ensureReferralCode } from "@/lib/referral-code";
import { normalizeReferralCode } from "@/lib/referral-utils";
import {
  getReferralPercent,
  getResellerPurchasePercent,
  getSellerPurchasePercent,
} from "@/lib/settings";
import { getSiteConfig } from "@/lib/site-config";
import type {
  ReferralDashboard,
  ReferralNetworkItem,
  ReferralRewardItem,
  ReferralWeeklyEntry,
} from "@/types/referral";
import { OrderStatus, TransactionType } from "@prisma/client";

export { normalizeReferralCode } from "@/lib/referral-utils";

const PAID_STATUSES: OrderStatus[] = [OrderStatus.PAID, OrderStatus.FULFILLED];

/** Resolve an active referrer by code. Returns null if missing/banned. */
export async function resolveReferrerByCode(rawCode?: string | null) {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;

  return prisma.user.findFirst({
    where: { referralCode: code, banned: false },
    select: { id: true, username: true, referralCode: true },
  });
}

function getWeekStartUtc(date = new Date()) {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = start.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - diff);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export async function getReferralDashboard(
  userId: string,
): Promise<ReferralDashboard> {
  const referralCode = await ensureReferralCode(userId);
  const weekStart = getWeekStartUtc();

  const [
    user,
    referralCount,
    referrals,
    earningLogs,
    rewardAgg,
    orderAgg,
    userPercent,
    sellerPercent,
    resellerPercent,
    weeklyRewardLogs,
    siteConfig,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { username: true },
    }),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        orders: {
          where: { status: { in: PAID_STATUSES } },
          select: { id: true, total: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.transaction.findMany({
      where: { userId, type: TransactionType.REFERRAL_REWARD },
      select: {
        id: true,
        amount: true,
        note: true,
        reference: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.transaction.aggregate({
      where: { userId, type: TransactionType.REFERRAL_REWARD },
      _sum: { amount: true },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: PAID_STATUSES },
        user: { referredById: userId },
      },
      _count: { _all: true },
      _sum: { total: true },
    }),
    getReferralPercent(),
    getSellerPurchasePercent(),
    getResellerPurchasePercent(),
    prisma.transaction.findMany({
      where: {
        type: TransactionType.REFERRAL_REWARD,
        createdAt: { gte: weekStart },
      },
      select: {
        userId: true,
        amount: true,
        user: { select: { username: true } },
      },
      take: 500,
    }),
    getSiteConfig(),
  ]);

  const network: ReferralNetworkItem[] = referrals.map((item) => ({
    id: item.id,
    username: item.username,
    name: item.name || "New recruit",
    role: item.role,
    orderCount: item.orders.length,
    totalSpend: item.orders.reduce((sum, o) => sum + o.total, 0),
    createdAt: item.createdAt.toISOString(),
  }));

  const rewards: ReferralRewardItem[] = earningLogs.map((log) => ({
    id: log.id,
    amount: log.amount,
    note: log.note,
    reference: log.reference,
    createdAt: log.createdAt.toISOString(),
  }));

  const referralSales = Math.max(0, orderAgg._sum.total ?? 0);
  const orderCount = orderAgg._count._all;
  const rewardTotal = Math.max(0, rewardAgg._sum.amount ?? 0);

  const weeklyMap = new Map<
    string,
    { userId: string; username: string; amount: number; rewardCount: number }
  >();
  for (const log of weeklyRewardLogs) {
    const current = weeklyMap.get(log.userId) ?? {
      userId: log.userId,
      username: log.user.username,
      amount: 0,
      rewardCount: 0,
    };
    current.amount += Math.max(0, log.amount);
    current.rewardCount += 1;
    weeklyMap.set(log.userId, current);
  }

  const weeklyLeaderboard: ReferralWeeklyEntry[] = Array.from(weeklyMap.values())
    .sort(
      (a, b) =>
        b.amount - a.amount || b.rewardCount - a.rewardCount,
    )
    .slice(0, 10)
    .map((item, index) => ({
      userId: item.userId,
      username: item.username,
      amount: item.amount,
      rewardCount: item.rewardCount,
      rank: index + 1,
      isCurrentUser: item.userId === userId,
    }));

  return {
    username: user.username,
    referralCode,
    stats: {
      referralCount,
      orderCount,
      referralSales,
      rewardTotal,
      /** Prefer commissionRates — kept for older UI reads */
      commissionPercent: userPercent,
      commissionRates: {
        user: userPercent,
        seller: sellerPercent,
        reseller: resellerPercent,
      },
    },
    network,
    rewards,
    weeklyLeaderboard,
    siteName: siteConfig.siteName,
  };
}

export function formatReferralMoney(amount: number): string {
  return formatMoney(amount);
}
