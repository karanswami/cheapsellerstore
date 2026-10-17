import { getCurrentUser } from "@/lib/auth/customer";
import { getUserActivityHistoryPage, getUserActivitySummary } from "@/lib/history";
import { HistoryClient } from "./history-client";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = (await getCurrentUser())!;
  const [first, summary] = await Promise.all([
    getUserActivityHistoryPage(user.id, { limit: 50 }).catch(() => ({
      items: [],
      page: 1,
      limit: 50,
      hasMore: false,
    })),
    getUserActivitySummary(user.id).catch(() => null),
  ]);
  // The statement card carries the page title.
  return <HistoryClient initial={first} summary={summary} />;
}
