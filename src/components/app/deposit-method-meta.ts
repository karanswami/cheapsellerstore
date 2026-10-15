import type { SiteIconKey } from "@/types/site-icons";

export type DepositMethodId =
  | "QRIS"
  | "BINANCE"
  | "UPI"
  | "ESEWA"
  | "MGCLOUDPAY";

export type DepositMethodMeta = {
  value: DepositMethodId;
  label: string;
  shortLabel: string;
  region: string;
  currency: string;
  currencySymbol: string;
  hint: string;
  auto: boolean;
  /** Replaceable site icon key (admin Icons desk). */
  iconKey: SiteIconKey;
  /** Built-in fallback path when icons provider is unavailable. */
  logoSrc: string;
  logoAlt: string;
  logoClassName?: string;
  placeholder: string;
  step: string;
  quickAmounts: number[];
  expiryMinutes: number;
  steps: { title: string; text: string }[];
  helper: string;
  primaryActionLabel: string;
  detailLabel: string;
};

/** Display order + logo files: qris → binance → inr → npr */
export const DEPOSIT_METHODS: DepositMethodMeta[] = [
  {
    value: "QRIS",
    label: "QRIS",
    shortLabel: "Indonesia · Rp",
    region: "Indonesia",
    currency: "IDR",
    currencySymbol: "Rp",
    hint: "Scan QR · auto confirm",
    auto: true,
    iconKey: "deposit-qris",
    logoSrc: "/icons/deposit-qris.png",
    logoAlt: "QRIS",
    logoClassName: "bg-black",
    placeholder: "17000",
    step: "1",
    /** Fallback presets (≥ ~$1 at default FX); UI rebuilds from live min. */
    quickAmounts: [17000, 50000, 100000, 250000],
    expiryMinutes: 10,
    helper:
      "Scan the QRIS code and pay the exact Rupiah total. Do not edit the amount.",
    primaryActionLabel: "Open payment link",
    detailLabel: "Deposit ID",
    steps: [
      {
        title: "Scan QRIS",
        text: "Open your Indonesian bank or e-wallet app and scan the QR.",
      },
      {
        title: "Pay exact total",
        text: "Confirm the exact IDR amount shown on this invoice.",
      },
      {
        title: "Wait here",
        text: "Status updates automatically after payment is confirmed.",
      },
    ],
  },
  {
    value: "BINANCE",
    label: "Binance",
    shortLabel: "Global · USD",
    region: "Global",
    currency: "USD",
    currencySymbol: "$",
    hint: "Pay + required memo",
    auto: true,
    iconKey: "deposit-binance",
    logoSrc: "/icons/deposit-binance.png",
    logoAlt: "Binance Pay",
    placeholder: "1.00",
    step: "0.01",
    quickAmounts: [1, 5, 10, 25],
    expiryMinutes: 5,
    helper:
      "Send the exact USD amount and paste the memo in the payment note before confirming.",
    primaryActionLabel: "Open Binance Pay",
    detailLabel: "Memo / Note",
    steps: [
      {
        title: "Copy the memo",
        text: "Paste the exact memo/note in Binance Pay — required for auto credit.",
      },
      {
        title: "Pay exact USD",
        text: "Scan the QR or send to our Pay ID with the amount shown.",
      },
      {
        title: "Wait for match",
        text: "Keep this page open until the memo matches a paid transfer.",
      },
    ],
  },
  {
    value: "UPI",
    label: "INR",
    shortLabel: "India · UPI",
    region: "India",
    currency: "INR",
    currencySymbol: "₹",
    hint: "UPI QR · auto confirm",
    auto: true,
    iconKey: "deposit-inr",
    logoSrc: "/icons/deposit-inr.png",
    logoAlt: "INR UPI",
    placeholder: "100",
    step: "1",
    quickAmounts: [100, 250, 500, 1000],
    expiryMinutes: 10,
    helper:
      "Scan the dynamic UPI QR code or tap Pay via UPI to transfer exact INR. Payment auto-verifies within seconds.",
    primaryActionLabel: "Pay via UPI App / Web",
    detailLabel: "Order ID",
    steps: [
      {
        title: "Scan UPI QR",
        text: "Scan the QR code with PhonePe, Google Pay, Paytm, or any UPI app.",
      },
      {
        title: "Pay exact total",
        text: "Send the exact INR amount without changing the payment note.",
      },
      {
        title: "Stay on this page",
        text: "Payment verifies automatically via webhook within seconds.",
      },
    ],
  },
  {
    value: "ESEWA",
    label: "NPR",
    shortLabel: "Nepal · eSewa",
    region: "Nepal",
    currency: "NPR",
    currencySymbol: "रु",
    hint: "Proof → admin approve",
    auto: false,
    iconKey: "deposit-npr",
    logoSrc: "/icons/deposit-npr.png",
    logoAlt: "NPR eSewa",
    placeholder: "140",
    step: "1",
    quickAmounts: [140, 500, 1000, 2000],
    expiryMinutes: 30,
    helper:
      "Scan the eSewa QR, pay exact NPR, then upload your success screenshot for admin review.",
    primaryActionLabel: "Upload screenshot",
    detailLabel: "Reference",
    steps: [
      {
        title: "Scan eSewa QR",
        text: "Open eSewa and scan the QR on this page.",
      },
      {
        title: "Pay exact NPR",
        text: "Send the exact amount shown — wrong amounts delay approval.",
      },
      {
        title: "Upload screenshot",
        text: "Upload the success screen. Admin verifies credit.",
      },
    ],
  },
];

