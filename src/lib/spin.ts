import { randomBytes, randomInt } from "crypto";
import { claimKey, countAvailableKeysByDuration, releaseKeysForOrder } from "@/lib/keys";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getSettingInt, upsertSetting } from "@/lib/settings";
import { adjustWallet } from "@/lib/wallet";
import { claimOnce, releaseIdempotency } from "@/lib/idempotency";
import { Currency, formatMoney } from "@/lib/currencies";
import { OrderStatus, TransactionType } from "@prisma/client";

export const SPIN_MIN_SLOTS = 1;
export const SPIN_MAX_SLOTS = 8;
const DEFAULT_SLOTS = 6;
export const SPIN_ENABLED_KEY = "referral_spin_enabled";
export const SPIN_WIN_PCT_KEY = "referral_spin_win_pct";
export const DEFAULT_WIN_PCT = 30;
export const DEFAULT_LOSE_LABEL = "Better luck next time";

export type SpinKind = "KEY" | "WALLET" | "COUPON" | "SPIN" | "NONE";
export const SPIN_KINDS: SpinKind[] = ["KEY", "WALLET", "COUPON", "SPIN", "NONE"];

export type SpinPrizeAdmin = {
  id: string;
  slot: number;
  kind: SpinKind;
  label: string;
  durationId: string | null;
  durationName: string | null;
  quantity: number;
  walletAmount: number;
  couponPercent: number;
  couponAmount: number;
  couponDays: number;
  weight: number;
  active: boolean;
  /** Available local keys for the linked duration (KEY only). */
  stock: number | null;
};

export type SpinPrizePublic = { slot: number; kind: SpinKind; label: string; quantity: number };

export type SpinHistoryItem = {
  id: string;
  prizeKind: string | null;
  prizeLabel: string | null;
  quantity: number | null;
  walletAmount: number | null;
  /** Prize order for KEY wins; opens the reveal page. */
  orderId: string | null;
  couponCode: string | null;
  friend: string | null;
  usedAt: string | null;
  createdAt: string;
};

export type SpinState = {
  enabled: boolean;
  prizes: SpinPrizePublic[];
  available: number;
  history: SpinHistoryItem[];
};

export type SpinOutcome = {
  slot: number;
  kind: SpinKind;
  label: string;
  /** Keys (KEY) or extra spins (SPIN) granted. */
  quantity: number;
  walletAmount: number;
  orderId: string | null;
  couponCode: string | null;
  couponExpiresAt: string | null;
  remaining: number;
};

/** Seed a default wheel only when none exists; admins may later shrink it to 1 slot. */
export async function ensureSpinPrizes() {
  if ((await prisma.spinPrize.count()) > 0) return;
  for (let slot = 0; slot < DEFAULT_SLOTS; slot++) {
    await prisma.spinPrize.create({ data: { slot, kind: "NONE", label: DEFAULT_LOSE_LABEL, weight: 10 } }).catch(() => {});
  }
}

export async function isSpinEnabled(): Promise<boolean> {
  return (await getSettingInt(SPIN_ENABLED_KEY, 1)) === 1;
}

export async function setSpinEnabled(on: boolean) {
  await upsertSetting({ key: SPIN_ENABLED_KEY, intValue: on ? 1 : 0 });
}

/** Overall chance (0-100) that a spin lands on a reward slot. */
export async function getSpinWinPct(): Promise<number> {
  return Math.min(100, Math.max(0, await getSettingInt(SPIN_WIN_PCT_KEY, DEFAULT_WIN_PCT)));
}

export async function setSpinWinPct(pct: number) {
  await upsertSetting({ key: SPIN_WIN_PCT_KEY, intValue: Math.min(100, Math.max(0, Math.round(pct))) });
}

/** True when at least one slot can actually pay out. */
function hasRewardSlot(prizes: { kind: string; active: boolean; weight: number }[]) {
  return prizes.some((p) => p.active && p.weight > 0 && p.kind !== "NONE");
}

export async function listPrizesAdmin(): Promise<SpinPrizeAdmin[]> {
  await ensureSpinPrizes();
  const rows = await prisma.spinPrize.findMany({ orderBy: { slot: "asc" } });
  const ids = rows.map((r) => r.durationId).filter((x): x is string => !!x);
  const [durations, stock] = await Promise.all([
    ids.length
      ? prisma.duration.findMany({ where: { id: { in: ids } }, include: { product: { select: { title: true } } } })
      : Promise.resolve([]),
    countAvailableKeysByDuration(ids),
  ]);
  const byId = new Map(durations.map((d) => [d.id, d]));
  return rows.map((r) => {
    const d = r.durationId ? byId.get(r.durationId) : undefined;
    return {
      id: r.id,
      slot: r.slot,
      kind: r.kind as SpinKind,
      label: r.label,
      durationId: r.durationId,
      durationName: d ? `${d.product.title} — ${d.label}` : null,
      quantity: r.quantity,
      walletAmount: r.walletAmount,
      couponPercent: r.couponPercent,
      couponAmount: r.couponAmount,
      couponDays: r.couponDays,
      weight: r.weight,
      active: r.active,
      stock: r.kind === "KEY" && r.durationId ? (stock.get(r.durationId) ?? 0) : null,
    };
  });
}

