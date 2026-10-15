import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid JSON payload.", 400);
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid subscription payload.", 400);
  }

  const user = await getCurrentUser();
  const { endpoint, keys } = parsed.data;
  const userAgent = request.headers.get("user-agent") || null;

  try {
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: user?.id ?? null,
        userAgent,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: user?.id ?? null,
        userAgent,
      },
    });

    return jsonOk({ success: true, id: sub.id });
  } catch (err) {
    console.warn("[push-subscribe] error:", err);
    return jsonError("DB_ERROR", "Could not save push subscription.", 500);
  }
}
