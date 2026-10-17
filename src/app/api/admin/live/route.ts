import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminLiveStamp } from "@/lib/admin-live-stamp";

export const dynamic = "force-dynamic";

/** Fingerprint of admin-visible data; the admin shell refreshes when it changes. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  return jsonOk({ stamp: await getAdminLiveStamp() }, { headers: { "Cache-Control": "no-store" } });
}
