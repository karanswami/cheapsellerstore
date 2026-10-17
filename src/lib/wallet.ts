import { prisma } from "@/lib/prisma";
import { Currency } from "@/lib/currencies";
import {
  Prisma,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

/** Sub-cent rounding tolerance (1 cent = 1_000_000 microcents). */
const SUB_CENT_TOLERANCE = 1_000_000;

export async function getWalletBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });
  return user?.walletBalance ?? 0;
}

/** Retry on transient Mongo write conflicts (P2034) so concurrent wallet writes serialise cleanly. */
async function withWriteRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const transient =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!transient) throw e;
      await new Promise((r) => setTimeout(r, 15 * (attempt + 1) + Math.random() * 25));
    }
  }
  throw last;
}

/**
 * Atomic signed balance change. Uses `$inc` style updates guarded by a filter, never
 * "read balance → write absolute value", so concurrent writers can't overwrite each other.
 */
async function applyDelta(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
) {
  if (amount < 0) {
    const debit = -amount;
    const res = await tx.user.updateMany({
      where: { id: userId, walletBalance: { gte: debit - SUB_CENT_TOLERANCE } },
      data: { walletBalance: { decrement: debit } },
    });
    if (res.count === 0) {
      const exists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      throw new Error(exists ? "INSUFFICIENT_BALANCE" : "USER_NOT_FOUND");
    }
    // Sub-cent shortfall is absorbed, never left as a negative balance.
    await tx.user.updateMany({
      where: { id: userId, walletBalance: { lt: 0 } },
      data: { walletBalance: 0 },
    });
    return;
  }
  const res = await tx.user.updateMany({
    where: { id: userId },
    data: { walletBalance: { increment: amount } },
  });
  if (res.count === 0) throw new Error("USER_NOT_FOUND");
}

/** Adjust wallet by signed microcents (USD). Balance change + ledger row commit together. */
export async function adjustWallet(input: {
  userId: string;
  /** Signed microcents. */
  amount: number;
  type: TransactionType;
  note?: string;
  reference?: string;
}) {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw new Error("AMOUNT_ZERO");
  }

  return withWriteRetry(() =>
    prisma.$transaction(async (tx) => {
      await applyDelta(tx, input.userId, input.amount);
      await tx.transaction.create({
        data: {
          userId: input.userId,
          type: input.type,
          status: TransactionStatus.COMPLETED,
          amount: input.amount,
          currency: Currency.USD,
          note: input.note ?? null,
          reference: input.reference ?? null,
        },
      });
      return tx.user.findUniqueOrThrow({ where: { id: input.userId } });
    }),
  );
}

/**
 * Transfer positive microcents between wallets. Debit, credit and both ledger rows are one
 * database transaction: either everything happens or nothing does.
 */
export async function transferWallet(input: {
  fromUserId: string;
  toUserId: string;
  /** Positive microcents. */
  amount: number;
  note?: string;
  reference?: string;
}) {
  const amount = Math.abs(Math.round(input.amount));
  if (!Number.isInteger(amount) || amount === 0) throw new Error("AMOUNT_ZERO");
  if (input.fromUserId === input.toUserId) throw new Error("SAME_USER");

  await withWriteRetry(() =>
    prisma.$transaction(async (tx) => {
      await applyDelta(tx, input.fromUserId, -amount);
      await applyDelta(tx, input.toUserId, amount);
      await tx.transaction.createMany({
        data: [
          {
            userId: input.fromUserId,
            type: TransactionType.ADMIN_ADJUSTMENT,
            status: TransactionStatus.COMPLETED,
            amount: -amount,
            currency: Currency.USD,
            note: input.note ?? "Wallet transfer out",
            reference: input.reference ?? null,
          },
          {
            userId: input.toUserId,
            type: TransactionType.ADMIN_ADJUSTMENT,
            status: TransactionStatus.COMPLETED,
            amount,
            currency: Currency.USD,
            note: input.note ?? "Wallet transfer in",
            reference: input.reference ?? null,
          },
        ],
      });
    }),
  );
}

/** Atomic debit in microcents: only succeeds if balance covers amount. */
export async function debitWalletForPurchase(input: {
  userId: string;
  /** Positive microcents to debit. */
  amount: number;
  orderId: string;
  /** Defaults to checkout; API orders use a distinct note for hub filtering. */
  note?: string;
}) {
  const amount = Math.abs(Math.round(input.amount));
  if (amount === 0) return;
  await withWriteRetry(() =>
    prisma.$transaction(async (tx) => {
      await applyDelta(tx, input.userId, -amount);
      await tx.transaction.create({
        data: {
          userId: input.userId,
          type: TransactionType.PURCHASE,
          status: TransactionStatus.COMPLETED,
          amount: -amount,
          currency: Currency.USD,
          note: input.note ?? "Checkout purchase",
          reference: input.orderId,
        },
      });
    }),
  );
}

/** Give a purchase debit back (order failed after the wallet was charged). Idempotent per order. */
export async function refundWalletForPurchase(input: {
  userId: string;
  amount: number;
  orderId: string;
  note?: string;
}) {
  const amount = Math.abs(Math.round(input.amount));
  if (amount === 0) return false;
  return withWriteRetry(() =>
    prisma.$transaction(async (tx) => {
      const already = await tx.transaction.findFirst({
        where: { userId: input.userId, type: TransactionType.REFUND, reference: input.orderId },
        select: { id: true },
      });
      if (already) return false;
      await applyDelta(tx, input.userId, amount);
      await tx.transaction.create({
        data: {
          userId: input.userId,
          type: TransactionType.REFUND,
          status: TransactionStatus.COMPLETED,
          amount,
          currency: Currency.USD,
          note: input.note ?? "Refund: order could not be completed",
          reference: input.orderId,
        },
      });
      return true;
    }),
  );
}
