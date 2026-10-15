import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function AdminSupplierLoading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader title="Supplier" description="Upstream license API" />
      <AdminListSkeleton />
    </main>
  );
}
