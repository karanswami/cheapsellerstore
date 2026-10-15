import { ReportsView } from "@/components/app/reports-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { listUserIssueReports } from "@/lib/issue-reports";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/reports");

  const data = await listUserIssueReports(user.id, { page: 1, limit: 15 });

  return (
    <ReportsView
      initialReports={data.reports}
      initialHasMore={data.hasMore}
      pageSize={data.limit}
    />
  );
}
