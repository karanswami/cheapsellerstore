import { getCurrentUser } from "@/lib/auth/customer";
import { getUserKeysPage } from "@/lib/orders";
import { KeysClient } from "./keys-client";

export const dynamic = "force-dynamic";

export default async function KeysPage() {
  const user = (await getCurrentUser())!;
  const first = await getUserKeysPage(user.id, { limit: 25 }).catch(() => ({
    keys: [],
    page: 1,
    limit: 25,
    total: 0,
    hasMore: false,
  }));
  // The vault card carries the page title.
  return <KeysClient initial={first} />;
}
