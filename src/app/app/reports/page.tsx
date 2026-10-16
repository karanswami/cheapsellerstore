import { PageHeader } from "@/components/app-ui";
import { getCurrentUser } from "@/lib/auth/customer";
import { listUserIssueReports } from "@/lib/issue-reports";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = (await getCurrentUser())!;
  const first = await listUserIssueReports(user.id, { limit: 15 }).catch(() => ({
    reports: [],
    page: 1,
    limit: 15,
    total: 0,
    hasMore: false,
  }));
  return (
    <>
      <PageHeader title="Reports" subtitle="Problem with a key or a deposit? Open a ticket and track it here." />
      <ReportsClient initial={first} />
    </>
  );
}
