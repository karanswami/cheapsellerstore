import { KeysList } from "@/components/app/keys-list";
import { getCurrentUser } from "@/lib/auth/customer";
import { getUserKeysPage } from "@/lib/orders";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function KeysPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/keys");

  const data = await getUserKeysPage(user.id, { page: 1, limit: 25 });

  return (
    <KeysList
      initialKeys={data.keys}
      initialHasMore={data.hasMore}
      initialTotal={data.total}
      pageSize={data.limit}
    />
  );
}
