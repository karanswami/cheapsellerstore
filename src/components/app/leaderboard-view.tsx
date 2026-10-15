"use client";

import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import {
  LeaderboardBoard,
  type LeaderboardBoardEntry,
} from "@/components/app/leaderboard/leaderboard-board";
import { formatMoney } from "@/lib/currencies";
import type { LeaderboardEntry } from "@/types/leaderboard";
import { Trophy } from "lucide-react";

type LeaderboardViewProps = {
  entries: LeaderboardEntry[];
  viewer: LeaderboardEntry | null;
  viewerId: string;
};

function toBoardEntry(
  entry: LeaderboardEntry,
  viewerId: string,
): LeaderboardBoardEntry {
  return {
    id: entry.userId,
    rank: entry.rank,
    username: entry.username,
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    isPremium: entry.isPremium,
    emailVerified: entry.emailVerified,
    emojiStatus: entry.emojiStatus,
    isViewer: entry.userId === viewerId,
    value: entry.totalSpent,
    meta: `${entry.keyCount} key${entry.keyCount === 1 ? "" : "s"}`,
  };
}

export function LeaderboardView({
  entries,
  viewer,
  viewerId,
}: LeaderboardViewProps) {
  const boardEntries = entries.map((e) => toBoardEntry(e, viewerId));
  const viewerInList = entries.some((e) => e.userId === viewerId);
  const outsider =
    viewer != null && !viewerInList
      ? toBoardEntry(viewer, viewerId)
      : null;

  const topSpend = entries[0]?.totalSpent;

  return (
    <HubPageShell maxWidth="lg" wide>
      <LeaderboardBoard
        title="Top customers"
        description="Ranked by total spend on fulfilled orders"
        listLabel="Ranked customers"
        valueLabel="Total spend"
        entries={boardEntries}
        outsider={outsider}
        heroIcon={<Trophy />}
        heroStats={[
          {
            label: "Ranked",
            value: String(entries.length),
          },
          {
            label: "Your rank",
            value: viewer ? `#${viewer.rank}` : "—",
            tone: viewer ? "accent" : "default",
          },
          {
            label: "Top spend",
            value: topSpend != null ? formatMoney(topSpend) : "—",
            tone: "success",
          },
        ]}
        emptyTitle="No purchases yet"
        emptyDescription="Be the first on the board — shop the catalog to climb the ranks."
        showUnrankedAlert={viewer == null}
        unrankedTitle="Not ranked yet"
        unrankedDescription="Complete a purchase to appear on the Top Customer leaderboard."
      />
    </HubPageShell>
  );
}
