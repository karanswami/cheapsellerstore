import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { getDepositStatusForUser } from "@/lib/deposits";
import { recheckDepositNow } from "@/lib/deposit-recheck";
import { prisma } from "@/lib/prisma";
import { DepositMethod, DepositStatus } from "@prisma/client";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const verifySchema = z.object({
  orderId: z.string().trim().max(120).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);

  const { id } = await params;

  const deposit = await prisma.deposit.findFirst({
    where: { id, userId: user.id },
  });
  if (!deposit) return jsonError("NOT_FOUND", "Deposit ticket not found.", 404);

  if (deposit.status === DepositStatus.COMPLETED) {
    const current = await getDepositStatusForUser(id, user.id);
    return jsonOk({ deposit: current.ok ? current.deposit : null, completed: true });
  }

  if (deposit.status === DepositStatus.CANCELLED) {
    return jsonError("CANCELLED", "This deposit ticket was cancelled.", 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = verifySchema.safeParse(body);
  const submittedOrderId = parsed.success ? parsed.data.orderId : undefined;

  const recheckResult = await recheckDepositNow(deposit, {
    orderId: submittedOrderId,
    allowedStatuses: [
      DepositStatus.PENDING,
      DepositStatus.PROCESSING,
      DepositStatus.EXPIRED,
    ],
    allowFinalRecheck: true,
  });

  if (recheckResult.completed) {
    const updated = await getDepositStatusForUser(id, user.id);
    return jsonOk({
      deposit: updated.ok ? updated.deposit : null,
      completed: true,
      message: "Payment successfully verified and credited to your wallet!",
    });
  }

  if (
    recheckResult.reason === "needs_review" ||
    recheckResult.reason === "awaiting_admin_review"
  ) {
    return jsonError(
      "NEEDS_REVIEW",
      "Your payment is queued for admin review. It will be credited once verified.",
      400,
    );
  }

  if (recheckResult.reason === "duplicate_order_id") {
    return jsonError(
      "DUPLICATE_ORDER_ID",
      "This transaction / Order ID has already been credited to a deposit.",
      400,
    );
  }

  if (recheckResult.reason === "underpayment") {
    return jsonError(
      "UNDERPAYMENT",
      "The paid amount is less than the required amount.",
      400,
    );
  }

  if (
    recheckResult.reason === "not_found" ||
    recheckResult.reason === "pending" ||
    recheckResult.reason === "unknown"
  ) {
    return jsonError(
      "NOT_YET_CONFIRMED",
      deposit.method === DepositMethod.QRIS
        ? "QRIS payment not confirmed yet. If you have already paid in your banking/e-wallet app, please wait a few seconds and tap Verify again."
        : "No matching transaction found in the last 5 minutes. Please verify your Order ID or Memo and try again.",
      400,
    );
  }

  return jsonError(
    "VERIFY_FAILED",
    deposit.method === DepositMethod.QRIS
      ? "Unable to verify QRIS payment at this moment. Please wait a few moments and try again."
      : "Unable to verify transaction. Please ensure the payment was sent within the last 5 minutes.",
    400,
  );
}
