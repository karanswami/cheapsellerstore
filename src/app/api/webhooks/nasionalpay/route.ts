export const runtime = "nodejs";

import { jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { recheckDepositNow } from "@/lib/deposit-recheck";
import { DepositMethod } from "@prisma/client";

/**
 * NasionalPay callback: { success, data: { type, username, transaction_id, amount, status } }.
 * The callback is unsigned, so it is only a trigger — the deposit is credited solely after
 * the gateway's own /status endpoint confirms the transaction.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { transaction_id?: string; status?: string };
    };
    const transactionId = String(body.data?.transaction_id ?? "").trim();
    if (!transactionId) return jsonOk({ success: true, processed: false, reason: "missing_transaction_id" });

    const deposit = await prisma.deposit.findFirst({
      where: { method: DepositMethod.NASIONALPAY, providerDepositId: transactionId },
    });
    if (!deposit) return jsonOk({ success: true, ignored: true, reason: "transaction not found" });

    const result = await recheckDepositNow(deposit, { allowFinalRecheck: true });
    return jsonOk({ success: true, processed: true, completed: result.completed, reason: result.reason ?? "ok" });
  } catch (error) {
    console.error("NASIONALPAY_WEBHOOK_UNHANDLED_ERROR", error);
    // 2xx so the gateway doesn't retry forever; the cron recheck is the safety net.
    return jsonOk({ success: true, processed: false });
  }
}
