import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Fingerprint of everything the admin panel renders. The admin shell polls it
 * and refreshes the open page (and nav badges) when it moves, so new orders,
 * deposits, reports, signups and edits from other admins show up on their own.
 */

const TTL_MS = 2000;
const g = globalThis as unknown as { adminLiveStamp?: { at: number; value: string } };

type Row = { updatedAt?: Date | null; createdAt?: Date | null } | null;
const ts = (r: Row) => (r ? (r.updatedAt ?? r.createdAt)?.getTime() ?? 0 : 0);
const upd = { orderBy: { updatedAt: "desc" as const }, select: { updatedAt: true } };
const crt = { orderBy: { createdAt: "desc" as const }, select: { createdAt: true } };

export async function getAdminLiveStamp(): Promise<string> {
  const hit = g.adminLiveStamp;
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const [latest, counts] = await Promise.all([
    Promise.all([
      prisma.order.findFirst(upd),
      prisma.deposit.findFirst(upd),
      prisma.issueReport.findFirst(upd),
      prisma.resellerRequest.findFirst(upd),
      prisma.supportTicket.findFirst(upd),
      prisma.user.findFirst(upd),
      prisma.key.findFirst(upd),
      prisma.product.findFirst(upd),
      prisma.duration.findFirst(upd),
      prisma.durationPrice.findFirst(upd),
      prisma.developerSettlementDay.findFirst(upd),
      prisma.appSetting.findFirst(upd),
      prisma.banner.findFirst(upd),
      prisma.flashSale.findFirst(upd),
      prisma.promoCode.findFirst(upd),
      prisma.spinPrize.findFirst(upd),
      prisma.staticPage.findFirst(upd),
      prisma.transaction.findFirst(crt),
      prisma.activityLog.findFirst(crt),
    ]),
    Promise.all([prisma.order.count(), prisma.user.count(), prisma.key.count(), prisma.deposit.count()]),
  ]);
  const value = createHash("sha1")
    .update(`${latest.map(ts).join(".")}|${counts.join(".")}`)
    .digest("base64url")
    .slice(0, 16);
  g.adminLiveStamp = { at: Date.now(), value };
  return value;
}
