import { PageHeader } from "@/components/app-ui";
import { AdminPromosClient } from "./promos-client";

export default function AdminPromosPage() {
  return (
    <>
      <PageHeader title="Pricing & promos" subtitle="Promo codes, flash sales and per-user special prices." />
      <AdminPromosClient />
    </>
  );
}
