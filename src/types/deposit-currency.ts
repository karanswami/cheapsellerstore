/** Admin-registered pay currency for deposits (FX + labels). Wallet credit stays USD. */
export type DepositCurrencyDef = {
  /** Uppercase ISO-style code, 2–8 letters (USD, INR, PKR, …). */
  code: string;
  /** Customer-facing name, e.g. "US Dollar". */
  name: string;
  /** Customer-facing symbol, e.g. "$" / "₹". */
  symbol: string;
  /** Units of this currency per 1 USD. USD is always 1. */
  rate: number;
  sortOrder: number;
};

/** Map of code → rate (1 USD = rate). Used for conversion helpers. */
export type DepositFxRates = Record<string, number>;

export const DEPOSIT_CURRENCY_CODE_RE = /^[A-Z]{2,8}$/;

/** Built-in defaults — always seeded when settings are empty. */
export const DEFAULT_DEPOSIT_CURRENCIES: DepositCurrencyDef[] = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1, sortOrder: 0 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 92, sortOrder: 1 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", rate: 17000, sortOrder: 2 },
  { code: "NPR", name: "Nepalese Rupee", symbol: "रु", rate: 134, sortOrder: 3 },
];

/** Auto-rail currencies that must stay registered (cannot delete). */
export const LOCKED_DEPOSIT_CURRENCY_CODES = ["USD", "INR", "IDR"] as const;

export function isDepositCurrencyCode(raw: unknown): raw is string {
  return typeof raw === "string" && DEPOSIT_CURRENCY_CODE_RE.test(raw.trim().toUpperCase());
}

export function normalizeDepositCurrencyCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return DEPOSIT_CURRENCY_CODE_RE.test(code) ? code : null;
}

export function defaultCurrencyMeta(code: string): Pick<DepositCurrencyDef, "name" | "symbol"> {
  const builtIn = DEFAULT_DEPOSIT_CURRENCIES.find((c) => c.code === code);
  if (builtIn) return { name: builtIn.name, symbol: builtIn.symbol };
  return { name: code, symbol: code };
}

export function ratesMapFromCurrencies(
  currencies: DepositCurrencyDef[],
): DepositFxRates {
  const out: DepositFxRates = { USD: 1 };
  for (const c of currencies) {
    out[c.code] = c.code === "USD" ? 1 : c.rate;
  }
  return out;
}

export function findDepositCurrency(
  currencies: DepositCurrencyDef[],
  code: string,
): DepositCurrencyDef | undefined {
  const normalized = normalizeDepositCurrencyCode(code);
  if (!normalized) return undefined;
  return currencies.find((c) => c.code === normalized);
}
