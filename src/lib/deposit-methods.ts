import "server-only";
import { getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import { isDepositQrImageUrl } from "@/lib/public-uploads";
import { DepositMethod } from "@prisma/client";

export type DepositMethodId =
  | "QRIS"
  | "BINANCE"
  | "UPI"
  | "ESEWA";

export type DepositMethodConfigEntry = {
  enabled: boolean;
  /** Manual pay QR (Binance / eSewa only). Empty = use default asset. */
  qrUrl: string;
};

export type DepositMethodsConfig = Record<
  DepositMethodId,
  DepositMethodConfigEntry
>;

export const DEPOSIT_METHOD_IDS: DepositMethodId[] = [
  "QRIS",
  "BINANCE",
  "UPI",
  "ESEWA",
];

/** Rails that default to OFF (admin opts in — e.g. a manual backup rail). */
const DEFAULT_DISABLED_METHODS: DepositMethodId[] = [];

/** Methods that show a static admin-managed QR on the waiting ticket. */
export const MANUAL_QR_METHODS: DepositMethodId[] = ["BINANCE", "ESEWA"];

const DEFAULT_QR: Record<"BINANCE" | "ESEWA", string> = {
  BINANCE: "/binance-pay-qr.png",
  ESEWA: "/esewa-nepal-qr.png",
};

export function defaultDepositMethodsConfig(): DepositMethodsConfig {
  return {
    QRIS: { enabled: true, qrUrl: "" },
    BINANCE: { enabled: true, qrUrl: "" },
    UPI: { enabled: true, qrUrl: "" },
    ESEWA: { enabled: true, qrUrl: "" },
  };
}

function sanitizeQrUrl(raw: unknown, method: DepositMethodId): string {
  if (!MANUAL_QR_METHODS.includes(method)) return "";
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!isDepositQrImageUrl(trimmed)) return "";
  return trimmed;
}

export function normalizeDepositMethodsConfig(
  raw: Partial<Record<DepositMethodId, Partial<DepositMethodConfigEntry>>> | null | undefined,
): DepositMethodsConfig {
  const base = defaultDepositMethodsConfig();
  for (const id of DEPOSIT_METHOD_IDS) {
    const entry = raw?.[id];
    const defaultEnabled = !DEFAULT_DISABLED_METHODS.includes(id);
    base[id] = {
      enabled: entry?.enabled === undefined ? defaultEnabled : entry.enabled === true,
      qrUrl: sanitizeQrUrl(entry?.qrUrl, id),
    };
  }
  return base;
}

export async function getDepositMethodsConfig(): Promise<DepositMethodsConfig> {
  const raw = await getSettingText(SETTING_KEYS.depositMethods, "");
  if (!raw.trim()) return defaultDepositMethodsConfig();
  try {
    const parsed = JSON.parse(raw) as Partial<
      Record<DepositMethodId, Partial<DepositMethodConfigEntry>>
    >;
    return normalizeDepositMethodsConfig(parsed);
  } catch {
    return defaultDepositMethodsConfig();
  }
}

export async function saveDepositMethodsConfig(
  config: DepositMethodsConfig,
): Promise<DepositMethodsConfig> {
  const normalized = normalizeDepositMethodsConfig(config);
  await upsertSetting({
    key: SETTING_KEYS.depositMethods,
    textValue: JSON.stringify(normalized),
  });
  return normalized;
}

export async function isDepositMethodEnabled(
  method: DepositMethod | DepositMethodId,
): Promise<boolean> {
  const config = await getDepositMethodsConfig();
  return config[method as DepositMethodId]?.enabled !== false;
}

function envOrDefaultQr(method: "BINANCE" | "ESEWA"): string {
  if (method === "BINANCE") {
    const fromEnv = process.env.BINANCE_QR_URL?.trim() ?? "";
    if (fromEnv && isDepositQrImageUrl(fromEnv)) return fromEnv;
    if (fromEnv.startsWith("/") || fromEnv.startsWith("http")) return fromEnv;
    return DEFAULT_QR.BINANCE;
  }
  const fromEnv = process.env.ESEWA_QR_URL?.trim() ?? "";
  if (fromEnv && isDepositQrImageUrl(fromEnv)) return fromEnv;
  if (fromEnv.startsWith("/") || fromEnv.startsWith("http")) return fromEnv;
  return DEFAULT_QR.ESEWA;
}

/** Resolve display QR for manual rails — AppSetting upload wins over env/default. */
export async function resolveManualDepositQrUrl(
  method: "BINANCE" | "ESEWA",
): Promise<string> {
  const config = await getDepositMethodsConfig();
  const uploaded = config[method].qrUrl.trim();
  if (uploaded && isDepositQrImageUrl(uploaded)) return uploaded;
  return envOrDefaultQr(method);
}

/** Public subset for customer deposit page (no unused empty qr on auto rails). */
export function toPublicDepositMethods(
  config: DepositMethodsConfig,
): Record<DepositMethodId, { enabled: boolean }> {
  return {
    QRIS: { enabled: config.QRIS.enabled },
    BINANCE: { enabled: config.BINANCE.enabled },
    UPI: { enabled: config.UPI.enabled },
    ESEWA: { enabled: config.ESEWA.enabled },
  };
}
