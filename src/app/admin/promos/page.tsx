import { PageHeader } from "@/components/app-ui";
import { AdminPromosClient } from "./promos-client";

export default function AdminPromosPage() {
  return (
    <>
      <PageHeader title="Promos & flash sales" subtitle="Promo codes and timed flash sales." />
      <AdminPromosClient />
    </>
  );
}
