import { hashPassword } from "@/lib/auth/customer";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import { isReservedProfileUsername } from "@/lib/profile";
import { ensureReferralCode, generateReferralCodeCandidate } from "@/lib/referral-code";
import { getResellerCreateMinFundingUsd } from "@/lib/settings";
import { notifyUser } from "@/lib/notifications";
import { adjustWallet, transferWallet } from "@/lib/wallet";
import { notifyTelegram } from "@/lib/telegram-notify";
import { TransactionType, UserRole } from "@prisma/client";

export function sellerHasSellerPanel(user: {
  role: UserRole | string;
  canCreateResellers?: boolean;
  canManageResellers?: boolean;
  canFundResellers?: boolean;
}) {
  return (
    user.role === UserRole.SELLER &&
    Boolean(
      user.canCreateResellers ||
        user.canManageResellers ||
        user.canFundResellers,
    )
  );
}

/** All three reseller caps together = the admin "Reseller system" gate (on by default for sellers). */
export const RESELLER_GATE_ON = {
  canCreateResellers: true,
  canManageResellers: true,
  canFundResellers: true,
} as const;
export const RESELLER_GATE_OFF = {
  canCreateResellers: false,
  canManageResellers: false,
  canFundResellers: false,
} as const;

/**
 * Independent reseller = admin turned on self-deposit for them. From then on the
 * seller can't delete/suspend them and can only reclaim what the seller funded.
 */
export function isIndependentReseller(user: { role: UserRole | string; depositsEnabled?: boolean | null }) {
  return user.role === UserRole.RESELLER && user.depositsEnabled === true;
}

const SELLER_IN = ["reseller:", "reseller-credit:"];
const SELLER_OUT = "reseller-cut:";

/**
 * How much of each reseller's wallet still came from their seller. Replays the
 * ledger: seller transfers fill the seller bucket, everything else credited
 * (deposits, refunds, rewards) fills the reseller's own bucket, and spending
 * drains the seller bucket first so the reseller's own money stays protected.
 */
export async function getSellerFundedBalances(resellers: { id: string; walletBalance: number }[]) {
  const out = new Map<string, number>();
  if (!resellers.length) return out;
  const txs = await prisma.transaction.findMany({
    where: { userId: { in: resellers.map((r) => r.id) }, status: "COMPLETED" },
    orderBy: { createdAt: "asc" },
    select: { userId: true, amount: true, reference: true },
  });
  const bucket = new Map<string, { seller: number; own: number }>();
  for (const t of txs) {
    const b = bucket.get(t.userId) ?? { seller: 0, own: 0 };
    const ref = t.reference ?? "";
    if (t.amount > 0) {
      // Reclaim rollbacks (reseller-cut: credit) give seller money back to the seller bucket.
      if (SELLER_IN.some((p) => ref.startsWith(p)) || ref.startsWith(SELLER_OUT)) b.seller += t.amount;
      else b.own += t.amount;
    } else if (ref.startsWith(SELLER_OUT)) {
      b.seller = Math.max(0, b.seller + t.amount);
    } else {
      const spend = -t.amount;
      const fromSeller = Math.min(b.seller, spend);
      b.seller -= fromSeller;
      b.own = Math.max(0, b.own - (spend - fromSeller));
    }
    bucket.set(t.userId, b);
  }
  for (const r of resellers) {
    out.set(r.id, Math.max(0, Math.min(r.walletBalance, Math.round(bucket.get(r.id)?.seller ?? 0))));
  }
  return out;
}

/** Max the seller may pull back right now: all of it, or only seller-funded money once independent. */
async function reclaimableFrom(reseller: { id: string; walletBalance: number; role: UserRole; depositsEnabled: boolean }) {
  if (!isIndependentReseller(reseller)) return reseller.walletBalance;
  return (await getSellerFundedBalances([reseller])).get(reseller.id) ?? 0;
}

