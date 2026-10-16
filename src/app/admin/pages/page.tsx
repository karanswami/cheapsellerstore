import { PageHeader } from "@/components/app-ui";
import { Pages } from "./pages-client";

export default function AdminPagesPage() {
  return (
    <>
      <PageHeader title="Pages" subtitle="Static pages such as terms, privacy and refund policy." />
      <Pages />
    </>
  );
}
