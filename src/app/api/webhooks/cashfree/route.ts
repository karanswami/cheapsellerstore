export const runtime = "nodejs";

import { jsonError, jsonOk } from "@/lib/api";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { completeDepositOnce, failDepositOnce } from "@/lib/deposit-credit";
import { prisma } from "@/lib/prisma";
import { DepositMethod } from "@prisma/client";

/**
 * Cashfree payment webhook payload (API / webhook version 2025-01-01).
 * @see https://www.cashfree.com/docs/payments/online/webhooks/overview
 */
type CashfreeWebhookBody = {
  type?: string;
  event_time?: string;
  data?: {
    order?: {
      order_id?: string;
      order_amount?: number;
      order_currency?: string;
      order_status?: string;
    };
    payment?: {
      cf_payment_id?: number | string;
      payment_status?: string;
      payment_amount?: number;
      payment_currency?: string;
      bank_reference?: string;
    };
  };
};

const SUCCESS_EVENTS = new Set([
  "PAYMENT_SUCCESS_WEBHOOK",
  "PAYMENT_SUCCESS",
  "ORDER_PAID",
]);

const FAILED_EVENTS = new Set([
  "PAYMENT_FAILED_WEBHOOK",
  "PAYMENT_FAILED",
  "PAYMENT_USER_DROPPED_WEBHOOK",
  "PAYMENT_USER_DROPPED",
  "PAYMENT_CANCELLED",
  "PAYMENT_CANCELED",
]);

function extractOrderId(payload: CashfreeWebhookBody) {
  return String(payload.data?.order?.order_id || "").trim();
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-webhook-timestamp");
  const signature = req.headers.get("x-webhook-signature");
  // v2025-01-01 sends x-idempotency-header; credit lock in completeDepositOnce
  // makes duplicate deliveries safe regardless.
  void req.headers.get("x-idempotency-header");

  if (!(await verifyCashfreeWebhookSignature(rawBody, timestamp, signature))) {
    return jsonError("UNAUTHORIZED", "Invalid Cashfree webhook signature.", 401);
  }

  let payload: CashfreeWebhookBody;
  try {
    payload = JSON.parse(rawBody) as CashfreeWebhookBody;
  } catch {
    return jsonError("INVALID_JSON", "Invalid webhook JSON.", 400);
  }

  const orderId = extractOrderId(payload);
  if (!orderId) {
    // 200 so Cashfree does not retry non-deposit noise
    return jsonOk({ processed: false, reason: "missing_order_id" });
  }

  const deposit = await prisma.deposit.findFirst({
    where: { method: DepositMethod.UPI, providerDepositId: orderId },
  });
  if (!deposit) {
    return jsonOk({ ignored: true, reason: "deposit_not_found" });
  }

  const eventType = String(payload.type || "").toUpperCase();
  const paymentStatus = String(
    payload.data?.payment?.payment_status || "",
  ).toUpperCase();
  const orderStatus = String(
    payload.data?.order?.order_status || "",
  ).toUpperCase();

  const isSuccess =
    SUCCESS_EVENTS.has(eventType) ||
    eventType.includes("SUCCESS") ||
    paymentStatus === "SUCCESS" ||
    orderStatus === "PAID";

  const isFailed =
    FAILED_EVENTS.has(eventType) ||
    eventType.includes("FAILED") ||
    eventType.includes("USER_DROPPED") ||
    ["FAILED", "USER_DROPPED", "CANCELLED", "CANCELED"].includes(paymentStatus);

  const txnRef = String(
    payload.data?.payment?.cf_payment_id ||
      payload.data?.payment?.bank_reference ||
      orderId,
  ).trim();

  if (isSuccess) {
    const paid = Number(
      payload.data?.payment?.payment_amount ??
        payload.data?.order?.order_amount ??
        0,
    );
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

  if (isFailed) {
    const failed = await failDepositOnce(
      deposit.id,
      "provider_failed",
      Number(payload.data?.payment?.payment_amount ?? 0) || undefined,
      txnRef,
    );
    return jsonOk({ processed: true, failed: failed.failed });
  }

  return jsonOk({
    processed: false,
    reason: eventType || paymentStatus || "ignored",
  });
}
