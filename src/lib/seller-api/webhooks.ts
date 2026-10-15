import { prisma } from "@/lib/prisma";
import {
  generateWebhookSecret,
  signWebhookPayload,
} from "@/lib/seller-api/crypto";

const ORDER_FULFILLED = "order.fulfilled";

export async function listUserWebhooks(userId: string) {
  const rows = await prisma.sellerApiWebhook.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((w) => ({
    id: w.id,
    url: w.url,
    secretPrefix: w.secretPrefix,
    events: w.events,
    status: w.status,
    failCount: w.failCount,
    lastDeliveryAt: w.lastDeliveryAt?.toISOString() ?? null,
    createdAt: w.createdAt.toISOString(),
  }));
}

/**
 * Create webhook. `secretHash` stores the signing secret (server-only) so
 * deliveries can HMAC; `secretPrefix` is the public hint. Plaintext returned once.
 */
export async function createUserWebhook(input: {
  userId: string;
  url: string;
  events?: string[];
}) {
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    return { ok: false as const, code: "INVALID_URL", message: "Invalid webhook URL." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false as const, code: "INVALID_URL", message: "URL must be http(s)." };
  }

  const count = await prisma.sellerApiWebhook.count({
    where: { userId: input.userId, status: "ACTIVE" },
  });
  if (count >= 5) {
    return {
      ok: false as const,
      code: "MAX_WEBHOOKS",
      message: "Maximum of 5 active webhooks.",
    };
  }

  const { secret, prefix } = generateWebhookSecret();
  const events = (input.events?.length ? input.events : [ORDER_FULFILLED]).filter(
    (e) => e === ORDER_FULFILLED,
  );

  const row = await prisma.sellerApiWebhook.create({
    data: {
      userId: input.userId,
      url: parsed.toString(),
      secretHash: secret,
      secretPrefix: prefix,
      events,
    },
  });

  return {
    ok: true as const,
    webhook: {
      id: row.id,
      url: row.url,
      secretPrefix: row.secretPrefix,
      events: row.events,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    },
    secret,
  };
}

export async function deleteUserWebhook(userId: string, id: string) {
  const row = await prisma.sellerApiWebhook.findFirst({ where: { id, userId } });
  if (!row) {
    return { ok: false as const, code: "NOT_FOUND", message: "Webhook not found." };
  }
  await prisma.sellerApiWebhook.update({
    where: { id },
    data: { status: "DISABLED" },
  });
  return { ok: true as const };
}

export async function dispatchOrderFulfilledWebhooks(
  userId: string,
  orderPayload: unknown,
) {
  const hooks = await prisma.sellerApiWebhook.findMany({
    where: {
      userId,
      status: "ACTIVE",
      events: { has: ORDER_FULFILLED },
    },
  });

  const body = JSON.stringify({
    event: ORDER_FULFILLED,
    data: orderPayload,
  });

  for (const hook of hooks) {
    try {
      const signature = signWebhookPayload(hook.secretHash, body);
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Drip-Event": ORDER_FULFILLED,
          "X-Drip-Signature": signature,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await prisma.sellerApiWebhook.update({
        where: { id: hook.id },
        data: { failCount: 0, lastDeliveryAt: new Date() },
      });
    } catch {
      await prisma.sellerApiWebhook.update({
        where: { id: hook.id },
        data: {
          failCount: { increment: 1 },
          lastDeliveryAt: new Date(),
        },
      });
    }
  }
}
