import {
  isSiteIconKey,
  type SiteIconKey,
} from "@/types/site-icons";
import {
  defaultCurrencyMeta,
  normalizeDepositCurrencyCode,
} from "@/types/deposit-currency";

/** Pay currency code — must match a registered admin deposit currency. */
export type ManualDepositCurrency = string;

export type ManualDepositMethod = {
  id: string;
  name: string;
  currency: ManualDepositCurrency;
  /** Display label for the pay currency (admin-editable), e.g. "US Dollar". */
  currencyName: string;
  /** Display symbol for amounts (admin-editable), e.g. "$" / "₹". */
  currencySymbol: string;
  accountNumber?: string;
  qrUrl?: string;
  /** Custom uploaded logo (`/uploads/icons/…` or `/uploads/deposits/…`). Wins over iconKey. */
  iconUrl?: string;
  /** Site Icons pack key (admin `/admin/icons`). Used when iconUrl is empty. */
  iconKey?: SiteIconKey;
  instructions?: string;
  enabled: boolean;
  sortOrder: number;
};

export type PublicManualDepositMethod = {
  id: string;
  name: string;
  currency: ManualDepositCurrency;
  currencyName: string;
  currencySymbol: string;
  accountNumber?: string;
  qrUrl?: string;
  iconUrl?: string;
  iconKey?: SiteIconKey;
  instructions?: string;
};

/** Defaults when admin leaves currency name / symbol empty. */
export function defaultManualCurrencyMeta(currency: string): {
  currencyName: string;
  currencySymbol: string;
} {
  const code = normalizeDepositCurrencyCode(currency) ?? "USD";
  const meta = defaultCurrencyMeta(code);
  return { currencyName: meta.name, currencySymbol: meta.symbol };
}

/** Icons-desk default when a manual method has no custom logo / iconKey. */
export function defaultManualDepositIconKey(
  currency: string,
): SiteIconKey {
  const code = normalizeDepositCurrencyCode(currency) ?? "USD";
  switch (code) {
    case "INR":
      return "deposit-inr";
    case "IDR":
      return "deposit-qris";
    case "NPR":
      return "deposit-npr";
    default:
      return "deposit-manual";
  }
}

export function resolveManualMethodIconKey(
  method: Pick<ManualDepositMethod, "iconKey" | "currency">,
): SiteIconKey {
  if (method.iconKey && isSiteIconKey(method.iconKey)) return method.iconKey;
  return defaultManualDepositIconKey(method.currency);
}

/** Client: custom URL → Icons pack key → currency default. */
export function resolveManualMethodLogoSrc(
  method: Pick<
    PublicManualDepositMethod,
    "iconUrl" | "iconKey" | "currency"
  >,
  getIcon: (key: SiteIconKey) => string,
): string {
  const custom = method.iconUrl?.trim();
  if (custom) return custom;
  return getIcon(resolveManualMethodIconKey(method));
}

export function isManualProofDeposit(method: string): boolean {
  return method === "MANUAL" || method === "ESEWA";
}
