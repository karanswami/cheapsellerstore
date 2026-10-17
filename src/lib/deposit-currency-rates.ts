import "server-only";
import { getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import {
  DEFAULT_DEPOSIT_CURRENCIES,
  LOCKED_DEPOSIT_CURRENCY_CODES,
  defaultCurrencyMeta,
  findDepositCurrency,
  normalizeDepositCurrencyCode,
  ratesMapFromCurrencies,
  type DepositCurrencyDef,
  type DepositFxRates,
} from "@/types/deposit-currency";

export type { DepositCurrencyDef, DepositFxRates };
export {
  DEFAULT_DEPOSIT_CURRENCIES,
  LOCKED_DEPOSIT_CURRENCY_CODES,
  defaultCurrencyMeta,
  findDepositCurrency,
  normalizeDepositCurrencyCode,
  ratesMapFromCurrencies,
} from "@/types/deposit-currency";

/** Legacy fixed map used before dynamic currency registry. */
export const DEFAULT_DEPOSIT_FX_RATES: DepositFxRates = ratesMapFromCurrencies(
  DEFAULT_DEPOSIT_CURRENCIES,
);

function sanitizeRate(raw: unknown, fallback: number, code: string): number {
  if (code === "USD") return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function sanitizeName(raw: unknown, code: string): string {
  if (typeof raw !== "string") return defaultCurrencyMeta(code).name;
  const trimmed = raw.trim().slice(0, 60);
  return trimmed || defaultCurrencyMeta(code).name;
}

function sanitizeSymbol(raw: unknown, code: string): string {
  if (typeof raw !== "string") return defaultCurrencyMeta(code).symbol;
  const trimmed = raw.trim().slice(0, 8);
  return trimmed || defaultCurrencyMeta(code).symbol;
}

export function normalizeDepositCurrency(
  raw: Partial<DepositCurrencyDef> | null | undefined,
  fallbackSort = 0,
): DepositCurrencyDef | null {
  const code = normalizeDepositCurrencyCode(raw?.code);
  if (!code) return null;
  const builtIn = DEFAULT_DEPOSIT_CURRENCIES.find((c) => c.code === code);
  const rate = sanitizeRate(
    raw?.rate,
    builtIn?.rate ?? 1,
    code,
  );
  return {
    code,
    name: sanitizeName(raw?.name, code),
    symbol: sanitizeSymbol(raw?.symbol, code),
    rate: code === "USD" ? 1 : rate,
    sortOrder:
      typeof raw?.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? Math.round(raw.sortOrder)
        : fallbackSort,
  };
}

/** Accept new array shape or legacy `{ USD, INR, IDR, NPR }` rate map. */
export function normalizeDepositCurrencies(raw: unknown): DepositCurrencyDef[] {
  if (Array.isArray(raw)) {
    const out: DepositCurrencyDef[] = [];
    for (let i = 0; i < raw.length; i++) {
      const entry = normalizeDepositCurrency(
        raw[i] as Partial<DepositCurrencyDef>,
        i,
      );
      if (!entry) continue;
      if (out.some((c) => c.code === entry.code)) continue;
      out.push(entry);
    }
    // Ensure locked auto-rail currencies always exist.
    for (const locked of LOCKED_DEPOSIT_CURRENCY_CODES) {
      if (out.some((c) => c.code === locked)) continue;
      const def = DEFAULT_DEPOSIT_CURRENCIES.find((c) => c.code === locked);
      if (def) out.push({ ...def, sortOrder: out.length });
    }
    if (!out.some((c) => c.code === "USD")) {
      out.unshift({ ...DEFAULT_DEPOSIT_CURRENCIES[0]! });
    }
    return out.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
    );
  }

  if (raw && typeof raw === "object") {
    const legacy = raw as Record<string, unknown>;
    // New wrapper `{ currencies: [...] }`
    if (Array.isArray(legacy.currencies)) {
      return normalizeDepositCurrencies(legacy.currencies);
    }
    // Legacy rate map
    const fromLegacy: DepositCurrencyDef[] = DEFAULT_DEPOSIT_CURRENCIES.map(
      (def, i) => ({
        ...def,
        rate: sanitizeRate(legacy[def.code], def.rate, def.code),
        sortOrder: i,
      }),
    );
    return fromLegacy;
  }

  return DEFAULT_DEPOSIT_CURRENCIES.map((c) => ({ ...c }));
}

export async function getDepositCurrencies(): Promise<DepositCurrencyDef[]> {
  const raw = await getSettingText(SETTING_KEYS.walletCurrencyRates, "");
  if (!raw.trim()) {
    return DEFAULT_DEPOSIT_CURRENCIES.map((c) => ({ ...c }));
  }
  try {
    return normalizeDepositCurrencies(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_DEPOSIT_CURRENCIES.map((c) => ({ ...c }));
  }
}

export async function saveDepositCurrencies(
  currencies: DepositCurrencyDef[],
): Promise<DepositCurrencyDef[]> {
  const normalized = normalizeDepositCurrencies(currencies);
  if (normalized.length === 0) {
    throw new Error("At least one currency is required.");
  }
  for (const locked of LOCKED_DEPOSIT_CURRENCY_CODES) {
    if (!normalized.some((c) => c.code === locked)) {
      throw new Error(`${locked} is the base currency and cannot be removed.`);
    }
  }
  await upsertSetting({
    key: SETTING_KEYS.walletCurrencyRates,
    textValue: JSON.stringify({ currencies: normalized }),
  });
  return normalized;
}

/** Rate map derived from the currency registry (compat for conversion). */
export async function getDepositFxRates(): Promise<DepositFxRates> {
  const currencies = await getDepositCurrencies();
  return ratesMapFromCurrencies(currencies);
}

/** @deprecated Prefer saveDepositCurrencies — kept for narrow rate-only patches. */
export async function saveDepositFxRates(rates: DepositFxRates) {
  const current = await getDepositCurrencies();
  const next = current.map((c) => ({
    ...c,
    rate: c.code === "USD" ? 1 : sanitizeRate(rates[c.code], c.rate, c.code),
  }));
  // Add any extra keys from rates map as new currencies
  for (const [code, rate] of Object.entries(rates)) {
    const normalized = normalizeDepositCurrencyCode(code);
    if (!normalized || next.some((c) => c.code === normalized)) continue;
    const meta = defaultCurrencyMeta(normalized);
    next.push({
      code: normalized,
      name: meta.name,
      symbol: meta.symbol,
      rate: sanitizeRate(rate, 1, normalized),
      sortOrder: next.length,
    });
  }
  return saveDepositCurrencies(next);
}

export function usdFromLocalAmount(
  localAmount: number,
  currency: string,
  rates: DepositFxRates,
) {
  const code = normalizeDepositCurrencyCode(currency) ?? "USD";
  const rate = rates[code] || 1;
  return localAmount / rate;
}

export function isCurrencyRegistered(
  currencies: DepositCurrencyDef[],
  code: string,
): boolean {
  return Boolean(findDepositCurrency(currencies, code));
}

export function canDeleteDepositCurrency(
  code: string,
  usedByManualMethods: string[],
): { ok: true } | { ok: false; reason: string } {
  const normalized = normalizeDepositCurrencyCode(code);
  if (!normalized) return { ok: false, reason: "Invalid currency code." };
  if (
    (LOCKED_DEPOSIT_CURRENCY_CODES as readonly string[]).includes(normalized)
  ) {
    return {
      ok: false,
      reason: `${normalized} is the base currency and cannot be removed.`,
    };
  }
  if (usedByManualMethods.includes(normalized)) {
    return {
      ok: false,
      reason: `Remove or reassign manual deposit methods using ${normalized} first.`,
    };
  }
  return { ok: true };
}
