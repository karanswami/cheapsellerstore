import { PageHeader } from "@/components/app-ui";
import { AdminDepositsClient } from "./deposits-client";

export default function AdminDepositsPage() {
  return (
    <>
      <PageHeader title="Pending deposits" subtitle="Review manual payment proofs and credit or reject them." />
      <AdminDepositsClient />
    </>
  );
}
