import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  audienceUserWhere,
  createBroadcast,
  listBroadcastsAdmin,
} from "@/lib/broadcasts";
import { notifyMany } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { broadcastWebPush } from "@/lib/web-push";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2000),
  actionUrl: z.string().trim().max(500).optional().nullable(),
  audience: z.enum(["ALL", "USER", "SELLER", "ADMIN"]).default("ALL"),
  notify: z.boolean().optional().default(true),
  sendWebPush: z.boolean().optional().default(true),
  active: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "20");
  const result = await listBroadcastsAdmin({ page, limit });
  return jsonOk(result);
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid payload.", 400);

  const broadcast = await createBroadcast({
    title: parsed.data.title,
    message: parsed.data.message,
    actionUrl: parsed.data.actionUrl,
    audience: parsed.data.audience,
    createdById: admin.id,
    active: parsed.data.active,
  });

  let sent = 0;
  let webPushSent = 0;

  const targetUsers = (parsed.data.notify || parsed.data.sendWebPush)
    ? await prisma.user.findMany({
        where: audienceUserWhere(parsed.data.audience),
        select: { id: true },
      })
    : [];

  const targetUserIds = targetUsers.map((u) => u.id);

  if (parsed.data.notify && targetUserIds.length > 0) {
    sent = await notifyMany(targetUserIds, {
      type: "broadcast",
      title: parsed.data.title,
      message: parsed.data.message,
      actionUrl: parsed.data.actionUrl ?? "/app/broadcast",
      skipWebPush: Boolean(parsed.data.sendWebPush && parsed.data.active),
    });
  }

  if (parsed.data.sendWebPush && parsed.data.active) {
    const pushRes = await broadcastWebPush(
      {
        title: parsed.data.title,
        body: parsed.data.message.slice(0, 200),
        url: parsed.data.actionUrl || "/app/broadcast",
      },
      parsed.data.audience === "ALL" ? undefined : { userIds: targetUserIds },
    );
    webPushSent = pushRes.sent;
  }

  return jsonOk({ broadcast, sent, webPushSent });
}
