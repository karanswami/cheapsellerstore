import { FaqView } from "@/components/landing/faq-view";
import { getActiveFaqs } from "@/lib/faqs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | Drip",
  description: "Frequently asked questions about Drip deposits, keys, and accounts.",
};

export default async function FaqPage() {
  const faqs = await getActiveFaqs();
  return <FaqView faqs={faqs} />;
}