export type DurationOption = { id: string; productId: string; productTitle: string; label: string; stock: number };

export async function listDurationOptions(): Promise<DurationOption[]> {
  const durations = await prisma.duration.findMany({
    include: { product: { select: { title: true } } },
    orderBy: [{ productId: "asc" }, { createdAt: "asc" }],
  });
  const stock = await countAvailableKeysByDuration(durations.map((d) => d.id));
  return durations.map((d) => ({
    id: d.id,
    productId: d.productId,
    productTitle: d.product.title,
    label: d.label,
    stock: stock.get(d.id) ?? 0,
  }));
}

export async function getSpinState(userId: string): Promise<SpinState> {
  await ensureSpinPrizes();
  const [enabled, prizes, available, spins] = await Promise.all([
    isSpinEnabled(),
    prisma.spinPrize.findMany({ orderBy: { slot: "asc" } }),
    prisma.referralSpin.count({ where: { userId, status: "AVAILABLE" } }),
    prisma.referralSpin.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const friendIds = spins.map((s) => s.referredUserId).filter((x): x is string => !!x);
  const friends = friendIds.length
    ? await prisma.user.findMany({ where: { id: { in: friendIds } }, select: { id: true, username: true } })
    : [];
  const friendName = new Map(friends.map((f) => [f.id, f.username]));
  return {
    enabled: enabled && hasRewardSlot(prizes),
    prizes: prizes.map((p) => ({ slot: p.slot, kind: p.kind as SpinKind, label: p.label, quantity: p.quantity })),
    available,
    history: spins.map((s) => ({
      id: s.id,
      prizeKind: s.prizeKind,
      prizeLabel: s.prizeLabel,
      quantity: s.quantity,
      walletAmount: s.walletAmount,
      orderId: s.prizeOrderId,
      couponCode: s.couponCode,
      friend: s.referredUserId ? (friendName.get(s.referredUserId) ?? null) : null,
      usedAt: s.usedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

/** Sidebar/store badge: number of unspent spins. */
export async function countAvailableSpins(userId: string): Promise<number> {
  return prisma.referralSpin.count({ where: { userId, status: "AVAILABLE" } });
}

/** Totals for the referral page header. */
export async function getSpinTotals(userId: string) {
  const [earned, won] = await Promise.all([
    prisma.referralSpin.count({ where: { userId, source: "REFERRAL" } }),
    prisma.referralSpin.count({ where: { userId, status: "USED", prizeKind: { notIn: ["NONE"] } } }),
  ]);
  return { earned, won };
}

/** Friend ids (of this referrer) that already earned them a spin. */
export async function spinEarnedFriendIds(userId: string, friendIds: string[]): Promise<Set<string>> {
  if (!friendIds.length) return new Set();
  const rows = await prisma.referralSpin.findMany({
    where: { userId, source: "REFERRAL", referredUserId: { in: friendIds } },
    select: { referredUserId: true },
  });
  return new Set(rows.map((r) => r.referredUserId).filter((x): x is string => !!x));
}

/**
 * Grant the referrer one spin when a referred friend's first wallet deposit is credited.
 * Idempotent: one spin per referred friend. Best-effort; never throws.
 */
export async function grantSpinForDeposit(input: { userId: string; depositId: string }) {
  try {
    const friend = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, username: true, referredById: true },
    });
    if (!friend?.referredById) return;
    const parent = await prisma.user.findUnique({ where: { id: friend.referredById }, select: { id: true, banned: true } });
    if (!parent || parent.banned) return;
    if (!(await isSpinEnabled())) return;
    if (!hasRewardSlot(await prisma.spinPrize.findMany())) return;

    const already = await prisma.referralSpin.findFirst({
      where: { source: "REFERRAL", referredUserId: friend.id },
      select: { id: true },
    });
    if (already) return;

    // Atomic once-per-friend claim: two deposits completing at the same instant can't both pay out.
    if (!(await claimOnce("spin-grant", friend.id, 3650 * 86_400_000))) return;
    try {
      await prisma.referralSpin.create({
        data: { userId: parent.id, source: "REFERRAL", referredUserId: friend.id, depositId: input.depositId },
      });
    } catch (e) {
      await releaseIdempotency("spin-grant", friend.id).catch(() => undefined);
      throw e;
    }

    void notifyUser({
      userId: parent.id,
      type: "referral_spin",
      title: "You earned a free spin",
      message: `@${friend.username} made their first deposit. Spin the wheel to win keys, wallet credit and more.`,
      actionUrl: "/app/referral",
    }).catch(() => {});
  } catch {
    // never fail a deposit
  }
}

type Candidate = {
  id: string;
  slot: number;
  kind: SpinKind;
  label: string;
  durationId: string | null;
  quantity: number;
  walletAmount: number;
  couponPercent: number;
  couponAmount: number;
  couponDays: number;
  weight: number;
};

function pickWeighted(list: Candidate[]): Candidate {
  const total = list.reduce((s, c) => s + c.weight, 0);
  let r = randomInt(0, total);
  for (const c of list) {
    if (r < c.weight) return c;
    r -= c.weight;
  }
  return list[list.length - 1];
}

export class SpinError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

async function deliverKeys(input: { userId: string; email: string; prize: Candidate }): Promise<string> {
  const { prize } = input;
  const duration = await prisma.duration.findUnique({
    where: { id: prize.durationId! },
    include: { product: { select: { title: true } } },
  });
  if (!duration) throw new SpinError("UNAVAILABLE", "Prize is unavailable right now. Please try again.");

  const order = await prisma.order.create({
    data: {
      userId: input.userId,
      buyerEmail: input.email,
      status: OrderStatus.PENDING,
      total: 0,
      currency: Currency.USD,
      accessToken: randomBytes(24).toString("hex"),
    },
  });

  try {
    for (let i = 0; i < prize.quantity; i++) {
      const key = await claimKey(duration.id, order.id);
      if (!key) throw new SpinError("UNAVAILABLE", "Prize ran out of stock. Please spin again.");
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          durationId: duration.id,
          keyId: key.id,
          productTitle: duration.product.title,
          durationLabel: duration.label,
          unitPrice: 0,
        },
      });
    }
    await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.FULFILLED } });
    return order.id;
  } catch (e) {
    await releaseKeysForOrder(order.id).catch(() => {});
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } }).catch(() => {});
    await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.FAILED } }).catch(() => {});
    throw e;
  }
}

