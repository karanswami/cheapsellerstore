import "server-only";
import { prisma } from "@/lib/prisma";
import { DepositMethod, DepositStatus, type Deposit } from "@prisma/client";
import { resolveManualDepositQrUrl } from "@/lib/deposit-methods";
import {
  BinanceTimestampError,
  getBinancePayMeta,
  getBinancePayTransactions,
  makeSecretCode,
} from "@/lib/deposit-provider-http";
import { completeDepositOnce, failDepositOnce } from "@/lib/deposit-credit";
import { microcentsToUsd } from "@/lib/currencies";
import { flagDepositForReview, DEPOSIT_REVIEW_ACTION } from "@/lib/deposit-review";
import { completionOptions } from "./utils";
import type {
  DepositProviderAdapter,
  DepositProviderCreateInput,
  DepositProviderRecheckOptions,
} from "./types";

async function createBinanceInvoice(input: DepositProviderCreateInput) {
  const amountUsd = input.localAmount;
  const secretCode = makeSecretCode("WEB");
  const meta = await getBinancePayMeta();
  const qrImage = await resolveManualDepositQrUrl("BINANCE");

  return {
    providerDepositId: null,
    providerReference: null,
    secretCode,
    payableAmount: amountUsd,
    qrImage,
    qrString: null,
    paymentUrl: null,
    instructions:
      "Scan the Binance Pay QR (or send to our Pay ID), enter the exact USD amount, and paste the memo code in the payment note. Without the memo, auto-credit may fail.",
    responseExtra: {
      amountUsd: amountUsd.toFixed(2),
      payId: meta.payId,
    },
  };
}

async function recheckBinanceDeposit(
  deposit: Deposit,
  options?: DepositProviderRecheckOptions,
) {
  const secretCode = deposit.secretCode?.trim().toUpperCase();
  const targetOrderId = options?.orderId?.trim() || deposit.providerReference?.trim();

  if (!secretCode && !targetOrderId) {
    return { completed: false, reason: "missing_identifiers" };
  }

  // Fetch only recent transactions; flagged deposits are rechecked by an admin
  // later, so look further back for them.
  const lookbackMs =
    deposit.adminAction === DEPOSIT_REVIEW_ACTION
      ? 24 * 60 * 60 * 1000
      : 5 * 60 * 1000;
  let transactions;
  try {
    transactions = await getBinancePayTransactions(100, Date.now() - lookbackMs);
  } catch (err) {
    if (err instanceof BinanceTimestampError) {
      await flagDepositForReview(deposit, {
        label: "Binance Pay",
        detail: err.message,
      });
      return { completed: false, reason: "needs_review" };
    }
    throw err;
  }

  const tx = transactions.find((item) => {
    const itemNote = String(item.note || item.memo || "").trim().toUpperCase();
    const itemOrderId = String(item.orderId || "").trim();
    const itemTxId = String(item.transactionId || "").trim();

    if (targetOrderId && (itemOrderId === targetOrderId || itemTxId === targetOrderId)) {
      return true;
    }

    if (secretCode && itemNote === secretCode) {
      return true;
    }

    return false;
  });

  if (!tx) return { completed: false, reason: "not_found" };

  const matchedOrderId = String(tx.orderId || "").trim();
  const matchedTxId = String(tx.transactionId || "").trim();
  const referencesToCheck = [matchedOrderId, matchedTxId].filter(Boolean);

  // Anti-duplicate protection: Check if this Binance Order ID / Tx ID was already credited in another completed deposit
  if (referencesToCheck.length > 0) {
    const alreadyClaimed = await prisma.deposit.findFirst({
      where: {
        id: { not: deposit.id },
        status: DepositStatus.COMPLETED,
        providerReference: { in: referencesToCheck },
      },
      select: { id: true },
    });

    if (alreadyClaimed) {
      return { completed: false, reason: "duplicate_order_id" };
    }
  }

  const paid = Number(tx.amount || 0);
  const required = microcentsToUsd(deposit.amount);
  const finalReference = matchedOrderId || matchedTxId || secretCode || "BINANCE_PAY";

  if (!Number.isFinite(paid) || paid + 0.01 < required) {
    return failDepositOnce(
      deposit.id,
      "underpayment",
      Number.isFinite(paid) ? paid : undefined,
      finalReference,
    );
  }

  return completeDepositOnce({
    depositId: deposit.id,
    method: DepositMethod.BINANCE,
    paidAmount: paid,
    providerReference: finalReference,
    ...completionOptions(options),
  });
}

export const binanceDepositProvider: DepositProviderAdapter = {
  method: DepositMethod.BINANCE,
  label: "Binance Pay",
  capabilities: {
    createInvoice: true,
    adminRecheck: true,
    cronPolling: true,
    manualProof: false,
  },
  createInvoice: createBinanceInvoice,
  recheck: recheckBinanceDeposit,
};
