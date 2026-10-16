import { PageHeader } from "@/components/app-ui";
import { getCurrentUser } from "@/lib/auth/customer";
import { listActiveBroadcastsForRole } from "@/lib/broadcasts";
import { BroadcastClient } from "./broadcast-client";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const user = (await getCurrentUser())!;
  const items = await listActiveBroadcastsForRole(user.role).catch(() => []);
  return (
    <>
      <PageHeader title="Broadcast" subtitle="Announcements, offers and updates from the team." />
      <BroadcastClient items={items} />
    </>
  );
}
