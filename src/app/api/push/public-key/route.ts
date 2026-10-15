import { jsonOk } from "@/lib/api";
import { getWebPushPublicKey } from "@/lib/web-push";

export async function GET() {
  const publicKey = await getWebPushPublicKey();
  return jsonOk({ publicKey });
}
