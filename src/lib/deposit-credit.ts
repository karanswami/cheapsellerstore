import "server-only";
import { prisma } from "@/lib/prisma";
import { Currency, formatMoney } from "@/lib/currencies";
import { getDepositProviderLabel } from "@/lib/deposit-providers";
import {
  DepositMethod,
  DepositStatus,
  TransactionStatus,
  TransactionType,
  type Prisma,
} from "@prisma/client";
import { logActivity } from "@/lib/activity-log";
import { notifyTelegram } from "@/lib/telegram-notify";
import { notifyUser } from "@/lib/notifications";
import { grantSpinForDeposit } from "@/lib/spin";

/** Sentinel while wallet credit is in flight — prevents double-credit races. */
export const DEPOSIT_CREDIT_LOCK_ACTION = "CREDIT_LOCKED";

/**
 * MongoDB + Prisma: optional fields are often *unset*, not JSON `null`.
 * Plain `field: null` / `NOT: { field: value }` miss unset docs and block credit.
 */
function withoutTransactionId(): Prisma.DepositWhereInput {
  return {
    OR: [{ transactionId: null }, { transactionId: { isSet: false } }],
  };
}

function notCreditLocked(): Prisma.DepositWhereInput {
  return {
    OR: [
      { adminAction: { isSet: false } },
      { adminAction: null },
      { adminAction: { not: DEPOSIT_CREDIT_LOCK_ACTION } },
    ],
  };
}

/** Unset or null proof — Mongo treats missing fields differently from JSON null. */
function withoutProofImage(): Prisma.DepositWhereInput {
  return {
    OR: [{ proofImage: null }, { proofImage: { isSet: false } }],
  };
}

function mergeAdminNote(existing: string | null | undefined, next: string) {
  const base = String(existing || "").trim();
  if (!base) return next;
  return `${base}\n${next}`.slice(0, 1200);
}

/**
 * Mark overdue PENDING/PROCESSING deposits as EXPIRED.
 * Skips rows with proof uploaded (admin still reviewing) and credit-locked rows.
 * Must use mongo-safe optional-field filters — `NOT: { proofImage: { not: null } }`
 * matches nothing useful on unset docs, so cron never expired tickets.
 */
export async function expireOldDeposits() {
  return prisma.deposit.updateMany({
    where: {
      status: { in: [DepositStatus.PENDING, DepositStatus.PROCESSING] },
      expiresAt: { lt: new Date() },
      AND: [notCreditLocked(), withoutProofImage()],
    },
    data: {
      status: DepositStatus.EXPIRED,
      failReason: "expired",
      cancelledAt: new Date(),
    },
  });
}

function paidAmountForNotify(paid: number | undefined, payable: number) {
  return Number.isFinite(paid) && paid ? paid : payable;
}

export async function failDepositOnce(
  depositId: string,
  reason: string,
  paidAmount?: number,
  providerReference?: string | null,
) {
  const failed = await prisma.deposit.updateMany({
    where: {
      id: depositId,
      status: { in: [DepositStatus.PENDING, DepositStatus.PROCESSING] },
      AND: [withoutTransactionId(), notCreditLocked()],
    },
    data: {
      status: DepositStatus.FAILED,
      failReason: reason,
      paidAmount,
      providerReference: providerReference || undefined,
      cancelledAt: new Date(),
    },
  });
  return { completed: false as const, failed: failed.count === 1 };
}

