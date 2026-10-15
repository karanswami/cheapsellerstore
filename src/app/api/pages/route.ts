import { jsonOk } from "@/lib/api";
import { getActiveStaticPagesNav } from "@/lib/static-pages";

/** Public active static pages for footer / profile nav. */
export async function GET() {
  const pages = await getActiveStaticPagesNav();
  return jsonOk({ pages });
}
