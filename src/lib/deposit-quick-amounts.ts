import "server-only";
import { getDepositFxRates } from "@/lib/deposit-currency-rates";
import { getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import { normalizeDepositCurrencyCode } from "@/types/deposit-currency";

export type DepositQuickAmounts = Record<string, number[]>;

export const DEFAULT_DEPOSIT_QUICK_AMOUNTS: DepositQuickAmounts = {
  USD: [1, 5, 10, 25],
  INR: [100, 250, 500, 1000],
  IDR: [17000, 50000, 100000, 250000],
  NPR: [140, 500, 1000, 2000],
};

function defaultQuickForRate(code: string, rate: number): number[] {
  if (DEFAULT_DEPOSIT_QUICK_AMOUNTS[code]) {
    return [...DEFAULT_DEPOSIT_QUICK_AMOUNTS[code]!];
  }
  if (code === "USD") return [1, 5, 10, 25];
  const r = rate > 0 ? rate : 1;
  const steps = [1, 2.5, 5, 10].map((m) => {
    const raw = r * m;
    if (r >= 1000) return Math.max(1000, Math.round(raw / 1000) * 1000);
    return Math.max(1, Math.round(raw));
  });
  return steps;
}

function sanitizeList(
  raw: unknown,
  fallback: number[],
  currency: string,
): number[] {
  if (!Array.isArray(raw)) return [...fallback];
  const isUsd = currency === "USD";
  const parsed = raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => (isUsd ? Math.round(n * 100) / 100 : Math.round(n)))
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .slice(0, 4);
  return parsed.length > 0 ? parsed : [...fallback];
}

export function normalizeDepositQuickAmounts(
  raw: Partial<Record<string, unknown>> | null | undefined,
  rates: Record<string, number> = {},
): DepositQuickAmounts {
  const codes = new Set([
    ...Object.keys(DEFAULT_DEPOSIT_QUICK_AMOUNTS),
    ...Object.keys(rates),
    ...Object.keys(raw ?? {}),
  ]);
  const out: DepositQuickAmounts = {};
  for (const code of codes) {
    const normalized = normalizeDepositCurrencyCode(code);
    if (!normalized) continue;
    const fallback = defaultQuickForRate(
      normalized,
      rates[normalized] ?? 1,
    );
    out[normalized] = sanitizeList(
      raw?.[normalized] ?? raw?.[code],
      fallback,
      normalized,
    );
  }
  if (!out.USD) out.USD = [...DEFAULT_DEPOSIT_QUICK_AMOUNTS.USD!];
  return out;
}

export async function getDepositQuickAmounts(): Promise<DepositQuickAmounts> {
  const rates = await getDepositFxRates();
  const raw = await getSettingText(SETTING_KEYS.depositQuickAmounts, "");
  if (!raw.trim()) {
    return normalizeDepositQuickAmounts({}, rates);
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DepositQuickAmounts>;
    return normalizeDepositQuickAmounts(parsed, rates);
  } catch {
    return normalizeDepositQuickAmounts({}, rates);
  }
}

export async function saveDepositQuickAmounts(amounts: DepositQuickAmounts) {
  const rates = await getDepositFxRates();
  const normalized = normalizeDepositQuickAmounts(amounts, rates);
  await upsertSetting({
    key: SETTING_KEYS.depositQuickAmounts,
    textValue: JSON.stringify(normalized),
  });
  return normalized;
}

/** After currency registry changes, seed/prune quick amount presets. */
export async function syncDepositQuickAmountsToCurrencies() {
  const [rates, current] = await Promise.all([
    getDepositFxRates(),
    getDepositQuickAmounts(),
  ]);
  return saveDepositQuickAmounts(
    normalizeDepositQuickAmounts(current, rates),
  );
}

export function quickAmountsForCurrency(
  amounts: DepositQuickAmounts,
  currency: string,
): number[] {
  const code = normalizeDepositCurrencyCode(currency) ?? "USD";
  if (amounts[code]?.length) return amounts[code]!;
  return amounts.USD ?? [1, 5, 10, 25];
}

export const DEPOSIT_QUICK_AMOUNT_CURRENCIES = [
  "USD",
  "INR",
  "IDR",
  "NPR",
] as const;
