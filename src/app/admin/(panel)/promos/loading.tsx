import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader title="Promos" description="Promo codes and discounts" />
      <AdminListSkeleton />
    </main>
  );
}
