import "server-only";
import { DepositMethod, type Deposit } from "@prisma/client";
import {
  createFamgatewayOrder,
  verifyFamgatewayOrder,
} from "@/lib/famgateway";
import { completeDepositOnce, failDepositOnce } from "@/lib/deposit-credit";
import type {
  DepositProviderAdapter,
  DepositProviderCreateInput,
  DepositProviderRecheckOptions,
} from "./types";

async function createUpiInvoice(input: DepositProviderCreateInput) {
  const amountInr = input.localAmount;
  const order = await createFamgatewayOrder({
    amountInr,
    customerId: input.user.id,
    customerPhone: input.user.phone,
    customerEmail: input.user.email,
    customerName: input.user.username,
  });

  const payableAmount = Number(order.payable_amount || amountInr);

  return {
    providerDepositId: order.order_id,
    providerReference: order.upi_id || order.order_id,
    secretCode: null,
    payableAmount,
    qrImage: order.qr_url,
    qrString: order.upi_intent,
    paymentUrl: order.checkout_url,
    instructions:
      "Scan the QR code with PhonePe, Google Pay, Paytm, or any UPI app. You can also tap Pay to open the UPI checkout. Payment auto-verifies within seconds.",
    responseExtra: {
      orderId: order.order_id,
      upiId: order.upi_id,
      upiIntent: order.upi_intent,
      checkoutUrl: order.checkout_url,
      amountInr: payableAmount.toFixed(2),
      provider: "famgateway",
    },
  };
}

async function recheckUpiDeposit(
  deposit: Deposit,
  options?: DepositProviderRecheckOptions,
) {
  const orderId = deposit.providerDepositId;
  if (!orderId) return { completed: false, reason: "missing_order_id" };

  const check = await verifyFamgatewayOrder(orderId).catch(() => null);
  if (!check) return { completed: false, reason: "gateway_error" };

  const status = String(check.status || "").toLowerCase();

  if (status === "success") {
    const paid = Number(check.data?.amount ?? deposit.payableAmount);
    const required = Number(deposit.payableAmount);
    const txnRef = check.data?.utr || check.data?.transaction_id || orderId;

    if (!Number.isFinite(paid) || Math.abs(paid - required) > 0.01) {
      return failDepositOnce(
        deposit.id,
        "amount_mismatch",
        Number.isFinite(paid) ? paid : undefined,
        txnRef,
      );
    }

    return completeDepositOnce({
      depositId: deposit.id,
      method: DepositMethod.UPI,
      paidAmount: paid,
      providerReference: txnRef,
      allowFinalRecheck: true,
      allowedStatuses: options?.allowedStatuses,
    });
  }

  if (status === "expired") {
    return { completed: false, reason: "expired" };
  }

  return { completed: false, reason: status || "pending" };
}

export const upiDepositProvider: DepositProviderAdapter = {
  method: DepositMethod.UPI,
  label: "INR",
  capabilities: {
    createInvoice: true,
    adminRecheck: true,
    cronPolling: true,
    manualProof: false,
  },
  createInvoice: createUpiInvoice,
  recheck: recheckUpiDeposit,
};
