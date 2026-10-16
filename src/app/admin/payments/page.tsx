import { PageHeader } from "@/components/app-ui";
import { AdminPaymentsClient } from "./payments-client";

export default function AdminPaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" subtitle="Deposit methods, pay currencies, manual accounts and provider credentials." />
      <AdminPaymentsClient />
    </>
  );
}
