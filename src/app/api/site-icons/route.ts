import { jsonOk } from "@/lib/api";
import { getSiteIcons } from "@/lib/site-icons";

export async function GET() {
  return jsonOk(await getSiteIcons());
}
