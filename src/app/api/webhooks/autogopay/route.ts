export const runtime = "nodejs";

import { jsonError, jsonOk } from "@/lib/api";
import { verifyAutogopayWebhookSignature } from "@/lib/autogopay";
import { completeDepositOnce, failDepositOnce } from "@/lib/deposit-credit";
import { verifyAcrossGateways } from "@/lib/auto-gateways";
import { prisma } from "@/lib/prisma";
import { notifyTelegram } from "@/lib/telegram-notify";
import { DepositMethod, DepositStatus } from "@prisma/client";

/**
 * AutoGoPay QRIS payment webhook endpoint.
 * Payload: { event, timestamp, transaction: { transaction_id, order_id, amount, status, payment_method, paid_at } }
 * Signature: X-Signature = HMAC-SHA256(rawBody, apiKey), hex.
 */
type AutogopayWebhookBody = {
  event?: string;
  timestamp?: string;
  transaction?: {
    transaction_id?: string;
    order_id?: string;
    amount?: number | string;
    status?: string;
    payment_method?: string;
    paid_at?: string;
    [key: string]: unknown;
  };
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature");

    const isVerified = await verifyAcrossGateways("QRIS", () =>
      verifyAutogopayWebhookSignature(rawBody, signature),
    );
    if (!isVerified) {
      return jsonError(
        "UNAUTHORIZED",
        "Invalid AutoGoPay webhook signature.",
        401,
      );
    }

    let payload: AutogopayWebhookBody;
    try {
      payload = JSON.parse(rawBody) as AutogopayWebhookBody;
    } catch {
      return jsonError("INVALID_JSON", "Invalid webhook JSON.", 400);
    }

    const tx = payload.transaction ?? {};
    const transactionId = String(tx.transaction_id || "").trim();
    const orderId = String(tx.order_id || "").trim();
    const lookupId = transactionId || orderId;
    if (!lookupId) {
      return jsonOk({ success: true, processed: false, reason: "missing_transaction_id" });
    }

    let deposit = null;
    try {
      deposit = await prisma.deposit.findFirst({
        where: {
          method: DepositMethod.QRIS,
          OR: [
            ...(transactionId ? [{ providerDepositId: transactionId }] : []),
            ...(orderId ? [{ providerReference: orderId }] : []),
          ],
        },
      });
    } catch (dbErr) {
      console.error("AUTOGOPAY_WEBHOOK_DB_LOOKUP_ERROR", dbErr);
      return jsonOk({
        success: true,
        ignored: true,
        reason: "db_lookup_error",
      });
    }

    if (!deposit) {
      // AutoGoPay requires 2xx even if transaction is not in merchant DB
      return jsonOk({
        success: true,
        ignored: true,
        reason: "transaction not found",
      });
    }

    const statusStr = String(tx.status || "").toUpperCase();
    const paidAmount = Number(tx.amount ?? deposit.payableAmount);

    if (statusStr === "PAID" || statusStr === "SETTLEMENT") {
      const expectedAmount = Number(deposit.payableAmount);

      if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - expectedAmount) >= 1) {
        const failed = await failDepositOnce(
          deposit.id,
          "amount_mismatch",
          Number.isFinite(paidAmount) ? paidAmount : undefined,
          lookupId,
        );
        if (failed.failed) {
          void notifyTelegram(
            "qrisDeposit",
            [
              "⚠️ QRIS amount MISMATCH",
              `Expected: Rp ${expectedAmount.toLocaleString("id-ID")}`,
              `Paid: ${Number.isFinite(paidAmount) ? `Rp ${paidAmount.toLocaleString("id-ID")}` : "?"}`,
              `Txn: ${lookupId}`,
              `Deposit: ${deposit.id}`,
            ].join("\n"),
            { fallbackEvent: "deposit" },
          );
        }
        return jsonOk({
          success: true,
          processed: true,
          failed: failed.failed,
          reason: "amount_mismatch",
        });
      }

      const completed = await completeDepositOnce({
        depositId: deposit.id,
        method: DepositMethod.QRIS,
        paidAmount,
        providerReference: lookupId,
        allowFinalRecheck: true,
      });

      return jsonOk({
        success: true,
        processed: true,
        completed: completed.completed,
        reason: "reason" in completed ? completed.reason : "ok",
      });
    }

    if (statusStr === "EXPIRED" || statusStr === "EXPIRE" || statusStr === "CANCEL" || statusStr === "CANCELLED") {
      if (
        deposit.status === DepositStatus.PENDING ||
        deposit.status === DepositStatus.PROCESSING
      ) {
        const failed = await failDepositOnce(
          deposit.id,
          statusStr.toLowerCase(),
          Number.isFinite(paidAmount) ? paidAmount : undefined,
          lookupId,
        );
        if (failed.failed) {
          void notifyTelegram(
            "qrisDeposit",
            [
              `❌ QRIS deposit ${statusStr}`,
              `Amount: Rp ${Number(deposit.payableAmount).toLocaleString("id-ID")}`,
              `Txn: ${lookupId}`,
              `Deposit: ${deposit.id}`,
            ].join("\n"),
            { fallbackEvent: "deposit" },
          );
        }
        return jsonOk({
          success: true,
          processed: true,
          failed: failed.failed,
          status: statusStr.toLowerCase(),
        });
      }

      return jsonOk({
        success: true,
        processed: true,
        status: statusStr.toLowerCase(),
        note: "already_finalized",
      });
    }

    return jsonOk({ success: true, processed: true, status: statusStr || "unhandled" });
  } catch (error) {
    console.error("AUTOGOPAY_WEBHOOK_UNHANDLED_ERROR", error);
    // AutoGoPay expects 2xx to prevent endless retries on edge exceptions
    return jsonOk({
      success: true,
      processed: false,
      error: error instanceof Error ? error.message : "Internal error",
    });
  }
}
