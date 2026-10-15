export const runtime = "nodejs";

import { jsonError, jsonOk } from "@/lib/api";
import { verifyFamgatewayWebhookSignature } from "@/lib/famgateway";
import { completeDepositOnce, failDepositOnce } from "@/lib/deposit-credit";
import { prisma } from "@/lib/prisma";
import { DepositMethod } from "@prisma/client";

/**
 * FamGateway payment webhook payload.
 * @see https://famgateway.in/docs.php
 */
type FamgatewayWebhookBody = {
  event?: string;
  order_id?: string;
  amount?: number | string;
  payable_amount?: number | string;
  status?: string;
  transaction_id?: string;
  utr?: string;
  sender_name?: string;
  payment_time?: string;
  timestamp?: number;
  data?: {
    order_id?: string;
    amount?: number | string;
    utr?: string;
    transaction_id?: string;
    status?: string;
    sender_name?: string;
  };
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-famgateway-signature") ||
    req.headers.get("X-FamGateway-Signature");

  const isVerified = await verifyFamgatewayWebhookSignature(rawBody, signature);
  if (!isVerified) {
    return jsonError(
      "UNAUTHORIZED",
      "Invalid FamGateway webhook signature.",
      401,
    );
  }

  let payload: FamgatewayWebhookBody;
  try {
    payload = JSON.parse(rawBody) as FamgatewayWebhookBody;
  } catch {
    return jsonError("INVALID_JSON", "Invalid webhook JSON.", 400);
  }

  const orderId = String(
    payload.order_id || payload.data?.order_id || "",
  ).trim();

  if (!orderId) {
    return jsonOk({ processed: false, reason: "missing_order_id" });
  }

  const deposit = await prisma.deposit.findFirst({
    where: { method: DepositMethod.UPI, providerDepositId: orderId },
  });

  if (!deposit) {
    return jsonOk({ ignored: true, reason: "deposit_not_found" });
  }

  const eventName = String(payload.event || "").toLowerCase();
  const statusStr = String(
    payload.status || payload.data?.status || "",
  ).toLowerCase();

  const isSuccess =
    eventName === "payment.success" ||
    statusStr === "success" ||
    statusStr === "paid";

  const txnRef = String(
    payload.utr ||
      payload.data?.utr ||
      payload.transaction_id ||
      payload.data?.transaction_id ||
      orderId,
  ).trim();

  if (isSuccess) {
    const paidRaw =
      payload.amount ??
      payload.payable_amount ??
      payload.data?.amount ??
      deposit.payableAmount;
    const paid = Number(paidRaw);
    const required = Number(deposit.payableAmount);

    if (!Number.isFinite(paid) || Math.abs(paid - required) > 0.01) {
      const failed = await failDepositOnce(
        deposit.id,
        "amount_mismatch",
        Number.isFinite(paid) ? paid : undefined,
        txnRef,
      );
      return jsonOk({
        processed: true,
        failed: failed.failed,
        reason: "amount_mismatch",
      });
    }

    const completed = await completeDepositOnce({
      depositId: deposit.id,
      method: DepositMethod.UPI,
      paidAmount: paid,
      providerReference: txnRef,
      allowFinalRecheck: true,
    });

    return jsonOk({
      processed: true,
      completed: completed.completed,
      reason: "reason" in completed ? completed.reason : "ok",
    });
  }

  return jsonOk({
    processed: false,
    reason: eventName || statusStr || "unhandled_event",
  });
}
