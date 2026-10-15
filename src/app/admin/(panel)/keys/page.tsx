import { Suspense } from "react";
import { KeysWorkspace } from "@/components/admin/keys/keys-workspace";
import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";

export default function AdminKeysPage() {
  return (
    <Suspense
      fallback={
        <main className="space-y-6">
          <AdminPageHeader title="Keys" description="License stock" />
          <AdminListSkeleton />
        </main>
      }
    >
      <KeysWorkspace />
    </Suspense>
  );
}
