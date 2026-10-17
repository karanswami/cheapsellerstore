import { validatePublicWebhookUrl, safePost } from "@/lib/safe-fetch";
import { decryptSecret, encryptSecret } from "@/lib/auth/crypto-secret";

/** Marks a signing secret stored encrypted at rest. */
const ENC_PREFIX = "enc:v1:";
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
  const checked = validatePublicWebhookUrl(input.url);
  if (!checked.ok) {
    return { ok: false as const, code: "INVALID_URL", message: checked.message };
  }
  const parsed = checked.url;

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
      secretHash: ENC_PREFIX + encryptSecret(secret),
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
      const secret = hook.secretHash.startsWith(ENC_PREFIX)
        ? decryptSecret(hook.secretHash.slice(ENC_PREFIX.length))
        : hook.secretHash; // legacy plaintext row
      if (!hook.secretHash.startsWith(ENC_PREFIX)) {
        // Upgrade legacy rows to encrypted-at-rest on first use.
        void prisma.sellerApiWebhook
          .update({ where: { id: hook.id }, data: { secretHash: ENC_PREFIX + encryptSecret(secret) } })
          .catch(() => undefined);
      }
      const signature = signWebhookPayload(secret, body);
      const res = await safePost(
        hook.url,
        body,
        {
          "Content-Type": "application/json",
          "X-Drip-Event": ORDER_FULFILLED,
          "X-Drip-Signature": signature,
        },
        8000,
      );
      if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
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
