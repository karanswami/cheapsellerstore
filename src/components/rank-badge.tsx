import { BadgeCheck, Crown, Flame, Gem, KeyRound, Medal, Repeat, Sparkles, Star, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { achievementsFor, type AchievementId, type Tier } from "@/lib/leaderboard-tiers";
import type { LeaderboardEntry } from "@/types/leaderboard";
import { cn } from "@/lib/utils";

const TIER_ICON: Record<Tier["id"], LucideIcon> = {
  rookie: Star,
  bronze: Medal,
  silver: Medal,
  gold: Trophy,
  platinum: Sparkles,
  diamond: Gem,
  legend: Crown,
};

/** Metallic shield badge for a spend tier. */
export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  const Icon = TIER_ICON[tier.id];
  const g = `tier-${tier.id}`;
  return (
    <span className={cn("relative inline-grid size-10 place-items-center", className)} title={`${tier.name} tier`}>
      <svg viewBox="0 0 48 56" className="absolute inset-0 size-full drop-shadow-sm" aria-hidden>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tier.from} />
            <stop offset="0.5" stopColor={tier.mid} />
            <stop offset="1" stopColor={tier.to} />
          </linearGradient>
        </defs>
        <path d="M24 2 L44 10 V28 C44 42 35 50 24 54 C13 50 4 42 4 28 V10 Z" fill={`url(#${g})`} />
        <path
          d="M24 6 L40 12.5 V28 C40 39.5 33 46 24 49.5 C15 46 8 39.5 8 28 V12.5 Z"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        <path d="M24 2 L44 10 V20 C34 18 14 18 4 20 V10 Z" fill="#fff" opacity="0.22" />
      </svg>
      <Icon className="relative size-[45%] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" strokeWidth={2.4} />
    </span>
  );
}

const ACH_STYLE: Record<AchievementId, { icon: LucideIcon; cls: string }> = {
  champion: { icon: Crown, cls: "border-amber-400/50 bg-amber-400/15 text-amber-300" },
  podium: { icon: Trophy, cls: "border-orange-400/50 bg-orange-400/15 text-orange-300" },
  elite: { icon: Flame, cls: "border-rose-400/50 bg-rose-400/15 text-rose-300" },
  collector: { icon: KeyRound, cls: "border-sky-400/50 bg-sky-400/15 text-sky-300" },
  loyal: { icon: Repeat, cls: "border-violet-400/50 bg-violet-400/15 text-violet-300" },
  verified: { icon: BadgeCheck, cls: "border-emerald-400/50 bg-emerald-400/15 text-emerald-300" },
};

/** Small achievement chips. `compact` shows icons only. */
export function Achievements({ entry, compact, max = 4 }: { entry: LeaderboardEntry; compact?: boolean; max?: number }) {
  const list = achievementsFor(entry).slice(0, max);
  if (list.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {list.map((a) => {
        const { icon: Icon, cls } = ACH_STYLE[a.id];
        return (
          <span
            key={a.id}
            title={`${a.label} — ${a.hint}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border text-[11px] font-semibold",
              compact ? "size-6 justify-center" : "px-2 py-0.5",
              cls,
            )}
          >
            <Icon className="size-3" />
            {compact ? null : a.label}
          </span>
        );
      })}
    </span>
  );
}
