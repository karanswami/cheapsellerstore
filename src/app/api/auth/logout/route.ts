import { cookies } from "next/headers";
import { IMPERSONATION_COOKIE } from "@/lib/auth/impersonation";
import { jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import {
  clearCustomerSessionCookie,
  revokeCurrentSessionToken,
  getCurrentUser,
} from "@/lib/auth/customer";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) {
    logActivity({
      request,
      action: "LOGOUT",
      category: "AUTH",
      message: `Logged out (@${user.username})`,
      user,
    });
  }
  await revokeCurrentSessionToken();
  await clearCustomerSessionCookie();
  // Also drop a pending admin restore cookie so logout can't be undone via impersonation exit.
  (await cookies()).delete(IMPERSONATION_COOKIE);
  return jsonOk({ ok: true });
}