async function requireOwnReseller(sellerId: string, resellerId: string) {
  const reseller = await prisma.user.findUnique({ where: { id: resellerId } });
  if (
    !reseller ||
    reseller.role !== UserRole.RESELLER ||
    reseller.referredById !== sellerId
  ) {
    throw new Error("NOT_FOUND");
  }
  return reseller;
}

export async function createReseller(input: {
  creatorId: string;
  /** When true, fund via ADMIN_ADJUSTMENT instead of transfer. */
  adminFunded: boolean;
  name?: string;
  username: string;
  email: string;
  password: string;
  /** USD decimal — must meet Settings `reseller_create_min_funding`. */
  initialUsd: number;
}) {
  const minUsd = await getResellerCreateMinFundingUsd();
  if (input.initialUsd < minUsd) throw new Error("MIN_BALANCE");

  const creator = await prisma.user.findUnique({ where: { id: input.creatorId } });
  if (!creator) throw new Error("CREATOR_NOT_FOUND");
  if (!input.adminFunded) {
    if (creator.role !== UserRole.SELLER || !creator.canCreateResellers) {
      throw new Error("FORBIDDEN");
    }
  } else if (creator.role !== UserRole.ADMIN) {
    throw new Error("FORBIDDEN");
  }

  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(username) || isReservedProfileUsername(username)) {
    throw new Error("INVALID_USERNAME");
  }
  if (!email.includes("@")) throw new Error("INVALID_EMAIL");
  if (input.password.length < 6) throw new Error("WEAK_PASSWORD");

  const clash = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  });
  if (clash) throw new Error("USERNAME_OR_EMAIL_TAKEN");

  const passwordHash = await hashPassword(input.password);
  let referralCode = generateReferralCodeCandidate();
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.user.findFirst({
      where: { referralCode },
      select: { id: true },
    });
    if (!exists) break;
    referralCode = generateReferralCodeCandidate();
  }

  const user = await prisma.user.create({
    data: {
      name: (input.name?.trim() || username).slice(0, 80),
      username,
      email,
      passwordHash,
      role: UserRole.RESELLER,
      referredById: creator.id,
      referralCode,
      walletBalance: 0,
      emailVerified: false,
      // Resellers fund via seller — self-serve deposit off until admin enables.
      depositsEnabled: false,
    },
  });

  await ensureReferralCode(creator.id);
  const microcents = usdToMicrocents(input.initialUsd);
  try {
    if (input.adminFunded) {
      await adjustWallet({
        userId: user.id,
        amount: microcents,
        type: TransactionType.ADMIN_ADJUSTMENT,
        note: "Admin created reseller funding",
        reference: `reseller:${user.id}`,
      });
    } else {
      await transferWallet({
        fromUserId: creator.id,
        toUserId: user.id,
        amount: microcents,
        note: "Reseller create funding",
        reference: `reseller:${user.id}`,
      });
    }
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    throw error;
  }

  void notifyTelegram(
    "subReseller",
    [
      "👤 Sub-reseller created",
      `Reseller: @${user.username} (${user.email})`,
      `Creator: @${creator.username} (${creator.role})`,
      `Funding: ${formatMoney(microcents)}`,
      `Admin funded: ${input.adminFunded ? "yes" : "no"}`,
      `ID: ${user.id}`,
    ].join("\n"),
  );

  return user;
}

