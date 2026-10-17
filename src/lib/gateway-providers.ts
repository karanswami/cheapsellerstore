/** Client-safe description of the auto payment provider kinds a gateway can be built on. */

export type GatewayProvider = "QRIS" | "BINANCE" | "UPI" | "ESEWA" | "NASIONALPAY";

/** Only Binance is offered for now; QRIS / UPI / eSewa stay defined but are not creatable or listed. */
export const GATEWAY_PROVIDERS: GatewayProvider[] = ["BINANCE", "NASIONALPAY"];

export type CredField = {
  key: string;
  label: string;
  secret?: boolean;
  required?: boolean;
  /** Renders a sandbox/production picker instead of a text box. */
  env?: boolean;
  /** Renders a dropdown with these options instead of a text box. */
  options?: { value: string; label: string }[];
};

export type ProviderMeta = {
  label: string;
  via: string;
  /** Set when the provider only settles in one currency. */
  lockedCurrency?: string;
  defaultCurrency: string;
  /** Static QR shown on the ticket (customer pays, then the deposit is matched). */
  qr: boolean;
  fields: CredField[];
  /** Always present: can be switched Live / Maintenance / Off but never deleted. */
  permanent?: boolean;
  /** Customer pay target: a QR upload or a Pay ID, at least one of them. */
  payTarget?: { key: string; label: string };
  /** Callback URL path the admin must register in the provider's panel. */
  webhookPath?: string;
};

export const PROVIDER_META: Record<GatewayProvider, ProviderMeta> = {
  QRIS: {
    label: "QRIS",
    via: "AutoGoPay",
    lockedCurrency: "IDR",
    defaultCurrency: "IDR",
    qr: false,
    fields: [
      { key: "autogopayBaseUrl", label: "Base URL" },
      { key: "autogopayApiKey", label: "API key", secret: true, required: true },
    ],
  },
  UPI: {
    label: "UPI",
    via: "FamGateway / Cashfree",
    lockedCurrency: "INR",
    defaultCurrency: "INR",
    qr: false,
    fields: [
      { key: "famgatewayBaseUrl", label: "FamGateway base URL" },
      { key: "famgatewayApiKey", label: "FamGateway API key", secret: true, required: true },
      { key: "cashfreeAppId", label: "Cashfree app ID" },
      { key: "cashfreeSecretKey", label: "Cashfree secret key", secret: true },
      { key: "cashfreeWebhookSecret", label: "Cashfree webhook secret", secret: true },
      { key: "cashfreeEnv", label: "Cashfree environment", env: true },
    ],
  },
  BINANCE: {
    label: "Binance Pay",
    via: "Binance API",
    lockedCurrency: "USD",
    defaultCurrency: "USD",
    qr: true,
    permanent: true,
    payTarget: { key: "binancePayId", label: "Binance Pay ID" },
    fields: [
      { key: "binanceApiKey", label: "API key", secret: true, required: true },
      { key: "binanceSecretKey", label: "Secret key", secret: true, required: true },
    ],
  },
  NASIONALPAY: {
    label: "QRIS / DANA",
    via: "NasionalPay",
    webhookPath: "/api/webhooks/nasionalpay",
    lockedCurrency: "IDR",
    defaultCurrency: "IDR",
    qr: false,
    fields: [
      { key: "nasionalpayKey", label: "Store key", secret: true, required: true },
      {
        key: "nasionalpayChannel",
        label: "Channel",
        options: [
          { value: "QRIS", label: "QRIS (scan QR)" },
          { value: "FUNDS", label: "DANA (pay link)" },
        ],
      },
    ],
  },
  ESEWA: {
    label: "eSewa",
    via: "Static QR + proof",
    defaultCurrency: "NPR",
    qr: true,
    fields: [],
  },
};

export const GATEWAY_CRED_KEYS = new Set(
  GATEWAY_PROVIDERS.flatMap((p) => [
    ...PROVIDER_META[p].fields.map((f) => f.key),
    ...(PROVIDER_META[p].payTarget ? [PROVIDER_META[p].payTarget!.key] : []),
  ]),
);

export type GatewayStatus = "live" | "maintenance" | "off";
