import "server-only";
import { DepositMethod } from "@prisma/client";
import type { DepositProviderAdapter } from "./types";

/** MANUAL deposits are created via createManualMethodDeposit — no invoice adapter. */
export const manualDepositProvider: DepositProviderAdapter = {
  method: DepositMethod.MANUAL,
  label: "Manual",
  capabilities: {
    createInvoice: false,
    adminRecheck: false,
    cronPolling: false,
    manualProof: true,
  },
  async recheck() {
    return { completed: false, reason: "manual_proof_required" };
  },
};
