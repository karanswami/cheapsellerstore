import "server-only";
import crypto from "crypto";
import {
  getCashfreeAppId,
  getCashfreeEnv,
  getCashfreeSecretKey,
  getCashfreeWebhookSecret,
  requireConfigured,
  type CashfreeEnvMode,
} from "@/lib/payment-provider-config";

/** Latest PG API version — https://www.cashfree.com/docs/api-reference/payments/latest/overview */
const API_VERSION = "2025-01-01";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3102").replace(
    /\/$/,
    "",
  );
}

export async function cashfreeMode(): Promise<CashfreeEnvMode> {
  return getCashfreeEnv();
}

async function cashfreeBaseUrl() {
  return (await cashfreeMode()) === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

/** Cashfree production rejects non-HTTPS return_url / notify_url. */
async function cashfreePublicUrl() {
  const origin = appUrl();
  if ((await cashfreeMode()) === "production" && origin.startsWith("http://")) {
    return `https://${origin.slice("http://".length)}`;
  }
  return origin;
}

async function cashfreeHeaders() {
  const [appId, secretKey] = await Promise.all([
    getCashfreeAppId(),
    getCashfreeSecretKey(),
  ]);
  return {
    "Content-Type": "application/json",
    "x-api-version": API_VERSION,
    "x-client-id": await requireConfigured(appId, "CASHFREE_APP_ID"),
    "x-client-secret": await requireConfigured(secretKey, "CASHFREE_SECRET_KEY"),
  };
}

/** Extract a human-readable error from Cashfree v5 error bodies. */
function cashfreeErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.message === "string" && obj.message.trim()) {
    return obj.message.trim();
  }
  if (typeof obj.code === "string" && obj.code.trim()) {
    return obj.code.trim();
  }
  const nested = obj.error;
  if (nested && typeof nested === "object") {
    const err = nested as Record<string, unknown>;
    if (typeof err.message === "string" && err.message.trim()) {
      return err.message.trim();
    }
    if (typeof err.code === "string" && err.code.trim()) {
      return err.code.trim();
    }
  }
  if (Array.isArray(obj.details) && obj.details.length > 0) {
    const first = obj.details[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object") {
      const d = first as Record<string, unknown>;
      if (typeof d.message === "string" && d.message.trim()) {
        return d.message.trim();
      }
    }
  }
  return fallback;
}

export type CashfreeOrderCreateResponse = {
  cf_order_id?: number | string;
  order_id: string;
  entity?: string;
  order_currency?: string;
  order_amount?: number;
  order_status?: string;
  payment_session_id: string;
};

export type CashfreeOrder = {
  cf_order_id?: number | string;
  order_id: string;
  order_status?: string;
  order_amount?: number;
  order_currency?: string;
  payment_session_id?: string;
};

export type CashfreePayment = {
  cf_payment_id?: number | string;
  order_id?: string;
  payment_status?: string;
  payment_amount?: number;
  payment_currency?: string;
  payment_time?: string;
  payment_message?: string;
  bank_reference?: string;
  payment_group?: string;
  payment_method?: Record<string, unknown>;
};

function normalizePhone(phone?: string | null) {
  const digits = String(phone || "")
    .replace(/^\+91/, "")
    .replace(/\D/g, "")
    .slice(-10);
  if (digits.length === 10) return digits;
  // Cashfree requires a 10-digit phone; use a stable placeholder when unset.
  return "9999999999";
}

