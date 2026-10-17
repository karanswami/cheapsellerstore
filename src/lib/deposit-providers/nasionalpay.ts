import "server-only";
import { DepositMethod, type Deposit } from "@prisma/client";
import { checkNasionalpayStatus, createNasionalpayInvoice } from "@/lib/nasionalpay";
import { completeDepositOnce, failDepositOnce } from "@/lib/deposit-credit";
import type {
  DepositProviderAdapter,
  DepositProviderCreateInput,
  DepositProviderRecheckOptions,
} from "./types";

async function createInvoice(input: DepositProviderCreateInput) {
  const amountIdr = Math.round(input.localAmount);
  const tx = await createNasionalpayInvoice({ amountIdr, username: input.user.username });

  return {
    providerDepositId: tx.transactionId,
    providerReference: tx.transactionId,
    secretCode: null,
    payableAmount: amountIdr,
    qrImage: tx.qrImage,
    qrString: tx.qrString,
    paymentUrl: tx.paymentUrl,
    instructions:
      tx.channel === "FUNDS"
        ? "Open the DANA link, confirm the payment and pay the exact Rupiah amount shown."
        : "Scan the QRIS code with your Indonesian bank or e-wallet app and pay the exact Rupiah amount shown. Do not change the amount.",
    responseExtra: {
      amountIdr,
      transactionId: tx.transactionId,
      provider: "nasionalpay",
      channel: tx.channel,
      providerExpiresAt: tx.expiredAt,
    },
  };
}

async function recheck(deposit: Deposit, options?: DepositProviderRecheckOptions) {
  const transactionId = deposit.providerDepositId?.trim();
  if (!transactionId) return { completed: false, reason: "missing_identifiers" };

  const check = await checkNasionalpayStatus(transactionId);
  if (check.status === "success") {
    return completeDepositOnce({
      depositId: deposit.id,
      method: DepositMethod.NASIONALPAY,
      // The invoice was created for exactly payableAmount; the gateway may add a store markup on top.
      paidAmount: Number(deposit.payableAmount),
      providerReference: transactionId,
      allowFinalRecheck: true,
      allowedStatuses: options?.allowedStatuses,
    });
  }
  if (check.status === "expired" || check.status === "failed") {
    const failed = await failDepositOnce(
      deposit.id,
      check.status === "expired" ? "expired" : "cancelled",
      undefined,
      transactionId,
    );
    return { completed: false, failed: failed.failed, reason: check.status };
  }
  return { completed: false, reason: check.status };
}

export const nasionalpayDepositProvider: DepositProviderAdapter = {
  method: DepositMethod.NASIONALPAY,
  label: "QRIS / DANA (IDR)",
  capabilities: {
    createInvoice: true,
    adminRecheck: true,
    cronPolling: true,
    manualProof: false,
  },
  createInvoice,
  recheck,
};
