import "server-only";

import { recheckDepositNow } from "@/lib/deposit-recheck";
import { prisma } from "@/lib/prisma";
import { DepositMethod } from "@prisma/client";

type SearchParams = Record<string, string | string[] | undefined>;

function param(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Cashfree return_url lands on `/app/deposit?deposit=success|failed&order=…`
 * (order_id placeholder filled by Cashfree). Recheck on success, then invoice.
 */
export async function resolveUpiDepositReturn(
  userId: string,
  params: SearchParams,
): Promise<string | null> {
  const redirectStatus = String(param(params, "deposit") || "")
    .trim()
    .toLowerCase();
  const orderId = String(
    param(params, "order") || param(params, "order_id") || "",
  ).trim();

  if (!redirectStatus || !orderId) return null;
  if (!["success", "failed", "timeout", "failure"].includes(redirectStatus)) {
    return null;
  }

  const deposit = await prisma.deposit.findFirst({
    where: {
      userId,
      method: DepositMethod.UPI,
      providerDepositId: orderId,
    },
  });
  if (!deposit) return null;

  if (redirectStatus === "success") {
    await recheckDepositNow(deposit, { allowFinalRecheck: true }).catch(
      (error) => console.warn("INR_RETURN_RECHECK_FAILED", error),
    );
  }

  return `/app/deposit/${deposit.id}`;
}
