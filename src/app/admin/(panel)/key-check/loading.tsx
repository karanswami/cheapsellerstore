import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader title="Keys Check" description="Lookup & edit keys" />
      <AdminListSkeleton />
    </main>
  );
}
