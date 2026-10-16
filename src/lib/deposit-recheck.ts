import "server-only";
import { DepositMethod, DepositStatus, type Deposit } from "@prisma/client";
import { getDepositProviderAdapter } from "@/lib/deposit-providers";
import type { DepositProviderRecheckOptions } from "@/lib/deposit-providers";
import { runForDeposit } from "@/lib/auto-gateways";
import { DEPOSIT_REVIEW_ACTION } from "@/lib/deposit-review";

export const ADMIN_RECHECK_ALLOWED_STATUSES: DepositStatus[] = [
  DepositStatus.PENDING,
  DepositStatus.PROCESSING,
  DepositStatus.EXPIRED,
];

export const CRON_RECHECK_ALLOWED_STATUSES: DepositStatus[] = [
  DepositStatus.PENDING,
  DepositStatus.PROCESSING,
  DepositStatus.EXPIRED,
];

export function canProviderRecheckDeposit(
  deposit: Deposit,
  allowedStatuses: DepositStatus[] = ADMIN_RECHECK_ALLOWED_STATUSES,
) {
  if (
    deposit.method === DepositMethod.ESEWA ||
    deposit.method === DepositMethod.MANUAL
  ) {
    return { ok: false as const, reason: "manual_provider" };
  }
  if (deposit.status === DepositStatus.COMPLETED || deposit.transactionId) {
    return { ok: false as const, reason: "already_completed" };
  }
  if (deposit.status === DepositStatus.CANCELLED) {
    return { ok: false as const, reason: "cancelled" };
  }
  if (!allowedStatuses.includes(deposit.status)) {
    return { ok: false as const, reason: "status_not_allowed" };
  }
  const adapter = getDepositProviderAdapter(deposit.method);
  if (!adapter.capabilities.adminRecheck) {
    return { ok: false as const, reason: "provider_recheck_disabled" };
  }
  return { ok: true as const };
}

export async function recheckDepositNow(
  deposit: Deposit,
  options?: DepositProviderRecheckOptions,
) {
  const gate = canProviderRecheckDeposit(
    deposit,
    options?.allowedStatuses || ADMIN_RECHECK_ALLOWED_STATUSES,
  );
  if (!gate.ok) return { completed: false, reason: gate.reason };

  // Flagged deposits are credited only after an admin runs the recheck.
  if (deposit.adminAction === DEPOSIT_REVIEW_ACTION && !options?.adminInitiated) {
    return { completed: false, reason: "awaiting_admin_review" };
  }

  const adapter = getDepositProviderAdapter(deposit.method);
  return runForDeposit(deposit, () => adapter.recheck(deposit, options));
}
