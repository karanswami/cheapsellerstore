import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader title="Site Config" description="Brand and metadata" />
      <AdminListSkeleton />
    </main>
  );
}
