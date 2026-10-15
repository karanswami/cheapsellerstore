"use client";

import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import {
  LeaderboardBoard,
  type LeaderboardBoardEntry,
} from "@/components/app/leaderboard/leaderboard-board";
import { formatMoney } from "@/lib/currencies";
import type { SellerLeaderboardEntry } from "@/lib/seller-leaderboard";
import { UsersRound } from "lucide-react";

type Props = {
  entries: SellerLeaderboardEntry[];
  currentUserId: string;
};

function toBoardEntry(
  entry: SellerLeaderboardEntry,
  rank: number,
  currentUserId: string,
): LeaderboardBoardEntry {
  return {
    id: entry.id,
    rank,
    username: entry.username,
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    emailVerified: entry.emailVerified,
    emojiStatus: entry.emojiStatus,
    isViewer: entry.id === currentUserId,
    value: entry.earnings,
    meta: `${entry.referrals} referral${entry.referrals === 1 ? "" : "s"} · ${formatMoney(entry.sales)} sales`,
  };
}

export function SellerLeaderboardView({ entries, currentUserId }: Props) {
  const boardEntries = entries.map((entry, i) =>
    toBoardEntry(entry, i + 1, currentUserId),
  );

  const viewerEntry = boardEntries.find((e) => e.isViewer);
  const topEarnings = entries[0]?.earnings;

  return (
    <HubPageShell maxWidth="lg" wide>
      <LeaderboardBoard
        title="Seller board"
        description="Private ranks by referral earnings — wholesale partners only"
        listLabel="Ranked sellers"
        valueLabel="Earnings"
        entries={boardEntries}
        heroIcon={<UsersRound />}
        heroStats={[
          {
            label: "Sellers",
            value: String(entries.length),
          },
          {
            label: "Your rank",
            value: viewerEntry ? `#${viewerEntry.rank}` : "—",
            tone: viewerEntry ? "accent" : "default",
          },
          {
            label: "Top earn",
            value: topEarnings != null ? formatMoney(topEarnings) : "—",
            tone: "success",
          },
        ]}
        emptyTitle="No sellers on the board yet"
        emptyDescription="Referral earnings will appear here as sellers grow their network."
      />
    </HubPageShell>
  );
}
