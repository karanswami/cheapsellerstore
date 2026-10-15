import "server-only";
import type { DepositStatus } from "@prisma/client";
import type { DepositProviderRecheckOptions } from "./types";

export function sameProviderText(a: unknown, b: string) {
  return String(a || "").trim().toUpperCase() === b.trim().toUpperCase();
}

export function providerHistoryItems(raw: unknown[]) {
  return raw.map((item) =>
    item && typeof item === "object" ? (item as Record<string, unknown>) : {},
  );
}

export function completionOptions(options?: DepositProviderRecheckOptions): {
  allowFinalRecheck: boolean;
  allowedStatuses?: DepositStatus[];
} {
  return {
    allowFinalRecheck: options?.allowFinalRecheck !== false,
    allowedStatuses: options?.allowedStatuses,
  };
}
