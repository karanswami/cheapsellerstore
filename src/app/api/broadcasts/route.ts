import { jsonError, jsonOk } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/customer";
import { listActiveBroadcastsForRole } from "@/lib/broadcasts";

export async function GET() {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const broadcasts = await listActiveBroadcastsForRole(user.role);
  return jsonOk({ broadcasts });
}
