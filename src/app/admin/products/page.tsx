import { PageHeader } from "@/components/app-ui";
import { AdminProductsClient } from "./products-client";

export default function AdminProductsPage() {
  return (
    <>
      <PageHeader title="Products" subtitle="Products, their durations and prices, and categories." />
      <AdminProductsClient />
    </>
  );
}
