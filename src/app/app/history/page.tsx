import { PageHeader } from "@/components/app-ui";
import { getCurrentUser } from "@/lib/auth/customer";
import { getUserActivityHistoryPage } from "@/lib/history";
import { HistoryClient } from "./history-client";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = (await getCurrentUser())!;
  const first = await getUserActivityHistoryPage(user.id, { limit: 50 }).catch(() => ({
    items: [],
    page: 1,
    limit: 50,
    hasMore: false,
  }));
  return (
    <>
      <PageHeader title="History" subtitle="Every order, deposit and wallet movement in one timeline." />
      <HistoryClient initial={first} />
    </>
  );
}
