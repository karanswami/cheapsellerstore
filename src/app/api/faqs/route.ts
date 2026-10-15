import { jsonOk } from "@/lib/api";
import { getActiveFaqs } from "@/lib/faqs";

/** Public active FAQs for storefront / support chips. */
export async function GET() {
  const faqs = await getActiveFaqs();
  return jsonOk({ faqs });
}
