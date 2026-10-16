import { PageHeader } from "@/components/app-ui";
import { listAdminIssueReports } from "@/lib/issue-reports";
import { AdminReportsClient } from "./admin-reports-client";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const first = await listAdminIssueReports({ status: "open", limit: 20 });
  return (
    <>
      <PageHeader title="Reports" subtitle="Key, deposit and question tickets with everything the user attached." />
      <AdminReportsClient initial={first} />
    </>
  );
}
