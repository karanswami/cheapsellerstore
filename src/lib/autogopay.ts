import "server-only";
import crypto from "crypto";
import QRCode from "qrcode";
import {
  getAutogopayApiKey,
  getAutogopayBaseUrl,
  requireConfigured,
} from "@/lib/payment-provider-config";

export type AutogopayTransactionResponse = {
  transactionId: string;
  orderId: string;
  amount: number;
  qrString: string;
  qrImage: string;
  checkoutUrl?: string;
  expiryTime?: string;
};

type AutogopayRawResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    transaction_id?: string;
    order_id?: string;
    amount?: number | string;
    transaction_status?: string;
    qr_string?: string;
    qr_url?: string;
    checkout_url?: string;
    expiry_time?: string;
  };
};

/**
 * Creates an AutoGoPay dynamic QRIS (POST /qris/generate).
 * Amount must be between 1 and 10,000,000 IDR; the gateway assigns its own
 * transaction_id / order_id.
 */
export async function createAutogopayTransaction(options: {
  amountIdr: number;
}): Promise<AutogopayTransactionResponse> {
  const amount = Math.round(options.amountIdr);
  if (amount < 1 || amount > 10_000_000) {
    throw new Error(
      "AutoGoPay QRIS transaction amount must be between 1 and 10,000,000 IDR.",
    );
  }

  const [apiKeyRaw, baseUrl] = await Promise.all([
    getAutogopayApiKey(),
    getAutogopayBaseUrl(),
  ]);
  const apiKey = await requireConfigured(apiKeyRaw, "AUTOGOPAY_API_KEY");

  const res = await fetch(`${baseUrl}/qris/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: JSON.stringify({ amount }),
    cache: "no-store",
  });

  const raw = (await res.json().catch(() => ({}))) as AutogopayRawResponse;
  const data = raw.data ?? {};
  const qrString =
    typeof data.qr_string === "string" ? data.qr_string.trim() : "";
  const transactionId = String(data.transaction_id || "").trim();

  if (!res.ok || raw.success === false || !qrString || !transactionId) {
    console.error("AUTOGOPAY_CREATE_TRANSACTION_FAILED", {
      status: res.status,
      amount,
      response: raw,
    });
    throw new Error(
      raw.message ||
        raw.error ||
        `AutoGoPay transaction creation failed (HTTP ${res.status})`,
    );
  }

  const qrImage = await QRCode.toDataURL(qrString, { width: 360, margin: 1 });

  return {
    transactionId,
    orderId: String(data.order_id || transactionId).trim(),
    amount: Number(data.amount ?? amount),
    qrString,
    qrImage,
    checkoutUrl: data.checkout_url || undefined,
    expiryTime:
      typeof data.expiry_time === "string" ? data.expiry_time : undefined,
  };
}

/**
 * Verifies the AutoGoPay webhook `X-Signature` header:
 * HMAC-SHA256 of the raw request body, keyed with the API key (hex digest).
 */
export async function verifyAutogopayWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
): Promise<boolean> {
  if (!signature || typeof signature !== "string") return false;
  const apiKey = (await getAutogopayApiKey()).trim();
  if (!apiKey) return false;

  const expected = Buffer.from(
    crypto.createHmac("sha256", apiKey).update(rawBody).digest("hex"),
    "utf8",
  );
  const provided = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return (
    expected.length === provided.length &&
    crypto.timingSafeEqual(expected, provided)
  );
}

export type AutogopayStatus = "pending" | "settlement" | "expire" | "cancel" | "unknown";

export type AutogopayCheckResult = {
  status: AutogopayStatus;
  paidAmount?: number;
  rawStatus?: string;
};

/**
 * Checks a QRIS transaction (POST /qris/status). Documented statuses:
 * pending, settlement (paid), expire, cancel. The response body shape is read
 * defensively to handle variations (e.g. status: "paid", "success", "settlement").
 */
export async function checkAutogopayStatus(
  transactionId: string,
  orderId?: string,
): Promise<AutogopayCheckResult> {
  const [apiKeyRaw, baseUrl] = await Promise.all([
    getAutogopayApiKey(),
    getAutogopayBaseUrl(),
  ]);
  const apiKey = await requireConfigured(apiKeyRaw, "AUTOGOPAY_API_KEY");

  const payload: Record<string, string> = { transaction_id: transactionId };
  if (orderId && orderId !== transactionId) {
    payload.order_id = orderId;
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/qris/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.warn("AUTOGOPAY_STATUS_FETCH_FAILED", { transactionId, orderId, err });
    return { status: "unknown", rawStatus: "network_error" };
  }

  const raw = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    status?: unknown;
    transaction_status?: unknown;
    data?: {
      status?: unknown;
      transaction_status?: unknown;
      payment_status?: unknown;
      order_status?: unknown;
      amount?: number | string;
      paid_amount?: number | string;
    };
  };

  if (!res.ok) {
    console.warn(`AUTOGOPAY_STATUS_CHECK_HTTP_${res.status}`, {
      transactionId,
      orderId,
      response: raw,
    });
    return { status: "unknown", rawStatus: `HTTP_${res.status}` };
  }

  const valRaw =
    raw.data?.transaction_status ??
    raw.data?.status ??
    raw.data?.payment_status ??
    raw.data?.order_status ??
    raw.transaction_status ??
    raw.status ??
    "";
  const rawStatus = String(valRaw).trim();
  const value = rawStatus.toLowerCase();

  const amountVal = raw.data?.paid_amount ?? raw.data?.amount;
  const paidAmount =
    amountVal !== undefined && amountVal !== null && !Number.isNaN(Number(amountVal))
      ? Number(amountVal)
      : undefined;

  if (
    value === "settlement" ||
    value === "paid" ||
    value === "success" ||
    value === "completed" ||
    value === "berhasil"
  ) {
    return { status: "settlement", paidAmount, rawStatus };
  }
  if (
    value === "pending" ||
    value === "waiting" ||
    value === "unpaid" ||
    value === "menunggu" ||
    value === "process" ||
    value === "processing"
  ) {
    return { status: "pending", paidAmount, rawStatus };
  }
  if (
    value === "expire" ||
    value === "expired" ||
    value === "kadaluarsa"
  ) {
    return { status: "expire", paidAmount, rawStatus };
  }
  if (
    value === "cancel" ||
    value === "cancelled" ||
    value === "canceled" ||
    value === "batal" ||
    value === "failed" ||
    value === "gagal"
  ) {
    return { status: "cancel", paidAmount, rawStatus };
  }

  return { status: "unknown", paidAmount, rawStatus };
}
