/** Customer- and admin-facing labels for stored `Deposit.method` values. */
export const DEPOSIT_METHOD_LABELS: Record<string, string> = {
  BINANCE: "Binance Pay",
  QRIS: "QRIS",
  UPI: "INR (Cashfree)",
  ESEWA: "eSewa Nepal",
  MANUAL: "Manual",
  BANK_TRANSFER: "Bank transfer",
  CRYPTO: "Crypto",
  OTHER: "Other",
};

export function depositMethodLabel(
  method: string | null | undefined,
  manualMethodName?: string | null,
): string {
  if (method === "MANUAL" && manualMethodName?.trim()) {
    return manualMethodName.trim();
  }
  const key = (method ?? "").trim();
  if (key && DEPOSIT_METHOD_LABELS[key]) return DEPOSIT_METHOD_LABELS[key];
  return key || "Deposit";
}
