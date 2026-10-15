/**
 * Store currency is USD only. All money amounts are integer microcents.
 * 1 USD = 100 cents × 1_000_000 microcents/cent = 100_000_000 microcents.
 * Deposits may use multiple payment methods; wallet balance is always USD.
 */

export const Currency = {
  USD: "USD",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

export type CurrencyCode = Currency;

/** Microcents per 1.00 USD. */
export const MICROCENTS_PER_USD = 100_000_000;

export type CurrencyMeta = {
  code: Currency;
  label: string;
  locale: string;
  intlCode: string;
};

export const CURRENCIES: CurrencyMeta[] = [
  { code: Currency.USD, label: "USD — US Dollar", locale: "en-US", intlCode: "USD" },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [
  Currency,
  ...Currency[],
];

export function getCurrencyMeta(code: Currency = Currency.USD): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/** Convert a USD decimal (e.g. 9.99) to integer microcents. */
export function usdToMicrocents(usd: number): number {
  if (!Number.isFinite(usd)) return 0;
  return Math.round(usd * MICROCENTS_PER_USD);
}

/** Convert integer microcents to a USD decimal for display math. */
export function microcentsToUsd(microcents: number): number {
  if (!Number.isFinite(microcents)) return 0;
  return microcents / MICROCENTS_PER_USD;
}

/** Plain `"1.00"` string for Platform API responses (no currency symbol). */
export function microcentsToUsdString(microcents: number): string {
  return microcentsToUsd(microcents).toFixed(2);
}

/**
 * Format a microcents amount as USD.
 * `@param amount` is always microcents (not dollars).
 */
export function formatMoney(
  amount: number,
  _currency: Currency = Currency.USD,
): string {
  const meta = getCurrencyMeta(Currency.USD);
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.intlCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(microcentsToUsd(amount));
}

export function isCurrency(value: string): value is Currency {
  return value === Currency.USD;
}

/** Parse a user-entered USD string/number into microcents; null if invalid. */
export function parseUsdInput(value: string | number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return usdToMicrocents(n);
}
