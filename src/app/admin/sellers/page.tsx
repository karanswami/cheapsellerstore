import { PageHeader } from "@/components/app-ui";
import { AdminSellersClient } from "./sellers-client";

export default function AdminSellersPage() {
  return (
    <>
      <PageHeader title="Sellers" subtitle="Applications, bulk actions and the Platform API." />
      <AdminSellersClient />
    </>
  );
}
