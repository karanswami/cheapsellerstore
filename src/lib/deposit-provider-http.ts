import "server-only";
import crypto from "crypto";
import {
  getBinanceApiKey,
  getBinancePayId,
  getBinanceSecretKey,
  requireConfigured,
} from "@/lib/payment-provider-config";

const BINANCE_BASE_URL = "https://api.binance.com";

function looksLikeImageAsset(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:image/")) return true;
  if (trimmed.startsWith("/")) return true;

  try {
    const url = new URL(trimmed);
    if (!["https:", "http:"].includes(url.protocol)) return false;
    return /\.(png|jpe?g|webp|svg)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

export function makeSecretCode(prefix = "WEB") {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${random}`;
}

export function makeOrderId(prefix = "DEP") {
  // Keep strictly alphanumeric <= 40 chars for provider compatibility.
  const safePrefix = prefix.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) || "DEP";
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `${safePrefix}${stamp}${random}`.slice(0, 40);
}

/** Binance rejected the signed request because of clock drift / recvWindow (code -1021). */
export class BinanceTimestampError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BinanceTimestampError";
  }
}

export type BinanceTransaction = {
  amount?: string | number;
  currency?: string;
  note?: string;
  memo?: string;
  transactionId?: string;
  orderId?: string;
  transactionTime?: number;
  createTime?: number;
};

export async function getBinancePayTransactions(limit = 100, startTime?: number) {
  const [apiKeyRaw, secretKeyRaw] = await Promise.all([
    getBinanceApiKey(),
    getBinanceSecretKey(),
  ]);
  const apiKey = await requireConfigured(apiKeyRaw, "BINANCE_API_KEY");
  const secretKey = await requireConfigured(secretKeyRaw, "BINANCE_SECRET_KEY");
  const params = new URLSearchParams({
    timestamp: String(Date.now()),
    limit: String(Math.min(Math.max(limit, 1), 100)),
    recvWindow: "5000",
  });
  if (startTime && Number.isFinite(startTime) && startTime > 0) {
    params.set("startTime", String(Math.floor(startTime)));
  }
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(params.toString())
    .digest("hex");

  const res = await fetch(
    `${BINANCE_BASE_URL}/sapi/v1/pay/transactions?${params.toString()}&signature=${signature}`,
    {
      headers: { "X-MBX-APIKEY": apiKey },
      cache: "no-store",
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.code !== "000000") {
    const message = String(
      data?.msg || data?.message || "Binance transaction fetch failed.",
    );
    if (Number(data?.code) === -1021 || /recvWindow|timestamp/i.test(message)) {
      throw new BinanceTimestampError(message);
    }
    throw new Error(message);
  }
  return Array.isArray(data.data) ? (data.data as BinanceTransaction[]) : [];
}

export async function getBinancePayMeta() {
  const configuredQr = process.env.BINANCE_QR_URL?.trim() ?? "";
  const qrUrl = looksLikeImageAsset(configuredQr)
    ? configuredQr
    : "/binance-pay-qr.png";

  return {
    payId: await getBinancePayId(),
    qrUrl,
  };
}

/**
 * @deprecated RamaShop QRIS history polling is decommissioned.
 * AutoGoPay QRIS is fully webhook-driven. Retained as an empty stub for cron backwards compatibility.
 */
export async function getQrisHistory(): Promise<Record<string, unknown>[]> {
  return [];
}