export async function completeDepositOnce(options: {
  depositId: string;
  paidAmount?: number;
  providerReference?: string;
  method: DepositMethod;
  allowFinalRecheck?: boolean;
  allowedStatuses?: DepositStatus[];
  reviewerId?: string;
  note?: string;
}) {
  const deposit = await prisma.deposit.findUnique({
    where: { id: options.depositId },
  });
  if (!deposit) return { completed: false as const, reason: "not_found" };
  if (deposit.status === DepositStatus.COMPLETED) {
    return { completed: false as const, reason: "already_completed" };
  }

  const owner = await prisma.user.findUnique({
    where: { id: deposit.userId },
    select: { banned: true },
  });
  if (owner?.banned) {
    return { completed: false as const, reason: "user_banned" };
  }

  const activeStatuses = [DepositStatus.PENDING, DepositStatus.PROCESSING];
  const recheckStatuses = [
    DepositStatus.PENDING,
    DepositStatus.PROCESSING,
    DepositStatus.FAILED,
    DepositStatus.EXPIRED,
    DepositStatus.CANCELLED,
  ];

  if (!options.allowFinalRecheck) {
    if (deposit.status === DepositStatus.FAILED) {
      return { completed: false as const, reason: "failed" };
    }
    if (deposit.status === DepositStatus.CANCELLED) {
      return { completed: false as const, reason: "cancelled" };
    }
    if (
      deposit.status === DepositStatus.EXPIRED ||
      (deposit.expiresAt && deposit.expiresAt < new Date())
    ) {
      await prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          status: DepositStatus.EXPIRED,
          failReason: "expired",
          cancelledAt: deposit.cancelledAt || new Date(),
        },
      });
      return { completed: false as const, reason: "expired" };
    }
  }

  const allowedStatuses =
    options.allowedStatuses ||
    (options.allowFinalRecheck ? recheckStatuses : activeStatuses);

  const locked = await prisma.deposit.updateMany({
    where: {
      id: deposit.id,
      status: { in: allowedStatuses },
      AND: [withoutTransactionId(), notCreditLocked()],
    },
    data: {
      status: DepositStatus.PROCESSING,
      adminAction: DEPOSIT_CREDIT_LOCK_ACTION,
      adminNote: mergeAdminNote(
        deposit.adminNote,
        options.note ||
          `Wallet credit lock acquired for ${getDepositProviderLabel(options.method)} confirmation.`,
      ),
    },
  });
  if (locked.count !== 1) {
    return { completed: false as const, reason: "credit_lock_active" };
  }

  // 1 cent = 1_000_000 microcents. Round credit to nearest full cent.
  const CENTS_SCALE = 1_000_000;
  const credit = Math.round(Math.round(deposit.amount) / CENTS_SCALE) * CENTS_SCALE;
  let transactionId: string;
  try {
    transactionId = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id: deposit.userId } });
        if (!user) throw new Error("USER_NOT_FOUND");

        const next = user.walletBalance + credit;
        if (next < 0) throw new Error("INSUFFICIENT_BALANCE");

        await tx.user.update({
          where: { id: deposit.userId },
          data: { walletBalance: next },
        });

        const txRow = await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.COMPLETED,
            amount: credit,
            currency: Currency.USD,
            note:
              options.note ||
              `${getDepositProviderLabel(options.method)} deposit confirmed`,
            reference:
              options.providerReference ||
              deposit.providerReference ||
              deposit.providerDepositId ||
              deposit.secretCode ||
              deposit.id,
          },
        });

        await tx.deposit.update({
          where: { id: deposit.id },
          data: {
            status: DepositStatus.COMPLETED,
            paidAmount: options.paidAmount,
            providerReference:
              options.providerReference || deposit.providerReference,
            transactionId: txRow.id,
            completedAt: new Date(),
            failReason: null,
            adminAction: options.reviewerId ? "approved" : null,
            reviewedById: options.reviewerId ?? deposit.reviewedById,
            reviewedAt: options.reviewerId ? new Date() : deposit.reviewedAt,
            recheckRequestedAt: options.allowFinalRecheck
              ? new Date()
              : deposit.recheckRequestedAt,
          },
        });

        return txRow.id;
      },
      { maxWait: 10000, timeout: 20000 },
    );
  } catch (error) {
    try {
      const { reportDatabaseError } = await import("@/lib/system-alert");
      void reportDatabaseError("deposit_credit_transaction", error, {
        metadata: { depositId: deposit.id, userId: deposit.userId, method: options.method },
      }).catch(() => undefined);
    } catch {
      // ignore alert delivery failures
    }

    await prisma.deposit.updateMany({
      where: {
        id: deposit.id,
        adminAction: DEPOSIT_CREDIT_LOCK_ACTION,
        AND: [withoutTransactionId()],
      },
      data: {
        status: deposit.status,
        adminAction: deposit.adminAction,
        adminNote: mergeAdminNote(
          deposit.adminNote,
          "Wallet credit lock released after failed confirmation attempt.",
        ),
      },
    });
    throw error;
  }

  // Referrer earns a wheel spin on this friend's first credited deposit (no-op afterwards).
  if (credit > 0) {
    await grantSpinForDeposit({ userId: deposit.userId, depositId: deposit.id });
  }

  const userLabel = await prisma.user.findUnique({
    where: { id: deposit.userId },
    select: { username: true, email: true },
  });
  const method = options.method;
  const lines = [
    method === DepositMethod.BINANCE
      ? "💰 Binance deposit credited"
      : method === DepositMethod.MANUAL
        ? "💰 Manual deposit credited"
        : "💰 Deposit credited",
    `Amount: ${formatMoney(credit)}`,
    `Method: ${getDepositProviderLabel(method)}`,
    `User: @${userLabel?.username ?? "?"} (${userLabel?.email ?? deposit.userId})`,
    `Deposit: ${deposit.id}`,
  ];
  if (method === DepositMethod.BINANCE) {
    void notifyTelegram("binanceDeposit", lines.join("\n"));
  } else if (method === DepositMethod.QRIS) {
    const idr = Number(paidAmountForNotify(options.paidAmount, deposit.payableAmount));
    void notifyTelegram(
      "qrisDeposit",
      [
        "✅ QRIS deposit SUCCESS",
        `Paid: Rp ${idr.toLocaleString("id-ID")}`,
        `Credited: ${formatMoney(credit)}`,
        `User: @${userLabel?.username ?? "?"} (${userLabel?.email ?? deposit.userId})`,
        `Txn: ${deposit.providerDepositId ?? "-"}`,
        `Deposit: ${deposit.id}`,
      ].join("\n"),
      { pin: true, fallbackEvent: "deposit" },
    );
  } else if (
    method === DepositMethod.UPI ||
    method === DepositMethod.ESEWA ||
    method === DepositMethod.MGCLOUDPAY
  ) {
    void notifyTelegram("deposit", lines.join("\n"));
  } else if (method === DepositMethod.MANUAL) {
    void notifyTelegram(
      "manualDeposit",
      [
        "✅ Manual deposit APPROVED & CREDITED",
        `Amount: ${formatMoney(credit)}`,
        `User: @${userLabel?.username ?? "?"} (${userLabel?.email ?? deposit.userId})`,
        `Deposit: ${deposit.id}`,
      ].join("\n"),
    );
  }

  logActivity({
    action: "DEPOSIT_CREDITED",
    category: "WALLET",
    message: `Deposit credited ${formatMoney(credit)} via ${getDepositProviderLabel(method)}`,
    userId: deposit.userId,
    username: userLabel?.username,
    email: userLabel?.email,
    metadata: {
      depositId: deposit.id,
      method,
      credit,
    },
  });

  void notifyUser({
    userId: deposit.userId,
    type: "deposit_credited",
    title: "💰 Deposit Credited!",
    message: `Your wallet has been credited with ${formatMoney(credit)} via ${getDepositProviderLabel(method)}.`,
    actionUrl: "/app/wallet",
  }).catch((err) => {
    console.warn("[deposit-credit] Failed to send user notification:", err);
  });

  return { completed: true as const, transactionId };
}
