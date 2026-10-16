import { PageHeader } from "@/components/app-ui";
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
  return (
    <>
      <PageHeader title="Key vault" subtitle="Every license you have bought — reveal, copy or download." />
      <KeysClient initial={first} />
    </>
  );
}
