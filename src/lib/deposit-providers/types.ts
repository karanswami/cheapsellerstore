import "server-only";
import type {
  Deposit,
  DepositMethod,
  DepositStatus,
  UserRole,
} from "@prisma/client";

export type DepositProviderCreateUser = {
  id: string;
  username: string;
  email: string | null;
  phone?: string | null;
  role: UserRole;
};

export type DepositProviderCreateInput = {
  user: DepositProviderCreateUser;
  method: DepositMethod;
  /** Local pay currency code (USD / INR / IDR / NPR / admin-added). */
  payCurrency: string;
  localAmount: number;
  /** USD microcents to credit on success. */
  amountMicrocents: number;
  expiresAt: Date;
};

export type DepositProviderCreateResult = {
  providerDepositId?: string | null;
  providerReference?: string | null;
  secretCode?: string | null;
  payableAmount: number;
  qrImage?: string | null;
  qrString?: string | null;
  paymentUrl?: string | null;
  instructions: string;
  responseExtra?: Record<string, unknown>;
};

export type DepositProviderRecheckOptions = {
  allowedStatuses?: DepositStatus[];
  allowFinalRecheck?: boolean;
  qrisHistory?: Record<string, unknown>[];
  allowLiveStatusCheck?: boolean;
  orderId?: string;
  /** Set only by the admin recheck route; bypasses the review-queue auto-poll skip. */
  adminInitiated?: boolean;
};

export type DepositProviderRecheckResult = {
  completed: boolean;
  reason?: string;
  failed?: boolean;
  transactionId?: string;
};

export type DepositProviderCapabilities = {
  createInvoice: boolean;
  adminRecheck: boolean;
  cronPolling: boolean;
  manualProof: boolean;
};

export type DepositProviderAdapter = {
  method: DepositMethod;
  label: string;
  capabilities: DepositProviderCapabilities;
  createInvoice?(
    input: DepositProviderCreateInput,
  ): Promise<DepositProviderCreateResult>;
  recheck(
    deposit: Deposit,
    options?: DepositProviderRecheckOptions,
  ): Promise<DepositProviderRecheckResult>;
};
