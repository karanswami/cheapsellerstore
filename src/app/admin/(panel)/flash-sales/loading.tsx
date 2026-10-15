import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader title="Flash Sale" description="Limited-time product offers" />
      <AdminListSkeleton />
    </main>
  );
}
