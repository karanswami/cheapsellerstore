import { appendSupportInboxMessage } from "@/lib/support-inbox";
import { prisma } from "@/lib/prisma";
import { sendWebPushToUser } from "@/lib/web-push";

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
      url: input.actionUrl ?? "/app",
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
