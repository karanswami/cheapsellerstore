import { PageHeader } from "@/components/app-ui";
import { AdminContentClient } from "./content-client";

export default function AdminContentPage() {
  return (
    <>
      <PageHeader title="Site content" subtitle="Home banners, FAQs and static pages." />
      <AdminContentClient />
    </>
  );
}
