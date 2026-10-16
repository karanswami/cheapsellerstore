import { PageHeader } from "@/components/app-ui";
import { SpecialPricesTab } from "./special-prices-client";

export default function AdminSpecialPricesPage() {
  return (
    <>
      <PageHeader title="Special prices" subtitle="Per-user price overrides for specific products and durations." />
      <SpecialPricesTab />
    </>
  );
}