export async function creditOwnReseller(input: {
  sellerId: string;
  resellerId: string;
  /** Signed USD decimal: positive adds, negative reclaims. */
  amountUsd: number;
}) {
  if (input.amountUsd === 0) throw new Error("AMOUNT_ZERO");
  const seller = await prisma.user.findUnique({ where: { id: input.sellerId } });
  if (!seller || seller.role !== UserRole.SELLER || !seller.canFundResellers) {
    throw new Error("FORBIDDEN");
  }
  const reseller = await requireOwnReseller(input.sellerId, input.resellerId);
  const amount = usdToMicrocents(Math.abs(input.amountUsd));
  if (input.amountUsd < 0 && amount > (await reclaimableFrom(reseller)) + 1_000_000) {
    throw new Error(isIndependentReseller(reseller) ? "RECLAIM_OWN_FUNDS" : "INSUFFICIENT_BALANCE");
  }
  await transferWallet(
    input.amountUsd > 0
      ? {
          fromUserId: input.sellerId,
          toUserId: input.resellerId,
          amount,
          note: "Seller credit to reseller",
          reference: `reseller-credit:${input.resellerId}`,
        }
      : {
          fromUserId: input.resellerId,
          toUserId: input.sellerId,
          amount,
          note: "Seller reclaim from reseller",
          reference: `reseller-cut:${input.resellerId}`,
        },
  );
  void notifyUser({
    userId: input.resellerId,
    type: input.amountUsd > 0 ? "wallet_credit" : "wallet_debit",
    title: input.amountUsd > 0 ? `${formatMoney(amount)} added by @${seller.username}` : `${formatMoney(amount)} reclaimed by @${seller.username}`,
    message: input.amountUsd > 0 ? "Your seller topped up your wallet." : "Your seller moved balance back from your wallet.",
    actionUrl: "/app/history",
  }).catch(() => {});
}

export async function setOwnResellerBanned(input: {
  sellerId: string;
  resellerId: string;
  banned: boolean;
}) {
  const seller = await prisma.user.findUnique({ where: { id: input.sellerId } });
  if (!seller || seller.role !== UserRole.SELLER || !seller.canManageResellers) {
    throw new Error("FORBIDDEN");
  }
  const reseller = await requireOwnReseller(input.sellerId, input.resellerId);
  if (isIndependentReseller(reseller)) throw new Error("INDEPENDENT");
  const updated = await prisma.user.update({
    where: { id: input.resellerId },
    data: {
      banned: input.banned,
      ...(input.banned ? {} : { banReason: null }),
    },
    select: {
      id: true, name: true, username: true, email: true, walletBalance: true,
      banned: true, createdAt: true,
    },
  });
  if (input.banned) {
    const { revokeUserApiKeysOnBan } = await import("@/lib/admin-users");
    await revokeUserApiKeysOnBan(input.resellerId).catch(() => 0);
  }
  return updated;
}

/** Soft-deletes a reseller and reclaims its remaining wallet balance. */
export async function deleteOwnReseller(input: {
  sellerId: string;
  resellerId: string;
}) {
  const seller = await prisma.user.findUnique({ where: { id: input.sellerId } });
  if (!seller || seller.role !== UserRole.SELLER || !seller.canManageResellers) {
    throw new Error("FORBIDDEN");
  }
  const reseller = await requireOwnReseller(input.sellerId, input.resellerId);
  if (isIndependentReseller(reseller)) throw new Error("INDEPENDENT");
  if (reseller.walletBalance > 0) {
    await transferWallet({
      fromUserId: reseller.id,
      toUserId: input.sellerId,
      amount: Math.round(reseller.walletBalance),
      note: "Reclaim balance on reseller delete",
      reference: `reseller-delete:${reseller.id}`,
    });
  }
  const stamp = reseller.id.slice(-8);
  await prisma.user.update({
    where: { id: reseller.id },
    data: {
      banned: true, banReason: "Soft-deleted", name: "Deleted", username: `del_${stamp}`,
      email: `del_${stamp}@deleted.local`, passwordHash: null, googleId: null,
      twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [],
      avatarUrl: null, referralCode: null, apiEnabled: false, depositsEnabled: false,
    },
  });
  const { revokeUserApiKeysOnBan } = await import("@/lib/admin-users");
  await revokeUserApiKeysOnBan(reseller.id).catch(() => 0);
  await prisma.notification.deleteMany({ where: { userId: reseller.id } }).catch(() => undefined);
}
