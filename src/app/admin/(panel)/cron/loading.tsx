import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Cron"
        description="Monitor scheduled jobs and run history"
      />
      <AdminListSkeleton rows={6} />
    </main>
  );
}
