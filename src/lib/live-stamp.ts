import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * A cheap fingerprint of everything a customer's /app pages render. The app
 * shell polls it and calls `router.refresh()` when it moves, so balances,
 * orders, deposits, tickets and admin-side edits show up without a reload.
 */

type Stamp = { at: number; value: string };

const USER_TTL_MS = 1500;
const GLOBAL_TTL_MS = 8000;

const g = globalThis as unknown as {
  liveUserStamps?: Map<string, Stamp>;
  liveGlobalStamp?: Stamp;
};
const userStamps = (g.liveUserStamps ??= new Map());

const ts = (row: { updatedAt?: Date | null; createdAt?: Date | null; usedAt?: Date | null } | null) =>
  row ? (row.updatedAt ?? row.usedAt ?? row.createdAt)?.getTime() ?? 0 : 0;

/** Store-wide content (settings, catalog, prices, banners, broadcasts, wheel). */
async function globalStamp(): Promise<string> {
  const hit = g.liveGlobalStamp;
  if (hit && Date.now() - hit.at < GLOBAL_TTL_MS) return hit.value;
  const latest = { orderBy: { updatedAt: "desc" as const }, select: { updatedAt: true } };
  const parts = await Promise.all([
    prisma.appSetting.findFirst(latest),
    prisma.product.findFirst(latest),
    prisma.duration.findFirst(latest),
    prisma.durationPrice.findFirst(latest),
    prisma.broadcast.findFirst(latest),
    prisma.banner.findFirst(latest),
    prisma.flashSale.findFirst(latest),
    prisma.promoCode.findFirst(latest),
    prisma.spinPrize.findFirst(latest),
    prisma.staticPage.findFirst(latest),
  ]);
  const value = parts.map(ts).join(".");
  g.liveGlobalStamp = { at: Date.now(), value };
  return value;
}

/** Rows owned by one customer. */
async function userStamp(userId: string): Promise<string> {
  const hit = userStamps.get(userId);
  if (hit && Date.now() - hit.at < USER_TTL_MS) return hit.value;
  const where = { userId };
  const latest = { where, orderBy: { updatedAt: "desc" as const }, select: { updatedAt: true } };
  const [user, order, deposit, report, reseller, ticket, special, txn, notif, unread, spinsLeft, spin] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { updatedAt: true, walletBalance: true } }),
      prisma.order.findFirst(latest),
      prisma.deposit.findFirst(latest),
      prisma.issueReport.findFirst(latest),
      prisma.resellerRequest.findFirst(latest),
      prisma.supportTicket.findFirst(latest),
      prisma.userSpecialPrice.findFirst(latest),
      prisma.transaction.findFirst({ where, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.notification.findFirst({ where, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.referralSpin.count({ where: { userId, status: "AVAILABLE" } }),
      prisma.referralSpin.findFirst({ where, orderBy: { createdAt: "desc" }, select: { createdAt: true, usedAt: true } }),
    ]);
  const value = [
    ts(user),
    user?.walletBalance ?? 0,
    ...[order, deposit, report, reseller, ticket, special, txn, notif, spin].map(ts),
    unread,
    spinsLeft,
  ].join(".");
  if (userStamps.size > 5000) userStamps.clear();
  userStamps.set(userId, { at: Date.now(), value });
  return value;
}

export async function getLiveStamp(userId: string): Promise<string> {
  const [user, store] = await Promise.all([userStamp(userId), globalStamp()]);
  return createHash("sha1").update(`${user}|${store}`).digest("base64url").slice(0, 16);
}
