"use client";

import { TableSkeleton, useAdminQuery } from "@/components/admin/kit";
import type { AdminSettings } from "../settings/settings-kit";
import { PaymentsSection } from "./payments-sections";

export function AdminPaymentsClient() {
  const { data, error } = useAdminQuery<AdminSettings>("/api/admin/settings");

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!data ? <TableSkeleton rows={6} /> : <PaymentsSection s={data} />}
    </div>
  );
}
