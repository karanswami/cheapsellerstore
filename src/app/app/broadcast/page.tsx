import { BroadcastView } from "@/components/app/broadcast-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { listActiveBroadcastsForRole } from "@/lib/broadcasts";
import { redirect } from "next/navigation";

export default async function BroadcastPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/broadcast");

  const broadcasts = await listActiveBroadcastsForRole(user.role);

  return (
    <BroadcastView
      broadcasts={broadcasts.map((b) => ({
        id: b.id,
        title: b.title,
        message: b.message,
        actionUrl: b.actionUrl,
        createdAt: b.createdAt,
      }))}
    />
  );
}
