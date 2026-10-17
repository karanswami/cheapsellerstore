import "server-only";
import { getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import {
  isDepositQrImageUrl,
  isIconImageUrl,
} from "@/lib/public-uploads";
import { getDepositMethodsConfig } from "@/lib/deposit-methods";
import {
  getDepositCurrencies,
  isCurrencyRegistered,
} from "@/lib/deposit-currency-rates";
import type {
  ManualDepositCurrency,
  ManualDepositMethod,
  PublicManualDepositMethod,
} from "@/types/manual-deposit";
import { defaultManualCurrencyMeta } from "@/types/manual-deposit";
import { normalizeDepositCurrencyCode } from "@/types/deposit-currency";
import { isSiteIconKey, type SiteIconKey } from "@/types/site-icons";

export type {
  ManualDepositCurrency,
  ManualDepositMethod,
  PublicManualDepositMethod,
} from "@/types/manual-deposit";
export { defaultManualCurrencyMeta } from "@/types/manual-deposit";

const DEFAULT_ESEWA_QR = "/esewa-nepal-qr.png";

const SLUG_RE = /^[a-z][a-z0-9_-]{1,48}$/;

/** Pay currency string stored on Deposit — must be a registered code. */
export function manualMethodPayCurrency(currency: string): string {
  return normalizeDepositCurrencyCode(currency) ?? "USD";
}

function sanitizeQrUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!isDepositQrImageUrl(trimmed)) return "";
  return trimmed;
}

/** Method chip logo — Icons pack uploads, built-in /icons, or deposit uploads. */
function sanitizeIconUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (isIconImageUrl(trimmed) || isDepositQrImageUrl(trimmed)) return trimmed;
  return "";
}

function sanitizeIconKey(raw: unknown): SiteIconKey | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed || !isSiteIconKey(trimmed)) return undefined;
  return trimmed;
}

function sanitizeAccountNumber(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, 500);
}

function sanitizeInstructions(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, 1000);
}

function sanitizeCurrencyName(
  raw: unknown,
  currency: ManualDepositCurrency,
): string {
  if (typeof raw !== "string") {
    return defaultManualCurrencyMeta(currency).currencyName;
  }
  const trimmed = raw.trim().slice(0, 60);
  return trimmed || defaultManualCurrencyMeta(currency).currencyName;
}

function sanitizeCurrencySymbol(
  raw: unknown,
  currency: ManualDepositCurrency,
): string {
  if (typeof raw !== "string") {
    return defaultManualCurrencyMeta(currency).currencySymbol;
  }
  const trimmed = raw.trim().slice(0, 8);
  return trimmed || defaultManualCurrencyMeta(currency).currencySymbol;
}

function sanitizeSlug(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const slug = raw.trim().toLowerCase().replace(/\s+/g, "-");
  return SLUG_RE.test(slug) ? slug : "";
}

function defaultManualMethodName(currency: ManualDepositCurrency): string {
  const meta = defaultManualCurrencyMeta(currency);
  if (currency === "NPR") return "eSewa Nepal";
  return meta.currencyName || currency;
}

function resolveManualMethodId(
  raw: Partial<ManualDepositMethod>,
  name: string,
  currency: ManualDepositCurrency,
  fallbackSort: number,
): string {
  const fromId = sanitizeSlug(raw?.id);
  if (fromId) return fromId;
  const fromName = slugifyManualMethodName(name);
  if (fromName) return fromName;
  return `manual-${currency.toLowerCase()}-${fallbackSort}`;
}

export function normalizeManualDepositMethod(
  raw: Partial<ManualDepositMethod> | null | undefined,
  fallbackSort = 0,
  allowedCodes?: Set<string>,
): ManualDepositMethod | null {
  const currency = normalizeDepositCurrencyCode(raw?.currency);
  if (!currency) return null;
  if (allowedCodes && !allowedCodes.has(currency)) return null;

  const nameInput =
    typeof raw?.name === "string" ? raw.name.trim().slice(0, 80) : "";
  const name = nameInput || defaultManualMethodName(currency);
  const id = resolveManualMethodId(raw ?? {}, name, currency, fallbackSort);

  const accountNumber = sanitizeAccountNumber(raw?.accountNumber);
  const qrUrl = sanitizeQrUrl(raw?.qrUrl);
  const iconUrl = sanitizeIconUrl(raw?.iconUrl);
  const iconKey = sanitizeIconKey(raw?.iconKey);
  const currencyName = sanitizeCurrencyName(raw?.currencyName, currency);
  const currencySymbol = sanitizeCurrencySymbol(raw?.currencySymbol, currency);

  return {
    id,
    name,
    currency,
    currencyName,
    currencySymbol,
    accountNumber: accountNumber || undefined,
    qrUrl: qrUrl || undefined,
    iconUrl: iconUrl || undefined,
    iconKey,
    instructions: sanitizeInstructions(raw?.instructions) || undefined,
    enabled: raw?.enabled === false ? false : true,
    sortOrder:
      typeof raw?.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? Math.round(raw.sortOrder)
        : fallbackSort,
  };
}

