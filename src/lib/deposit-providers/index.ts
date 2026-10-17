import "server-only";
import { DepositMethod } from "@prisma/client";
import { binanceDepositProvider } from "./binance";
import { esewaManualDepositProvider } from "./esewa";
import { manualDepositProvider } from "./manual";
import { mgcloudpayDepositProvider } from "./mgcloudpay";
import { nasionalpayDepositProvider } from "./nasionalpay";
import { qrisDepositProvider } from "./qris";
import { upiDepositProvider } from "./upi";
import type { DepositProviderAdapter } from "./types";

const DEPOSIT_PROVIDER_REGISTRY: Record<DepositMethod, DepositProviderAdapter> =
  {
    BINANCE: binanceDepositProvider,
    QRIS: qrisDepositProvider,
    UPI: upiDepositProvider,
    ESEWA: esewaManualDepositProvider,
    MANUAL: manualDepositProvider,
    MGCLOUDPAY: mgcloudpayDepositProvider,
    NASIONALPAY: nasionalpayDepositProvider,
  };

export function getDepositProviderAdapter(method: DepositMethod) {
  const adapter = DEPOSIT_PROVIDER_REGISTRY[method];
  if (!adapter) throw new Error(`Unsupported deposit provider: ${method}`);
  return adapter;
}

export function getDepositProviderLabel(method: DepositMethod) {
  return getDepositProviderAdapter(method).label;
}

export function depositProviderSupportsAdminRecheck(method: DepositMethod) {
  return getDepositProviderAdapter(method).capabilities.adminRecheck;
}

export function listDepositProviderAdapters() {
  return Object.values(DEPOSIT_PROVIDER_REGISTRY);
}

export type {
  DepositProviderAdapter,
  DepositProviderCreateInput,
  DepositProviderCreateResult,
  DepositProviderRecheckOptions,
  DepositProviderRecheckResult,
} from "./types";
