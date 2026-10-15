import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader title="Products" description="Catalog, durations and prices" />
      <AdminListSkeleton />
    </main>
  );
}
