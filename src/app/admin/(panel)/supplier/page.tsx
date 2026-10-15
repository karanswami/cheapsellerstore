import { Suspense } from "react";
import { SupplierWorkspace } from "@/components/admin/supplier/supplier-workspace";
import {
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";

export default function AdminSupplierPage() {
  return (
    <Suspense
      fallback={
        <main className="space-y-6">
          <AdminPageHeader
            title="Supplier"
            description="Upstream license API"
          />
          <AdminListSkeleton />
        </main>
      }
    >
      <SupplierWorkspace />
    </Suspense>
  );
}
