import { prisma } from "@/lib/prisma";
import { maskUsername } from "@/lib/username";
import type { LeaderboardEntry, LeaderboardPayload } from "@/types/leaderboard";
import { OrderStatus } from "@prisma/client";

const SPEND_STATUSES: OrderStatus[] = [
  OrderStatus.FULFILLED,
  OrderStatus.PAID,
];

/**
 * Top customers by sum of fulfilled/paid order totals (USD microcents).
 * Excludes banned users and guest orders (no userId).
 * `keyCount` is total OrderItems (keys purchased), not order rows.
 * Usernames are masked for public display (`user****me`); viewer keeps full handle.
 */
export async function getLeaderboard(
  viewerId: string | null,
  limit = 25,
): Promise<LeaderboardPayload> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: SPEND_STATUSES },
        userId: { isSet: true },
      },
      select: {
        userId: true,
        total: true,
        _count: { select: { items: true } },
      },
    });

    type Agg = { totalSpent: number; keyCount: number };
    const byUser = new Map<string, Agg>();
    for (const o of orders) {
      if (!o.userId) continue;
      const prev = byUser.get(o.userId) ?? { totalSpent: 0, keyCount: 0 };
      prev.totalSpent += o.total ?? 0;
      prev.keyCount += o._count.items;
      byUser.set(o.userId, prev);
    }

    const withUser = [...byUser.entries()].sort(
      (a, b) => b[1].totalSpent - a[1].totalSpent,
    );
    if (withUser.length === 0) {
      return { entries: [], viewer: null };
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: withUser.map(([userId]) => userId) },
        banned: false,
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        isPremium: true,
        emailVerified: true,
        emojiStatus: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const ranked: LeaderboardEntry[] = [];
    let rank = 0;
    for (const [userId, agg] of withUser) {
      const user = userMap.get(userId);
      if (!user) continue;
      rank += 1;
      const isViewer = viewerId != null && user.id === viewerId;
      ranked.push({
        rank,
        userId: user.id,
        username: isViewer ? user.username : maskUsername(user.username),
        name: user.name,
        avatarUrl: user.avatarUrl,
        totalSpent: agg.totalSpent,
        keyCount: agg.keyCount,
        isPremium: user.isPremium ?? false,
        emailVerified: user.emailVerified ?? false,
        emojiStatus: user.emojiStatus?.trim() || null,
      });
    }

    const entries = ranked.slice(0, Math.max(1, limit));
    const viewer =
      viewerId != null
        ? (ranked.find((e) => e.userId === viewerId) ?? null)
        : null;

    return { entries, viewer };
  } catch (error) {
    console.warn("LEADERBOARD_LOAD_FAILED", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { entries: [], viewer: null };
  }
}
