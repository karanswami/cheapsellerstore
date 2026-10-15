import { prisma } from "@/lib/prisma";
import { getSettingText, getSettingInt, upsertSetting, SETTING_KEYS } from "@/lib/settings";
import webpush from "web-push";

export type WebPushPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export async function getWebPushConfig(): Promise<{
  enabled: boolean;
  publicKey: string;
  privateKey: string;
  contactEmail: string;
}> {
  let [publicKey, privateKey, contactEmail, enabledInt] = await Promise.all([
    getSettingText(SETTING_KEYS.webPushPublicKey, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
    getSettingText(SETTING_KEYS.webPushPrivateKey, process.env.VAPID_PRIVATE_KEY || ""),
    getSettingText(SETTING_KEYS.webPushContactEmail, process.env.VAPID_CONTACT_EMAIL || "admin@dripclient.dev"),
    getSettingInt(SETTING_KEYS.webPushEnabled, 1),
  ]);

  // Auto-generate VAPID keys on first initialization if missing
  if (!publicKey || !privateKey) {
    try {
      const keys = webpush.generateVAPIDKeys();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
      await Promise.all([
        upsertSetting({ key: SETTING_KEYS.webPushPublicKey, textValue: publicKey }),
        upsertSetting({ key: SETTING_KEYS.webPushPrivateKey, textValue: privateKey }),
      ]);
    } catch (e) {
      console.warn("[web-push] Failed to auto-generate VAPID keys:", e);
    }
  }

  return {
    enabled: enabledInt === 1 && Boolean(publicKey && privateKey),
    publicKey,
    privateKey,
    contactEmail: contactEmail || "mailto:admin@dripclient.dev",
  };
}

export async function getWebPushPublicKey(): Promise<string | null> {
  const config = await getWebPushConfig();
  return config.enabled ? config.publicKey : null;
}

export async function sendWebPushToSubscriptions(
  subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: WebPushPayload,
): Promise<{ sent: number; failed: number; deleted: number }> {
  const config = await getWebPushConfig();
  if (!config.enabled || !config.publicKey || !config.privateKey) {
    return { sent: 0, failed: 0, deleted: 0 };
  }

  const subject = config.contactEmail.startsWith("mailto:")
    ? config.contactEmail
    : `mailto:${config.contactEmail}`;

  webpush.setVapidDetails(subject, config.publicKey, config.privateKey);

  const stringifiedPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/pwa/icon-192.png",
    badge: payload.badge || "/pwa/icon-192.png",
    data: {
      url: payload.url || "/",
      ...(payload.data || {}),
    },
    tag: payload.tag || "drip-notification",
  });

  const deadIds: string[] = [];
  let sent = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, stringifiedPayload, {
          TTL: 86400, // 24 hours
        });
        return { ok: true, id: sub.id };
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          deadIds.push(sub.id);
        }
        throw err;
      }
    }),
  );

  for (const res of results) {
    if (res.status === "fulfilled") {
      sent++;
    } else {
      failed++;
    }
  }

  let deleted = 0;
  if (deadIds.length > 0) {
    try {
      const res = await prisma.pushSubscription.deleteMany({
        where: { id: { in: deadIds } },
      });
      deleted = res.count;
    } catch {
      // Ignore prune errors
    }
  }

  return { sent, failed, deleted };
}

export async function broadcastWebPush(
  payload: WebPushPayload,
  opts?: { userIds?: string[] },
): Promise<{ sent: number; failed: number; deleted: number }> {
  const where = opts?.userIds && opts.userIds.length > 0
    ? { userId: { in: opts.userIds } }
    : {};

  const subs = await prisma.pushSubscription.findMany({
    where,
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subs.length === 0) {
    return { sent: 0, failed: 0, deleted: 0 };
  }

  return sendWebPushToSubscriptions(subs, payload);
}

export async function sendWebPushToUser(
  userId: string,
  payload: WebPushPayload,
): Promise<{ sent: number; failed: number; deleted: number }> {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subs.length === 0) {
    return { sent: 0, failed: 0, deleted: 0 };
  }

  return sendWebPushToSubscriptions(subs, payload);
}
