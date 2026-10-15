import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function Loading() {
  return (
    <main className="space-y-6">
      <AdminPageHeader title="FAQs" description="Help center questions" />
      <AdminListSkeleton />
    </main>
  );
}
