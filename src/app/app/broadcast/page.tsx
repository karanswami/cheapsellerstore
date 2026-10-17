import { getCurrentUser } from "@/lib/auth/customer";
import { listActiveBroadcastsForRole } from "@/lib/broadcasts";
import { BroadcastClient } from "./broadcast-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Broadcast" };

export default async function BroadcastPage() {
  const user = (await getCurrentUser())!;
  const items = await listActiveBroadcastsForRole(user.role).catch(() => []);
  return <BroadcastClient items={items} />;
}
