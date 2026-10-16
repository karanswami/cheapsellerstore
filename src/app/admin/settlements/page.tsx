import { PageHeader } from "@/components/app-ui";
import { AdminFinanceClient } from "./finance-client";

export default function AdminSettlementsPage() {
  return (
    <>
      <PageHeader title="Finance" subtitle="Developer settlements, special stock and background jobs." />
      <AdminFinanceClient />
    </>
  );
}