/** One-time promo code (1 redemption, this user only knows it). */
async function deliverCoupon(input: { username: string; prize: Candidate }) {
  const { prize } = input;
  const expiresAt = new Date(Date.now() + Math.max(1, prize.couponDays) * 86_400_000);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `SPIN${randomBytes(4).toString("hex").toUpperCase()}`;
    try {
      await prisma.promoCode.create({
        data: {
          code,
          description: `Spin reward for @${input.username}`,
          discountPercent: prize.couponPercent > 0 ? prize.couponPercent : 0,
          discountAmount: prize.couponPercent > 0 ? 0 : prize.couponAmount,
          maxRedemptions: 1,
          perUserLimit: 1,
          expiresAt,
        },
      });
      return { code, expiresAt };
    } catch {
      // code collision: retry
    }
  }
  throw new SpinError("FAILED", "Could not create your coupon. Your spin was not used.");
}

export function couponText(p: { couponPercent: number; couponAmount: number }) {
  return p.couponPercent > 0 ? `${p.couponPercent}% off` : `${formatMoney(p.couponAmount)} off`;
}

export async function performSpin(userId: string): Promise<SpinOutcome> {
  if (!(await isSpinEnabled())) throw new SpinError("DISABLED", "Spin wheel is not active right now.");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, banned: true },
  });
  if (!user || user.banned) throw new SpinError("FORBIDDEN", "Account cannot spin.");

  await ensureSpinPrizes();
  const rows = await prisma.spinPrize.findMany({ where: { active: true, weight: { gt: 0 } }, orderBy: { slot: "asc" } });
  const durationIds = rows.map((r) => r.durationId).filter((x): x is string => !!x);
  const stock = await countAvailableKeysByDuration(durationIds);

  const candidates: Candidate[] = rows
    .filter((r) => {
      if (r.kind === "KEY") return !!r.durationId && r.quantity > 0 && (stock.get(r.durationId) ?? 0) >= r.quantity;
      if (r.kind === "WALLET") return r.walletAmount > 0;
      if (r.kind === "COUPON") return r.couponPercent > 0 || r.couponAmount > 0;
      if (r.kind === "SPIN") return r.quantity > 0;
      return true;
    })
    .map((r) => ({
      id: r.id,
      slot: r.slot,
      kind: r.kind as SpinKind,
      label: r.label,
      durationId: r.durationId,
      quantity: r.quantity,
      walletAmount: r.walletAmount,
      couponPercent: r.couponPercent,
      couponAmount: r.couponAmount,
      couponDays: r.couponDays,
      weight: r.weight,
    }));
  if (candidates.length === 0) throw new SpinError("DISABLED", "Spin wheel is not active right now.");

  // Two-step draw: first win vs lose at the configured odds, then a slot by weight inside that group.
  // If a group is empty (no "No prize" slot, or every reward out of stock) the other group is used.
  const wins = candidates.filter((c) => c.kind !== "NONE");
  const loses = candidates.filter((c) => c.kind === "NONE");
  const winPct = await getSpinWinPct();
  const rollWin = randomInt(0, 10000) < winPct * 100;
  const prize = pickWeighted(rollWin ? (wins.length ? wins : loses) : loses.length ? loses : wins);

  // Atomically consume exactly one available spin.
  const spin = await prisma.referralSpin.findFirst({ where: { userId, status: "AVAILABLE" }, orderBy: { createdAt: "asc" } });
  if (!spin) throw new SpinError("NO_SPINS", "You have no spins left.");
  const claimed = await prisma.referralSpin.updateMany({
    where: { id: spin.id, status: "AVAILABLE" },
    data: {
      status: "USED",
      usedAt: new Date(),
      prizeSlot: prize.slot,
      prizeKind: prize.kind,
      prizeLabel: prize.label,
      quantity: prize.kind === "KEY" || prize.kind === "SPIN" ? prize.quantity : null,
      walletAmount: prize.kind === "WALLET" ? prize.walletAmount : null,
    },
  });
  if (claimed.count === 0) throw new SpinError("NO_SPINS", "You have no spins left.");

  let orderId: string | null = null;
  let coupon: { code: string; expiresAt: Date } | null = null;
  try {
    if (prize.kind === "KEY") {
      orderId = await deliverKeys({ userId, email: user.email, prize });
      await prisma.referralSpin.update({ where: { id: spin.id }, data: { prizeOrderId: orderId } });
    } else if (prize.kind === "WALLET") {
      await adjustWallet({
        userId,
        amount: Math.round(prize.walletAmount),
        type: TransactionType.GIFT_CODE,
        note: `Referral spin: ${prize.label}`,
        reference: spin.id,
      });
    } else if (prize.kind === "COUPON") {
      coupon = await deliverCoupon({ username: user.username, prize });
      await prisma.referralSpin.update({ where: { id: spin.id }, data: { couponCode: coupon.code } });
    } else if (prize.kind === "SPIN") {
      await prisma.referralSpin.createMany({
        data: Array.from({ length: prize.quantity }, () => ({ userId, source: "BONUS" })),
      });
    }
  } catch (e) {
    // Give the spin back if delivery failed.
    await prisma.referralSpin.update({
      where: { id: spin.id },
      data: { status: "AVAILABLE", usedAt: null, prizeSlot: null, prizeKind: null, prizeLabel: null, quantity: null, walletAmount: null },
    });
    if (e instanceof SpinError) throw e;
    throw new SpinError("FAILED", "Could not deliver the prize. Your spin was not used.");
  }

  const remaining = await prisma.referralSpin.count({ where: { userId, status: "AVAILABLE" } });

  if (prize.kind !== "NONE" && prize.kind !== "SPIN") {
    void notifyUser({
      userId,
      type: "referral_spin_win",
      title: "You won on the spin wheel",
      message:
        prize.kind === "KEY"
          ? `You won ${prize.quantity}× ${prize.label}. Tap to reveal your key.`
          : prize.kind === "COUPON"
            ? `You won a ${couponText(prize)} coupon: ${coupon?.code}. Use it at checkout.`
            : `You won ${formatMoney(prize.walletAmount)} wallet credit.`,
      actionUrl: prize.kind === "KEY" && orderId ? `/app/win/${orderId}` : prize.kind === "COUPON" ? "/app/referral" : "/app/history",
    }).catch(() => {});
  }

  return {
    slot: prize.slot,
    kind: prize.kind,
    label: prize.label,
    quantity: prize.kind === "KEY" || prize.kind === "SPIN" ? prize.quantity : 0,
    walletAmount: prize.kind === "WALLET" ? prize.walletAmount : 0,
    orderId,
    couponCode: coupon?.code ?? null,
    couponExpiresAt: coupon?.expiresAt.toISOString() ?? null,
    remaining,
  };
}

/** A KEY prize order owned by this user, with its keys. Null for any other order. */
export async function getSpinPrizeOrder(userId: string, orderId: string) {
  const spin = await prisma.referralSpin.findFirst({
    where: { userId, prizeOrderId: orderId, prizeKind: "KEY" },
    select: { prizeLabel: true, usedAt: true },
  });
  if (!spin) return null;
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: { include: { key: { select: { code: true } } } } },
  });
  if (!order) return null;
  return { spin, order };
}
