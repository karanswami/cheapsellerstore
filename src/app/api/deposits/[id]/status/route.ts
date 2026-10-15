import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { getDepositStatusForUser } from "@/lib/deposits";
import { recheckDepositNow, CRON_RECHECK_ALLOWED_STATUSES } from "@/lib/deposit-recheck";
import { prisma } from "@/lib/prisma";
import { DepositMethod, DepositStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);

  const { id } = await params;

  // Auto-recheck for UPI & Binance if pending
  const raw = await prisma.deposit.findFirst({
    where: { id, userId: user.id },
  });
  if (
    raw &&
    (raw.status === DepositStatus.PENDING ||
      raw.status === DepositStatus.PROCESSING)
  ) {
    const ageMs = Date.now() - raw.createdAt.getTime();
    if (
      (raw.method === DepositMethod.UPI && ageMs >= 15_000) ||
      (raw.method === DepositMethod.BINANCE && ageMs >= 5_000) ||
      (raw.method === DepositMethod.QRIS && ageMs >= 5_000)
    ) {
      await recheckDepositNow(raw, {
        allowedStatuses: CRON_RECHECK_ALLOWED_STATUSES,
        allowFinalRecheck: true,
      }).catch((err) => console.warn(`${raw.method}_STATUS_RECHECK_FAILED`, err));
    }
  }

  const result = await getDepositStatusForUser(id, user.id);
  if (!result.ok) return jsonError(result.code, result.message, 404);

  return jsonOk({ deposit: result.deposit });
}
