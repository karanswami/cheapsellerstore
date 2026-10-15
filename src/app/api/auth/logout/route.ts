import { jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import {
  clearCustomerSessionCookie,
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
  await clearCustomerSessionCookie();
  return jsonOk({ ok: true });
}