export function getDepositMethodMeta(method: string): DepositMethodMeta {
  return (
    DEPOSIT_METHODS.find((m) => m.value === method) ?? DEPOSIT_METHODS[0]
  );
}

/** Ceil USD min → local pay units (nice steps per currency). */
export function localMinFromUsd(
  minDepositUsd: number,
  rate: number,
  currency: string,
): number {
  const usd = Math.max(0, Number(minDepositUsd) || 0);
  const fx = rate > 0 ? rate : 1;
  const raw = usd * fx;
  if (currency === "USD") {
    return Math.max(0.01, Math.ceil(raw * 100) / 100);
  }
  if (currency === "IDR") {
    return Math.max(1000, Math.ceil(raw / 1000) * 1000);
  }
  if (currency === "INR" || currency === "NPR") {
    return Math.max(10, Math.ceil(raw / 10) * 10);
  }
  return Math.max(1, Math.ceil(raw));
}

/**
 * Amount chips: first = local minimum, then a few larger presets (≥ min).
 */
export function buildQuickAmounts(
  minLocal: number,
  currency: string,
  presets: number[],
): number[] {
  const min =
    currency === "USD"
      ? Math.round(minLocal * 100) / 100
      : Math.max(1, Math.ceil(minLocal));

  const above = presets
    .map((p) => (currency === "USD" ? Math.round(p * 100) / 100 : Math.round(p)))
    .filter((p) => p > min + (currency === "USD" ? 0.001 : 0));

  const out: number[] = [min];
  for (const p of above) {
    if (out.length >= 4) break;
    if (!out.some((x) => Math.abs(x - p) < 0.001)) out.push(p);
  }

  // If presets were all below min, step up from min.
  const steps = [2, 5, 10];
  for (const mult of steps) {
    if (out.length >= 4) break;
    const next =
      currency === "USD"
        ? Math.round(min * mult * 100) / 100
        : Math.round(min * mult);
    if (!out.some((x) => Math.abs(x - next) < 0.001)) out.push(next);
  }
  return out.slice(0, 4);
}

export function formatAmountInput(amount: number, currency: string) {
  if (currency === "USD") {
    return (Math.round(amount * 100) / 100).toFixed(2);
  }
  return String(Math.round(amount));
}

export function formatPayAmount(
  amount: number,
  currency: string,
  symbolOverride?: string,
) {
  const code = (currency || "USD").toUpperCase();
  const symbol = symbolOverride?.trim();
  if (code === "INR") {
    const n = amount.toLocaleString("en-IN");
    return symbol ? `${symbol}${n}` : `₹${n}`;
  }
  if (code === "IDR") {
    const n = Math.round(amount).toLocaleString("en-US");
    return symbol ? `${symbol} ${n}` : `Rp ${n}`;
  }
  if (code === "NPR") {
    const n = Math.round(amount).toLocaleString("en-US");
    return symbol ? `${symbol} ${n}` : `रु ${n}`;
  }
  if (code === "USD") {
    const n = Number(amount).toFixed(2);
    return symbol ? `${symbol}${n}` : `$${n}`;
  }
  const n =
    Number.isInteger(amount) || Math.abs(amount) >= 100
      ? Math.round(amount).toLocaleString("en-US")
      : Number(amount).toFixed(2);
  return symbol ? `${symbol} ${n}` : `${n} ${code}`;
}

export function formatCountdownLabel(
  expiresAt: string | null | undefined,
  now: number,
) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function remainingSeconds(
  expiresAt: string | null | undefined,
  now: number,
) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
}

/** Map stored failReason codes / snake_case → customer-facing copy. */
export function formatDepositFailReason(
  reason: string | null | undefined,
  status?: string,
): string {
  const raw = (reason ?? "").trim();
  const key = raw.toLowerCase().replace(/[\s-]+/g, "_");

  const byCode: Record<string, string> = {
    cancelled_by_user: "You cancelled this top-up. Nothing was charged.",
    canceled_by_user: "You cancelled this top-up. Nothing was charged.",
    expired: "This ticket expired before payment was confirmed.",
    rejected: "This deposit was rejected. Contact support if that looks wrong.",
    rejected_by_admin: "An admin rejected this deposit.",
    payment_failed: "Payment failed. You can start a new top-up.",
    failed: "Payment failed. You can start a new top-up.",
    user_dropped: "Checkout was closed before payment finished.",
  };

  if (key && byCode[key]) return byCode[key];

  if (raw && !/^[a-z0-9_]+$/i.test(raw)) return raw;

  if (status === "CANCELLED") {
    return "This top-up was cancelled. Nothing was charged.";
  }
  if (status === "EXPIRED") {
    return "This ticket expired before payment was confirmed.";
  }
  if (status === "REJECTED") {
    return "This deposit was rejected. Contact support if that looks wrong.";
  }
  if (status === "FAILED") {
    return "Payment failed. You can start a new top-up.";
  }

  return raw || "This deposit is no longer active.";
}

export function closedDepositTitle(status: string, adminAction?: string | null): string {
  if (status === "REJECTED" || adminAction === "rejected") {
    return "Rejected";
  }
  switch (status) {
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    case "FAILED":
      return "Failed";
    default:
      return "Ticket closed";
  }
}
