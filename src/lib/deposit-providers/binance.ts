import "server-only";
import { DepositMethod, type Deposit } from "@prisma/client";
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
import { claimIdempotency, completeIdempotency, releaseIdempotency } from "@/lib/idempotency";

/** Only USD-pegged coins may credit a USD wallet; 1000 units of a cheap coin must never equal $1000. */
const ACCEPTED_BINANCE_CURRENCIES = new Set(["USDT", "USDC", "FDUSD", "BUSD", "USD"]);
const PAYMENT_BEFORE_TICKET_SLACK_MS = 2 * 60 * 1000;
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

  const ticketOpenedAt = deposit.createdAt.getTime() - PAYMENT_BEFORE_TICKET_SLACK_MS;
  const tx = transactions.find((item) => {
    // Incoming, stable-coin, post-ticket payments only.
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount <= 0) return false;
    if (!ACCEPTED_BINANCE_CURRENCIES.has(String(item.currency || "").trim().toUpperCase())) {
      return false;
    }
    const paidAt = Number(item.transactionTime ?? item.createTime ?? 0);
    if (!Number.isFinite(paidAt) || paidAt < ticketOpenedAt) return false;

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

  // Atomic, cross-deposit claim of this exact Binance payment: one payment can fund one deposit,
  // even when two verifies race (the unique (scope,key) index decides the winner).
  const claimKeys = [matchedOrderId, matchedTxId].filter(Boolean);
  const claimed: string[] = [];
  for (const ref of claimKeys) {
    const c = await claimIdempotency("binance-payment", ref, 3650 * 86_400_000);
    if (c.ok) {
      claimed.push(ref);
      await completeIdempotency("binance-payment", ref, 200, { depositId: deposit.id }, 3650 * 86_400_000);
      continue;
    }
    const owner = (c.body as { depositId?: string } | null)?.depositId;
    if (owner !== deposit.id) {
      for (const r of claimed) await releaseIdempotency("binance-payment", r).catch(() => undefined);
      return { completed: false, reason: "duplicate_order_id" };
    }
  }

  const result = await completeDepositOnce({
    depositId: deposit.id,
    method: DepositMethod.BINANCE,
    paidAmount: paid,
    providerReference: finalReference,
    ...completionOptions(options),
  });
  if (!result.completed && result.reason !== "already_completed") {
    // Nothing was credited: free the payment so the right deposit can still claim it.
    for (const r of claimed) await releaseIdempotency("binance-payment", r).catch(() => undefined);
  }
  return result;
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
