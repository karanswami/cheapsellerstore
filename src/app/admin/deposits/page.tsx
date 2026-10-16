import { PageHeader } from "@/components/app-ui";
import { AdminDepositsClient } from "./deposits-client";

export default function AdminDepositsPage() {
  return (
    <>
      <PageHeader title="Pending deposits" subtitle="Review payment proofs, then approve or reject." />
      <AdminDepositsClient />
    </>
  );
}
