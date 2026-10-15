import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Logs"
        description="User activity — last 7 days"
      />
      <AdminListSkeleton rows={8} />
    </main>
  );
}