export async function createCashfreeOrder(options: {
  orderId: string;
  amountInr: number;
  customerId: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
}) {
  const [origin, mode, baseUrl, headers] = await Promise.all([
    cashfreePublicUrl(),
    cashfreeMode(),
    cashfreeBaseUrl(),
    cashfreeHeaders(),
  ]);
  if (mode === "production" && !origin.startsWith("https://")) {
    throw new Error(
      "Cashfree production requires NEXT_PUBLIC_APP_URL to be https:// (return/notify URLs).",
    );
  }
  const returnUrl = `${origin}/app/deposit?deposit=success&order={order_id}`;
  const notifyUrl = `${origin}/api/webhooks/cashfree`;

  const body = {
    order_id: options.orderId,
    order_amount: Math.round(options.amountInr * 100) / 100,
    order_currency: "INR",
    customer_details: {
      customer_id: options.customerId.slice(0, 50),
      customer_phone: normalizePhone(options.customerPhone),
      customer_email: options.customerEmail || undefined,
      customer_name: options.customerName || undefined,
    },
    order_meta: {
      return_url: returnUrl,
      notify_url: notifyUrl,
      payment_methods: "cc,dc,upi",
    },
    order_note: `wallet_deposit|${options.customerId}|${options.orderId}`.slice(
      0,
      200,
    ),
  };

  const res = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as CashfreeOrderCreateResponse;

  if (!res.ok || !data.payment_session_id || !data.order_id) {
    throw new Error(cashfreeErrorMessage(data, "Cashfree order create failed."));
  }

  return data;
}

export async function getCashfreeOrder(orderId: string) {
  const [baseUrl, headers] = await Promise.all([
    cashfreeBaseUrl(),
    cashfreeHeaders(),
  ]);
  const res = await fetch(
    `${baseUrl}/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      cashfreeErrorMessage(data, "Cashfree order fetch failed."),
    );
  }
  return data as CashfreeOrder;
}

export async function getCashfreeOrderPayments(orderId: string) {
  const [baseUrl, headers] = await Promise.all([
    cashfreeBaseUrl(),
    cashfreeHeaders(),
  ]);
  const res = await fetch(
    `${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      cashfreeErrorMessage(data, "Cashfree payments fetch failed."),
    );
  }
  if (!Array.isArray(data)) return [] as CashfreePayment[];
  return data as CashfreePayment[];
}

export function summarizeCashfreePayments(payments: CashfreePayment[]) {
  const success = payments.find(
    (p) => String(p.payment_status || "").toUpperCase() === "SUCCESS",
  );
  if (success) {
    return {
      status: "success" as const,
      paidAmount: Number(success.payment_amount ?? 0),
      reference: String(
        success.cf_payment_id || success.bank_reference || "",
      ),
      payment: success,
    };
  }

  const failed = payments.find((p) =>
    ["FAILED", "USER_DROPPED", "CANCELLED", "CANCELED"].includes(
      String(p.payment_status || "").toUpperCase(),
    ),
  );
  if (
    failed &&
    payments.every((p) => {
      const s = String(p.payment_status || "").toUpperCase();
      return [
        "FAILED",
        "USER_DROPPED",
        "CANCELLED",
        "CANCELED",
        "NOT_ATTEMPTED",
      ].includes(s);
    })
  ) {
    return {
      status: "failed" as const,
      paidAmount: Number(failed.payment_amount ?? 0),
      reference: String(failed.cf_payment_id || failed.bank_reference || ""),
      payment: failed,
    };
  }

  return {
    status: "pending" as const,
    paidAmount: 0,
    reference: "",
    payment: null,
  };
}

function hmacMatches(
  secret: string,
  rawBody: string,
  timestamp: string,
  signature: string,
) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(timestamp + rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Cashfree: HMAC-SHA256(timestamp + rawBody, secret) → base64.
 * Prefers dashboard webhook secret, then API client secret.
 * @see https://www.cashfree.com/docs/payments/online/webhooks/overview
 */
export async function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
) {
  if (!timestamp || !signature) return false;
  const [webhookSecret, apiSecret] = await Promise.all([
    getCashfreeWebhookSecret(),
    getCashfreeSecretKey(),
  ]);
  if (
    webhookSecret &&
    hmacMatches(webhookSecret, rawBody, timestamp, signature)
  ) {
    return true;
  }
  if (apiSecret && hmacMatches(apiSecret, rawBody, timestamp, signature)) {
    return true;
  }
  return false;
}
