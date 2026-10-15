import "server-only";
import crypto from "crypto";
import {
  getFamgatewayApiKey,
  getFamgatewayBaseUrl,
  isFamgatewayConfigured,
  requireConfigured,
} from "@/lib/payment-provider-config";

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://dripclientofficial.dev"
  ).replace(/\/$/, "");
}

export type FamgatewayOrderCreateResponse = {
  status: "success" | "error" | string;
  message?: string;
  data?: {
    order_id: string;
    amount: string | number;
    payable_amount: string | number;
    upi_id: string;
    qr_url: string;
    checkout_url: string;
    upi_intent: string;
    created_at_ist?: string;
    expires_at_ist?: string;
  };
};

export type FamgatewayVerifyResponse = {
  status: "success" | "pending" | "expired" | "not_found" | "error" | string;
  message?: string;
  data?: {
    order_id: string;
    transaction_id?: string;
    amount: number | string;
    utr?: string;
    sender_name?: string;
    payment_time_ist?: string;
  };
};

export async function createFamgatewayOrder(options: {
  orderId?: string;
  amountInr: number;
  customerId?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
}) {
  const [apiKey, baseUrl] = await Promise.all([
    getFamgatewayApiKey(),
    getFamgatewayBaseUrl(),
  ]);

  const validatedKey = await requireConfigured(apiKey, "FAMGATEWAY_API_KEY");
  const origin = appUrl();
  const redirectUrl = `${origin}/app/deposit?deposit=success&order={order_id}`;
  const webhookUrl = `${origin}/api/webhooks/famgateway`;

  const roundedAmount = Math.round(options.amountInr * 100) / 100;

  const payload = {
    api_key: validatedKey,
    amount: roundedAmount,
    customer_name: options.customerName || undefined,
    customer_email: options.customerEmail || undefined,
    customer_phone: options.customerPhone || undefined,
    redirect_url: redirectUrl,
    webhook_url: webhookUrl,
  };

  const res = await fetch(`${baseUrl}/api/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": validatedKey,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as FamgatewayOrderCreateResponse;

  if (!res.ok || data.status !== "success" || !data.data?.order_id) {
    const errorMsg =
      data.message ||
      (typeof data === "object" ? JSON.stringify(data) : "FamGateway order creation failed");
    throw new Error(errorMsg);
  }

  return data.data;
}

export async function verifyFamgatewayOrder(orderId: string): Promise<FamgatewayVerifyResponse> {
  const [apiKey, baseUrl] = await Promise.all([
    getFamgatewayApiKey(),
    getFamgatewayBaseUrl(),
  ]);

  const validatedKey = await requireConfigured(apiKey, "FAMGATEWAY_API_KEY");

  const res = await fetch(
    `${baseUrl}/api/verify-order.php?api_key=${encodeURIComponent(validatedKey)}&order_id=${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  const data = (await res.json().catch(() => ({
    status: "error",
    message: "Failed to parse verify response",
  }))) as FamgatewayVerifyResponse;

  return data;
}

export async function verifyFamgatewayWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature || typeof signature !== "string") return false;
  const apiKey = await getFamgatewayApiKey();
  if (!apiKey.trim()) return false;

  try {
    const expected = crypto
      .createHmac("sha256", apiKey.trim())
      .update(rawBody)
      .digest("hex")
      .toLowerCase();

    const cleanSig = signature.trim().toLowerCase();

    const expectedBuf = Buffer.from(expected, "utf8");
    const sigBuf = Buffer.from(cleanSig, "utf8");

    if (expectedBuf.length !== sigBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}
