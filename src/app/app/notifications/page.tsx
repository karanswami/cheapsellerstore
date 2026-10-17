import { getCurrentUser } from "@/lib/auth/customer";
import { listNotifications } from "@/lib/notifications";
import { NotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = (await getCurrentUser())!;
  const first = await listNotifications(user.id, { filter: "all", limit: 20 }).catch(() => ({
    items: [],
    unread: 0,
    nextCursor: null,
  }));
  return <NotificationsClient initial={first} />;
}
