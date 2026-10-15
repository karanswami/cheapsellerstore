import { jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { countSupportInboxUnread } from "@/lib/support-inbox";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonOk({ unread: 0 });
  const unread = await countSupportInboxUnread(user.id);
  return jsonOk({ unread });
}
