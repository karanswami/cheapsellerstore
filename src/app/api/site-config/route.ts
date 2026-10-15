import { jsonOk } from "@/lib/api";
import { getSiteConfig } from "@/lib/site-config";

/** Public brand + theme tokens for storefront chrome. */
export async function GET() {
  return jsonOk(await getSiteConfig());
}
