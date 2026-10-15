import { SellerLeaderboardView } from "@/components/app/seller/seller-leaderboard-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { getSellerLeaderboard } from "@/lib/seller-leaderboard";
import { isWholesaleRole } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function SellerLeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/seller/leaderboard");
  if (!isWholesaleRole(user.role)) redirect("/app/leaderboard");

  const entries = await getSellerLeaderboard(50, user.id);
  return (
    <SellerLeaderboardView entries={entries} currentUserId={user.id} />
  );
}
