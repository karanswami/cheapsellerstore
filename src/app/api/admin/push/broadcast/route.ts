import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { notifyBulk } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { broadcastWebPush, getWebPushConfig } from "@/lib/web-push";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin access required.", 401);
  }

  const [totalSubs, userSubs, guestSubs, config] = await Promise.all([
    prisma.pushSubscription.count(),
    prisma.pushSubscription.count({ where: { userId: { not: null } } }),
    prisma.pushSubscription.count({ where: { userId: null } }),
    getWebPushConfig(),
  ]);

  return jsonOk({
    enabled: config.enabled,
    hasPublicKey: Boolean(config.publicKey),
    totalSubs,
    userSubs,
    guestSubs,
  });
}

const pushBroadcastSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(300),
  url: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin access required.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid JSON payload.", 400);
  }

  const parsed = pushBroadcastSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid payload.", 400);
  }

  const { title, body: pushBody, url } = parsed.data;

  const result = await broadcastWebPush({
    title,
    body: pushBody,
    url: url || "/",
  });

  // Push-only sends still land in every signed-up user's bell, so nobody misses them.
  const users = await prisma.user.findMany({ where: { banned: false }, select: { id: true } });
  const inApp = await notifyBulk(
    users.map((u) => u.id),
    { type: "broadcast", title, message: pushBody, actionUrl: url || null, skipWebPush: true },
  );

  const totalSubs = await prisma.pushSubscription.count();

  return jsonOk({
    ...result,
    inApp,
    totalSubs,
  });
}
