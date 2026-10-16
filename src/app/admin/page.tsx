import { PageHeader } from "@/components/app-ui";
import { getAnalyticsStats, getDashboardStats, getStatisticsStats } from "@/lib/admin-stats";
import { AdminDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [dashboard, analytics, stats] = await Promise.all([getDashboardStats(), getAnalyticsStats(), getStatisticsStats("7")]);
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Sales, deposits and stock at a glance." />
      <AdminDashboardClient dashboard={dashboard} analytics={analytics} initialStats={stats} />
    </>
  );
}
