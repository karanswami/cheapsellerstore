import "server-only";
import {
  DEFAULT_DEPOSIT_FX_RATES,
  getDepositCurrencies,
  getDepositFxRates,
  type DepositFxRates,
} from "@/lib/deposit-currency-rates";
import { getSettingInt, getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import type { UserRole } from "@prisma/client";
import { isWholesaleRole } from "@/lib/roles";
import { normalizeDepositCurrencyCode } from "@/types/deposit-currency";

export type DepositPayCurrencyCode = string;

/** Dynamic per-currency minimums (local units). */
export type DepositCurrencyMins = Record<string, number>;

export type DepositMinsByAudience = {
  user: DepositCurrencyMins;
  reseller: DepositCurrencyMins;
};

function defaultMinForCode(code: string, rates: DepositFxRates, usd = 1): number {
  const rate = rates[code] || 1;
  if (code === "USD") return Math.round(usd * 100) / 100;
  if (code === "IDR") {
    return Math.max(1000, Math.ceil((usd * rate) / 1000) * 1000);
  }
  return Math.max(1, Math.ceil(usd * rate));
}

export function defaultDepositMins(
  rates: DepositFxRates = DEFAULT_DEPOSIT_FX_RATES,
): DepositMinsByAudience {
  const codes = Object.keys(rates);
  const user: DepositCurrencyMins = {};
  for (const code of codes) {
    user[code] = defaultMinForCode(code, rates, 1);
  }
  return { user, reseller: { ...user } };
}

function sanitizeCurrencyMins(
  raw: Record<string, unknown> | null | undefined,
  fallback: DepositCurrencyMins,
  rates: DepositFxRates,
): DepositCurrencyMins {
  const out: DepositCurrencyMins = {};
  const codes = new Set([
    ...Object.keys(fallback),
    ...Object.keys(rates),
    ...Object.keys(raw ?? {}),
  ]);
  for (const code of codes) {
    const normalized = normalizeDepositCurrencyCode(code);
    if (!normalized) continue;
    const candidate = Number(raw?.[normalized] ?? raw?.[code]);
    if (Number.isFinite(candidate) && candidate >= 0) {
      out[normalized] =
        normalized === "USD"
          ? Math.round(candidate * 100) / 100
          : Math.round(candidate);
    } else if (fallback[normalized] !== undefined) {
      out[normalized] = fallback[normalized]!;
    } else {
      out[normalized] = defaultMinForCode(normalized, rates, 1);
    }
  }
  // Always keep registered rate codes
  for (const code of Object.keys(rates)) {
    if (out[code] === undefined) {
      out[code] = defaultMinForCode(code, rates, 1);
    }
  }
  return out;
}

export function normalizeDepositMins(
  raw: Partial<DepositMinsByAudience> | null | undefined,
  rates: DepositFxRates = DEFAULT_DEPOSIT_FX_RATES,
): DepositMinsByAudience {
  const base = defaultDepositMins(rates);
  return {
    user: sanitizeCurrencyMins(
      raw?.user as Record<string, unknown> | undefined,
      base.user,
      rates,
    ),
    reseller: sanitizeCurrencyMins(
      raw?.reseller as Record<string, unknown> | undefined,
      base.reseller,
      rates,
    ),
  };
}

export async function getDepositMins(): Promise<DepositMinsByAudience> {
  const rates = await getDepositFxRates();
  const raw = await getSettingText(SETTING_KEYS.depositMins, "");
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as Partial<DepositMinsByAudience>;
      return normalizeDepositMins(parsed, rates);
    } catch {
      // fall through to legacy
    }
  }

  const legacyUsd = await getSettingInt(SETTING_KEYS.depositMin, 1);
  const base = defaultDepositMins(rates);
  const user: DepositCurrencyMins = {};
  for (const code of Object.keys(rates)) {
    user[code] = defaultMinForCode(code, rates, legacyUsd);
  }
  return { user, reseller: { ...user } };
}

export async function saveDepositMins(mins: DepositMinsByAudience) {
  const rates = await getDepositFxRates();
  const normalized = normalizeDepositMins(mins, rates);
  await upsertSetting({
    key: SETTING_KEYS.depositMins,
    textValue: JSON.stringify(normalized),
  });
  return normalized;
}

/** After currency registry changes, prune/seed mins for current codes. */
export async function syncDepositMinsToCurrencies() {
  const [rates, current] = await Promise.all([
    getDepositFxRates(),
    getDepositMins(),
  ]);
  return saveDepositMins(normalizeDepositMins(current, rates));
}

export function depositAudienceForRole(
  role: UserRole | string,
): keyof DepositMinsByAudience {
  return isWholesaleRole(role) ? "reseller" : "user";
}

export async function getDepositMinsForRole(
  role: UserRole | string,
): Promise<DepositCurrencyMins> {
  const all = await getDepositMins();
  return all[depositAudienceForRole(role)];
}

export function minForCurrency(
  mins: DepositCurrencyMins,
  currency: string,
): number {
  const code = normalizeDepositCurrencyCode(currency) ?? "USD";
  if (mins[code] !== undefined) return mins[code]!;
  return mins.USD ?? 1;
}

/** @deprecated Prefer Object.keys from getDepositCurrencies */
export async function getDepositMinCurrencyCodes(): Promise<string[]> {
  const currencies = await getDepositCurrencies();
  return currencies.map((c) => c.code);
}
