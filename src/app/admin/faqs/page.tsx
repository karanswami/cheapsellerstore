import { PageHeader } from "@/components/app-ui";
import { Faqs } from "./faqs-client";

export default function AdminFaqsPage() {
  return (
    <>
      <PageHeader title="FAQs" subtitle="Questions and answers shown on the help centre." />
      <Faqs />
    </>
  );
}
