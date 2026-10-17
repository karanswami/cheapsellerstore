import { appendSupportInboxMessage } from "@/lib/support-inbox";
import { prisma } from "@/lib/prisma";
import { broadcastWebPush, sendWebPushToUser } from "@/lib/web-push";
import {
  NOTIFICATION_CATEGORIES,
  notificationCategory,
  typesForCategory,
  type NotificationCategory,
  type NotificationPage,
  type NotificationView,
} from "@/lib/notification-kinds";
import type { Prisma } from "@prisma/client";

export type NotifyUserInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  skipWebPush?: boolean;
};

/** Create a Notification, mirror it into the support chat inbox, and dispatch Web Push. */
export async function notifyUser(input: NotifyUserInput) {
  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 120),
      message: input.message.slice(0, 2000),
      actionUrl: input.actionUrl ?? null,
    },
  });

  const content = `${row.title}\n${row.message}`;
  const buttons = row.actionUrl
    ? [{ id: "notif-open", label: "Open", href: row.actionUrl }]
    : undefined;

  await appendSupportInboxMessage({
    userId: input.userId,
    role: "notification",
    content,
    buttons,
    notificationId: row.id,
    read: false,
  });

  // Non-blocking Web Push delivery to user's subscribed devices (unless skipped)
  if (!input.skipWebPush) {
    void sendWebPushToUser(input.userId, {
      title: input.title,
      body: input.message,
      url: input.actionUrl ?? "/app/notifications",
      tag: row.id,
      data: { notificationId: row.id, type: input.type },
    }).catch((err) => {
      console.warn("[web-push] Delivery failed for user notification:", err);
    });
  }

  return row;
}

export async function notifyMany(
  userIds: string[],
  input: Omit<NotifyUserInput, "userId">,
) {
  let sent = 0;
  // Sequential batches keep Mongo createMany + inbox inserts consistent.
  const chunk = 40;
  for (let i = 0; i < userIds.length; i += chunk) {
    const slice = userIds.slice(i, i + chunk);
    await Promise.all(
      slice.map(async (userId) => {
        await notifyUser({ ...input, userId });
        sent += 1;
      }),
    );
  }
  return sent;
}

/**
 * Same notification for many users in one go (admin broadcasts, promos):
 * bulk insert + one web push fan-out, without mirroring into every support inbox.
 */
export async function notifyBulk(
  userIds: string[],
  input: Omit<NotifyUserInput, "userId">,
) {
  const data = {
    type: input.type,
    title: input.title.slice(0, 120),
    message: input.message.slice(0, 2000),
    actionUrl: input.actionUrl ?? null,
  };
  const chunk = 500;
  for (let i = 0; i < userIds.length; i += chunk) {
    await prisma.notification.createMany({
      data: userIds.slice(i, i + chunk).map((userId) => ({ ...data, userId })),
    });
  }
  if (!input.skipWebPush && userIds.length > 0) {
    void broadcastWebPush(
      { title: data.title, body: data.message.slice(0, 200), url: data.actionUrl ?? "/app/notifications", tag: input.type },
      { userIds },
    ).catch((err) => console.warn("[web-push] Bulk delivery failed:", err));
  }
  return userIds.length;
}

// Titles written before the bell had icons started with an emoji; the category icon replaces it now.
const LEADING_EMOJI = /^(?:\p{Extended_Pictographic}️?\s*)+/u;

function toView(row: {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: Date;
}): NotificationView {
  return {
    id: row.id,
    type: row.type,
    category: notificationCategory(row.type),
    title: row.title.replace(LEADING_EMOJI, "") || row.title,
    message: row.message,
    // older deposit notifications linked a wallet page that no longer exists
    actionUrl: row.actionUrl === "/app/wallet" ? "/app/history" : row.actionUrl,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

/** Newest-first page of a user's notifications. `filter` is "all", "unread" or a category. */
export async function listNotifications(
  userId: string,
  opts: { filter?: string; cursor?: string | null; limit?: number } = {},
): Promise<NotificationPage> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const where: Prisma.NotificationWhereInput = { userId };
  if (opts.filter === "unread") where.read = false;
  else if (opts.filter && (NOTIFICATION_CATEGORIES as readonly string[]).includes(opts.filter)) {
    const category = opts.filter as NotificationCategory;
    const types = typesForCategory(category);
    // "news" is also the fallback for types not in the map.
    where.type =
      category === "news"
        ? { notIn: NOTIFICATION_CATEGORIES.filter((c) => c !== "news").flatMap(typesForCategory) }
        : { in: types };
  }

  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    }),
    countUnreadNotifications(userId),
  ]);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toView);
  return { items, unread, nextCursor: hasMore ? items[items.length - 1].id : null };
}

/** Mark some (or all, when `ids` is omitted) of a user's notifications read. */
export async function markNotificationsRead(userId: string, ids?: string[]) {
  const res = await prisma.notification.updateMany({
    where: { userId, read: false, ...(ids ? { id: { in: ids } } : {}) },
    data: { read: true },
  });
  return res.count;
}

/** Delete one notification, or every read one when `id` is omitted. */
export async function deleteNotifications(userId: string, id?: string) {
  const res = await prisma.notification.deleteMany({
    where: id ? { userId, id } : { userId, read: true },
  });
  return res.count;
}
