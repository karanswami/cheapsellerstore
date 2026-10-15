import "server-only";
import { DepositMethod, type Deposit } from "@prisma/client";
import {
  checkAutogopayStatus,
  createAutogopayTransaction,
} from "@/lib/autogopay";
import { completeDepositOnce, failDepositOnce } from "@/lib/deposit-credit";
import { notifyTelegram } from "@/lib/telegram-notify";
import type {
  DepositProviderAdapter,
  DepositProviderCreateInput,
  DepositProviderRecheckOptions,
} from "./types";

async function createQrisInvoice(input: DepositProviderCreateInput) {
  const amountIdr = Math.round(input.localAmount);
  const tx = await createAutogopayTransaction({ amountIdr });
  const payableAmount = Number(tx.amount || amountIdr);

  void notifyTelegram(
    "qrisDeposit",
    [
      "🧾 QRIS invoice created",
      `Amount: Rp ${payableAmount.toLocaleString("id-ID")}`,
      `User: @${input.user.username} (${input.user.email ?? input.user.id})`,
      `Txn: ${tx.transactionId}`,
    ].join("\n"),
    { fallbackEvent: "deposit" },
  );

  return {
    providerDepositId: tx.transactionId,
    providerReference: tx.orderId,
    secretCode: null,
    payableAmount,
    qrImage: tx.qrImage || null,
    qrString: tx.qrString || null,
    paymentUrl: tx.checkoutUrl || null,
    instructions:
      "Scan the QRIS code with your Indonesian bank or e-wallet app and pay the exact Rupiah total shown. Do not change the amount.",
    responseExtra: {
      amountIdr,
      orderId: tx.orderId,
      transactionId: tx.transactionId,
      provider: "autogopay",
      providerExpiresAt: tx.expiryTime || null,
    },
  };
}

async function recheckQrisDeposit(
  deposit: Deposit,
  options?: DepositProviderRecheckOptions,
) {
  const transactionId = deposit.providerDepositId?.trim();
  const orderId = options?.orderId?.trim() || deposit.providerReference?.trim();
  const primaryId = transactionId || orderId;

  if (!primaryId) return { completed: false, reason: "missing_identifiers" };

  const check = await checkAutogopayStatus(primaryId, orderId || undefined);
  const status = check.status;

  if (status === "settlement") {
    const paidAmount = Number(check.paidAmount || deposit.payableAmount);
    // The QR was generated for exactly payableAmount, so settlement means it was paid in full.
    return completeDepositOnce({
      depositId: deposit.id,
      method: DepositMethod.QRIS,
      paidAmount,
      providerReference: primaryId,
      allowFinalRecheck: true,
      allowedStatuses: options?.allowedStatuses,
    });
  }
  if (status === "expire" || status === "cancel") {
    const failed = await failDepositOnce(
      deposit.id,
      status === "expire" ? "expired" : "cancelled",
      undefined,
      primaryId,
    );
    return { completed: false, failed: failed.failed, reason: status };
  }
  return { completed: false, reason: status };
}

export const qrisDepositProvider: DepositProviderAdapter = {
  method: DepositMethod.QRIS,
  label: "QRIS / Rupiah",
  capabilities: {
    createInvoice: true,
    adminRecheck: true,
    cronPolling: true,
    manualProof: false,
  },
  createInvoice: createQrisInvoice,
  recheck: recheckQrisDeposit,
};
