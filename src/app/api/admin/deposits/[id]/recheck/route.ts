import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  ADMIN_RECHECK_ALLOWED_STATUSES,
  canProviderRecheckDeposit,
  recheckDepositNow,
} from "@/lib/deposit-recheck";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await params;
  const deposit = await prisma.deposit.findUnique({ where: { id } });
  if (!deposit) return jsonError("NOT_FOUND", "Deposit not found.", 404);

  const gate = canProviderRecheckDeposit(deposit, ADMIN_RECHECK_ALLOWED_STATUSES);
  if (!gate.ok) {
    return jsonError("RECHECK", gate.reason, 400);
  }

  const result = await recheckDepositNow(deposit, {
    allowedStatuses: ADMIN_RECHECK_ALLOWED_STATUSES,
    allowFinalRecheck: true,
    adminInitiated: true,
  });

  const updated = await prisma.deposit.findUnique({ where: { id } });
  return jsonOk({ result, deposit: updated });
}
