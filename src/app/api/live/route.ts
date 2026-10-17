import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { getLiveStamp } from "@/lib/live-stamp";

export const dynamic = "force-dynamic";

/** Fingerprint of the signed-in customer's data; the app shell refreshes when it changes. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  return jsonOk({ stamp: await getLiveStamp(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
