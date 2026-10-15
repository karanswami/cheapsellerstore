import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader title="Deposits" description="Manual payment requests and approvals" />
      <AdminListSkeleton />
    </main>
  );
}
