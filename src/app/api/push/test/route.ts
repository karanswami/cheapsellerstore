import { jsonError, jsonOk } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/customer";
import { sendWebPushToUser } from "@/lib/web-push";

/** Sends a push to the signed-in user's own devices so they can check it works. */
export async function POST() {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const res = await sendWebPushToUser(user.id, {
    title: "Notifications are on",
    body: "This is how deposits, orders and support replies will reach you.",
    url: "/app/notifications",
    tag: "push-test",
  });
  if (res.sent === 0) return jsonError("NO_DEVICES", "No subscribed device received it. Try turning push off and on again.", 400);
  return jsonOk(res);
}
