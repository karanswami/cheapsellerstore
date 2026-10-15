import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader title="Analytics" description="Orders and deposit overview" />
      <AdminListSkeleton />
    </main>
  );
}
