/** Client-safe description of the auto payment provider kinds a gateway can be built on. */

export type GatewayProvider = "QRIS" | "BINANCE" | "UPI" | "ESEWA";

export const GATEWAY_PROVIDERS: GatewayProvider[] = ["QRIS", "UPI", "BINANCE", "ESEWA"];

export type CredField = {
  key: string;
  label: string;
  secret?: boolean;
  required?: boolean;
  /** Renders a sandbox/production picker instead of a text box. */
  env?: boolean;
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
    defaultCurrency: "USD",
    qr: true,
    fields: [
      { key: "binancePayId", label: "Pay ID", required: true },
      { key: "binanceApiKey", label: "API key", secret: true, required: true },
      { key: "binanceSecretKey", label: "Secret key", secret: true, required: true },
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
  GATEWAY_PROVIDERS.flatMap((p) => PROVIDER_META[p].fields.map((f) => f.key)),
);

export type GatewayStatus = "live" | "maintenance" | "off";
