import { prisma } from "@/lib/prisma";
import { Currency } from "@/lib/currencies";
import { TransactionStatus, TransactionType } from "@prisma/client";

export async function getWalletBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });
  return user?.walletBalance ?? 0;
}

/** Adjust wallet by signed microcents (USD). */
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

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  const SUB_CENT_TOLERANCE = 1_000_000;
  const next = user.walletBalance + input.amount;
  if (next < 0 && Math.abs(next) >= SUB_CENT_TOLERANCE) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  const finalBalance = Math.max(0, next);

  const updated = await prisma.user.update({
    where: { id: input.userId },
    data: { walletBalance: finalBalance },
  });

  await prisma.transaction.create({
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

  return updated;
}

/**
 * Transfer positive microcents from one wallet to another (two ledger rows).
 * Best-effort sequential with rollback if credit fails.
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

  await adjustWallet({
    userId: input.fromUserId,
    amount: -amount,
    type: TransactionType.ADMIN_ADJUSTMENT,
    note: input.note ?? "Wallet transfer out",
    reference: input.reference,
  });

  try {
    await adjustWallet({
      userId: input.toUserId,
      amount,
      type: TransactionType.ADMIN_ADJUSTMENT,
      note: input.note ?? "Wallet transfer in",
      reference: input.reference,
    });
  } catch (e) {
    await adjustWallet({
      userId: input.fromUserId,
      amount,
      type: TransactionType.ADMIN_ADJUSTMENT,
      note: "Transfer rollback",
      reference: input.reference,
    });
    throw e;
  }
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
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  // 1 cent = 1_000_000 microcents.
  // Allow a sub-cent rounding tolerance (< 1 cent / 1_000_000 microcents)
  // because USD display formatting rounds half-up (e.g. $0.49666667 -> $0.50).
  const SUB_CENT_TOLERANCE = 1_000_000;
  if (user.walletBalance < amount && (amount - user.walletBalance) >= SUB_CENT_TOLERANCE) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  const next = Math.max(0, user.walletBalance - amount);
  const minRequired = Math.max(0, amount - SUB_CENT_TOLERANCE);

  const result = await prisma.user.updateMany({
    where: { id: input.userId, walletBalance: { gte: minRequired } },
    data: { walletBalance: next },
  });

  if (result.count === 0) throw new Error("INSUFFICIENT_BALANCE");

  await prisma.transaction.create({
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
}
