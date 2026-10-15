import "server-only";
import { DepositMethod } from "@prisma/client";
import { resolveManualDepositQrUrl } from "@/lib/deposit-methods";
import { makeSecretCode } from "@/lib/deposit-provider-http";
import type {
  DepositProviderAdapter,
  DepositProviderCreateInput,
} from "./types";

async function createEsewaManualInvoice(input: DepositProviderCreateInput) {
  const amountNpr = input.localAmount;
  const referenceCode = makeSecretCode("NP");
  const qrImage = await resolveManualDepositQrUrl("ESEWA");

  return {
    providerDepositId: referenceCode,
    providerReference: null,
    secretCode: null,
    payableAmount: amountNpr,
    qrImage,
    qrString: null,
    paymentUrl: null,
    instructions:
      "Scan the eSewa QR, pay the exact NPR amount, then upload your success screenshot. Wallet credit happens after admin verification (not automatic).",
    responseExtra: {
      amountNpr: Math.round(amountNpr),
    },
  };
}

export const esewaManualDepositProvider: DepositProviderAdapter = {
  method: DepositMethod.ESEWA,
  label: "eSewa Nepal",
  capabilities: {
    createInvoice: true,
    adminRecheck: false,
    cronPolling: false,
    manualProof: true,
  },
  createInvoice: createEsewaManualInvoice,
  async recheck() {
    return { completed: false, reason: "manual_proof_required" };
  },
};
