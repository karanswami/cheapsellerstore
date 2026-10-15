import { SellerPanelView } from "@/components/app/seller/seller-panel-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { sellerHasSellerPanel } from "@/lib/resellers";
import { redirect } from "next/navigation";

export default async function SellerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/seller");
  if (!sellerHasSellerPanel(user)) {
    redirect("/app");
  }
  return <SellerPanelView />;
}
