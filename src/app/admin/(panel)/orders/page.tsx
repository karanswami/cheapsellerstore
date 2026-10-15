import { AdminOrdersWorkspace } from "@/components/admin/orders/admin-orders-workspace";
import { AdminListSkeleton } from "@/components/admin/admin-page-header";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl space-y-5">
          <AdminListSkeleton rows={8} />
        </main>
      }
    >
      <AdminOrdersWorkspace />
    </Suspense>
  );
}
