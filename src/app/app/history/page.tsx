import { HistoryView } from "@/components/app/history-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { getUserActivityHistoryPage } from "@/lib/history";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/history");

  const data = await getUserActivityHistoryPage(user.id, {
    page: 1,
    limit: 20,
  });

  return (
    <HistoryView
      initialItems={data.items}
      initialHasMore={data.hasMore}
      pageSize={data.limit}
    />
  );
}
