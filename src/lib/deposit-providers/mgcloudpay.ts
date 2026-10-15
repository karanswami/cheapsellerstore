import "server-only";
import { DepositMethod, type Deposit } from "@prisma/client";
import type {
  DepositProviderAdapter,
  DepositProviderCreateInput,
  DepositProviderCreateResult,
  DepositProviderRecheckOptions,
} from "./types";

/**
 * @deprecated MGCloudPay has been decommissioned.
 * QRIS is now handled exclusively by AutoGoPay.
 */
async function createMgcloudpayInvoice(
  _input: DepositProviderCreateInput,
): Promise<DepositProviderCreateResult> {
  throw new Error("MGCloudPay has been decommissioned. Please use QRIS.");
}

async function recheckMgcloudpayDeposit(
  _deposit: Deposit,
  _options?: DepositProviderRecheckOptions,
) {
  return { completed: false, reason: "mgcloudpay_decommissioned" };
}

export const mgcloudpayDepositProvider: DepositProviderAdapter = {
  method: DepositMethod.MGCLOUDPAY,
  label: "QRIS (MGCloudPay backup - Deprecated)",
  capabilities: {
    createInvoice: false,
    adminRecheck: false,
    cronPolling: false,
    manualProof: false,
  },
  createInvoice: createMgcloudpayInvoice,
  recheck: recheckMgcloudpayDeposit,
};
