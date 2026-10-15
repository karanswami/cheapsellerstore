import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader title="Keys" description="License stock by product and duration" />
      <AdminListSkeleton />
    </main>
  );
}
