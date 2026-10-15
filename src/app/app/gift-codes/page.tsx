import { GiftCodesView } from "@/components/app/gift-codes-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { isGiftCodesEnabled } from "@/lib/pages-enabled";
import { redirect } from "next/navigation";

export default async function GiftCodesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/gift-codes");

  const enabled = await isGiftCodesEnabled();
  if (!enabled) {
    redirect("/app");
  }

  return <GiftCodesView initialBalance={user.walletBalance} />;
}
