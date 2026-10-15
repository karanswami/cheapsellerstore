import { FaqView } from "@/components/landing/faq-view";
import { getActiveFaqs } from "@/lib/faqs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | Cheap Seller",
  description: "Frequently asked questions about Cheap Seller deposits, keys, and accounts.",
};

export default async function FaqPage() {
  const faqs = await getActiveFaqs();
  return <FaqView faqs={faqs} />;
}
