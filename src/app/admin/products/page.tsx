import { PageHeader } from "@/components/app-ui";
import { AdminProductsClient } from "./products-client";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <>
      <PageHeader title="Products" subtitle="Your catalog, durations and store categories." />
      <AdminProductsClient defaultTab={tab === "categories" ? "categories" : "products"} />
    </>
  );
}
