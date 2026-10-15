import { LeaderboardView } from "@/components/app/leaderboard-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { getLeaderboard } from "@/lib/leaderboard";
import { redirect } from "next/navigation";

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/leaderboard");

  const { entries, viewer } = await getLeaderboard(user.id, 25);

  return (
    <LeaderboardView
      entries={entries}
      viewer={viewer}
      viewerId={user.id}
    />
  );
}