export function normalizeManualDepositMethods(
  raw: unknown,
  allowedCodes?: Set<string>,
): ManualDepositMethod[] {
  if (!Array.isArray(raw)) return [];
  const out: ManualDepositMethod[] = [];
  for (let i = 0; i < raw.length; i++) {
    const entry = normalizeManualDepositMethod(
      raw[i] as Partial<ManualDepositMethod>,
      i,
      allowedCodes,
    );
    if (!entry) continue;
    if (out.some((m) => m.id === entry.id)) continue;
    out.push(entry);
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function defaultManualDepositMethods(): Promise<ManualDepositMethod[]> {
  const depositMethods = await getDepositMethodsConfig();
  const esewaQr =
    depositMethods.ESEWA.qrUrl.trim() || DEFAULT_ESEWA_QR;

  const nprMeta = defaultManualCurrencyMeta("NPR");
  return [
    {
      id: "esewa",
      name: "eSewa Nepal",
      currency: "NPR",
      currencyName: nprMeta.currencyName,
      currencySymbol: nprMeta.currencySymbol,
      qrUrl: esewaQr,
      iconKey: "deposit-npr",
      instructions:
        "Scan the eSewa QR, pay the exact NPR amount, then upload your success screenshot.",
      enabled: true,
      sortOrder: 0,
    },
  ];
}

export async function getManualDepositMethods(): Promise<ManualDepositMethod[]> {
  const raw = await getSettingText(SETTING_KEYS.manualDepositMethods, "");
  if (!raw.trim()) return defaultManualDepositMethods();
  try {
    const parsed = JSON.parse(raw) as unknown;
    // Load without registry filter so existing methods stay readable even if
    // a currency was temporarily missing; save path enforces registry.
    const normalized = normalizeManualDepositMethods(parsed);
    // An explicitly saved empty list means the admin removed every method.
    return normalized;
  } catch {
    return defaultManualDepositMethods();
  }
}

export async function saveManualDepositMethods(
  methods: ManualDepositMethod[],
): Promise<ManualDepositMethod[]> {
  const currencies = await getDepositCurrencies();
  const allowed = new Set(currencies.map((c) => c.code));
  const normalized = normalizeManualDepositMethods(methods, allowed);
  for (const m of methods) {
    const code = normalizeDepositCurrencyCode(m.currency);
    if (!code || !isCurrencyRegistered(currencies, code)) {
      throw new Error(
        `Currency ${m.currency || "(empty)"} is not registered. Add it under Rates & currencies first.`,
      );
    }
  }
  await upsertSetting({
    key: SETTING_KEYS.manualDepositMethods,
    textValue: JSON.stringify(normalized),
  });
  return normalized;
}

export async function getManualMethodById(
  id: string,
): Promise<ManualDepositMethod | null> {
  const methods = await getManualDepositMethods();
  return methods.find((m) => m.id === id) ?? null;
}

export function toPublicManualMethods(
  methods: ManualDepositMethod[],
): PublicManualDepositMethod[] {
  return methods
    .filter((m) => m.enabled)
    .map((m) => ({
      id: m.id,
      name: m.name,
      currency: m.currency,
      currencyName: m.currencyName,
      currencySymbol: m.currencySymbol,
      accountNumber: m.accountNumber,
      qrUrl: m.qrUrl,
      iconUrl: m.iconUrl,
      iconKey: m.iconKey,
      instructions: m.instructions,
    }));
}

export { isManualProofDeposit } from "@/types/manual-deposit";

export function slugifyManualMethodName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base && SLUG_RE.test(base) ? base : "";
}

/** Currency codes currently referenced by saved manual methods. */
export async function getManualMethodCurrencyCodes(): Promise<string[]> {
  const methods = await getManualDepositMethods();
  return [...new Set(methods.map((m) => m.currency))];
}
