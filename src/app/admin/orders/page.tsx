import { PageHeader } from "@/components/app-ui";
import { AdminOrdersClient } from "./orders-client";

export default function AdminOrdersPage() {
  return (
    <>
      <PageHeader title="Orders" subtitle="Every purchase, with the delivered keys." />
      <AdminOrdersClient />
    </>
  );
}
