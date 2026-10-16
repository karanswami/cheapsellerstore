import { PageHeader } from "@/components/app-ui";
import { AdminPaymentsClient } from "./payments-client";

export default function AdminPaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" subtitle="Auto gateways (per-gateway keys, Live / Maintenance / Off), manual accounts and pay currencies." />
      <AdminPaymentsClient />
    </>
  );
}
