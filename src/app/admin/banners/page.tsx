import { PageHeader } from "@/components/app-ui";
import { Banners } from "./banners-client";

export default function AdminBannersPage() {
  return (
    <>
      <PageHeader title="Banners" subtitle="Image banners rotating at the top of the store home page." />
      <Banners />
    </>
  );
}
