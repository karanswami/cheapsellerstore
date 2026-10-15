import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Hex-only body — no `-`/`_` so keys stay clean to copy/paste (Stripe-style). */
function randomHexToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function generateApiKeySecret(mode: "LIVE" | "SANDBOX"): {
  secret: string;
  prefix: string;
  hash: string;
} {
  const tag = mode === "LIVE" ? "live" : "test";
  // drip_sk_live_<64 hex> · drip_sk_test_<64 hex>  (256-bit)
  const secret = `drip_sk_${tag}_${randomHexToken(32)}`;
  const prefix = `${secret.slice(0, 22)}…`;
  return { secret, prefix, hash: sha256Hex(secret) };
}

export function generateWebhookSecret(): {
  secret: string;
  prefix: string;
  hash: string;
} {
  // drip_whsec_<64 hex>
  const secret = `drip_whsec_${randomHexToken(32)}`;
  const prefix = `${secret.slice(0, 20)}…`;
  return { secret, prefix, hash: sha256Hex(secret) };
}

export function signWebhookPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

export function newRequestId(): string {
  return `req_${randomBytes(12).toString("hex")}`;
}
