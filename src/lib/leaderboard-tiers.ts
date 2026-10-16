import { MICROCENTS_PER_USD } from "@/lib/currencies";
import type { LeaderboardEntry } from "@/types/leaderboard";

export type TierId = "rookie" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "legend";

export type Tier = {
  id: TierId;
  name: string;
  /** Minimum lifetime spend in USD. */
  min: number;
  /** Gradient stops, light → dark. */
  from: string;
  mid: string;
  to: string;
  /** Readable accent for text on light/dark surfaces. */
  text: string;
};

export const TIERS: Tier[] = [
  { id: "rookie", name: "Rookie", min: 0, from: "#d4d4d8", mid: "#a1a1aa", to: "#71717a", text: "#71717a" },
  { id: "bronze", name: "Bronze", min: 10, from: "#f6c79a", mid: "#d98a45", to: "#9a5320", text: "#b4631f" },
  { id: "silver", name: "Silver", min: 50, from: "#f4f6f8", mid: "#b7c0cb", to: "#7b8794", text: "#64748b" },
  { id: "gold", name: "Gold", min: 150, from: "#fff1a8", mid: "#f5b301", to: "#b07800", text: "#b98100" },
  { id: "platinum", name: "Platinum", min: 400, from: "#d9fbf6", mid: "#5fd6c8", to: "#1f8f86", text: "#14877d" },
  { id: "diamond", name: "Diamond", min: 1000, from: "#d6ecff", mid: "#4aa8ff", to: "#2557d6", text: "#2b6ddb" },
  { id: "legend", name: "Legend", min: 2500, from: "#ffd6f0", mid: "#c25bff", to: "#5b2bd6", text: "#8a3fe0" },
];

export function tierForSpend(microcents: number): Tier {
  const usd = microcents / MICROCENTS_PER_USD;
  let current = TIERS[0];
  for (const t of TIERS) if (usd >= t.min) current = t;
  return current;
}

/** Progress toward the next tier (null at max tier). */
export function nextTierProgress(microcents: number) {
  const usd = microcents / MICROCENTS_PER_USD;
  const current = tierForSpend(microcents);
  const next = TIERS[TIERS.indexOf(current) + 1];
  if (!next) return null;
  const pct = Math.min(100, Math.max(0, ((usd - current.min) / (next.min - current.min)) * 100));
  return { next, pct, remainingUsd: Math.max(0, next.min - usd) };
}

export type AchievementId = "champion" | "podium" | "verified" | "collector" | "loyal" | "elite";

export type Achievement = { id: AchievementId; label: string; hint: string };

/** Achievement badges derived from leaderboard stats — no extra storage. */
export function achievementsFor(e: LeaderboardEntry): Achievement[] {
  const out: Achievement[] = [];
  if (e.rank === 1) out.push({ id: "champion", label: "Champion", hint: "Ranked #1 on the leaderboard" });
  else if (e.rank <= 3) out.push({ id: "podium", label: "Podium", hint: "Top 3 spender" });
  if (e.keyCount >= 25) out.push({ id: "collector", label: "Collector", hint: "25+ keys purchased" });
  if (e.orderCount >= 10) out.push({ id: "loyal", label: "Loyal", hint: "10+ completed orders" });
  if (e.emailVerified) out.push({ id: "verified", label: "Verified", hint: "Verified email" });
  if (e.rank <= 10 && e.rank > 3) out.push({ id: "elite", label: "Elite", hint: "Top 10 spender" });
  return out;
}
