import Link from "next/link";
import { Crown, KeyRound, Lock, ShoppingBag, Trophy, TrendingUp } from "lucide-react";
import { SectionHeader, Surface } from "@/components/app-kit";
import { Achievements, TierBadge } from "@/components/rank-badge";
import { UserAvatar } from "@/components/user-avatar";
import { getCurrentUser } from "@/lib/auth/customer";
import { MICROCENTS_PER_USD, formatMoney } from "@/lib/currencies";
import { getLeaderboard } from "@/lib/leaderboard";
import { TIERS, nextTierProgress, tierForSpend, type Tier } from "@/lib/leaderboard-tiers";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/leaderboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard" };

const tierById = (id: string) => TIERS.find((t) => t.id === id)!;

/** Visual podium order is 2nd · 1st · 3rd; `place` indexes into the top 3. */
const PODIUM = [
  { place: 1, medal: tierById("silver"), pillar: "h-20", avatar: "size-16" },
  { place: 0, medal: tierById("gold"), pillar: "h-28", avatar: "size-20" },
  { place: 2, medal: tierById("bronze"), pillar: "h-14", avatar: "size-16" },
];

const usd = (microcents: number) => microcents / MICROCENTS_PER_USD;

function displayName(e: LeaderboardEntry) {
  return `${e.emojiStatus ? `${e.emojiStatus} ` : ""}${e.username}`;
}

export default async function LeaderboardPage() {
  const user = (await getCurrentUser())!;
  const { entries, viewer } = await getLeaderboard(user.id, 25);
  const rest = entries.slice(3);
  const viewerOutside = viewer && !entries.some((e) => e.userId === viewer.userId);
  // The person directly above the viewer, when they are on the visible board.
  const ahead = viewer && viewer.rank > 1 ? entries.find((e) => e.rank === viewer.rank - 1) : undefined;

  return (
    <div className="space-y-6">
      {viewer ? <StandingCard viewer={viewer} ahead={ahead} /> : <UnrankedCard />}

      {entries.length === 0 ? (
        <Surface className="flex flex-col items-center px-6 py-14 text-center">
          <span className="anim-float grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-amber-400/30 to-amber-400/5 text-amber-300 ring-1 ring-inset ring-amber-300/25">
            <Crown className="size-7" />
          </span>
          <p className="mt-4 font-display text-lg font-bold">The board is empty</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Complete an order to claim the very first spot.</p>
        </Surface>
      ) : (
        <>
          <section aria-label="Top 3">
            <SectionHeader title="Top spenders" icon={Trophy} />
            <Podium top={entries.slice(0, 3)} you={user.id} />
          </section>

          {rest.length > 0 || viewerOutside ? (
            <Surface>
              <ol className="p-1.5">
                {rest.map((e, i) => (
                  <RankRow key={e.userId} e={e} you={e.userId === user.id} d={i} />
                ))}
                {viewerOutside && viewer ? (
                  <>
                    <li aria-hidden className="flex justify-center gap-1 py-1.5">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="size-1 rounded-full bg-muted-foreground/40" />
                      ))}
                    </li>
                    <RankRow e={viewer} you d={0} />
                  </>
                ) : null}
              </ol>
            </Surface>
          ) : null}
        </>
      )}

      <TierLadder current={viewer ? tierForSpend(viewer.totalSpent) : TIERS[0]} />
    </div>
  );
}

/** Dark hero tinted with the viewer's tier metal. */
function StandingCard({ viewer, ahead }: { viewer: LeaderboardEntry; ahead?: LeaderboardEntry }) {
  const tier = tierForSpend(viewer.totalSpent);
  const progress = nextTierProgress(viewer.totalSpent);
  const gap = ahead ? usd(ahead.totalSpent - viewer.totalSpent) : 0;
  return (
    <section
      className="hero-card p-5 sm:p-6"
      style={{ "--hero-a": tier.mid, "--hero-b": "var(--primary)" } as React.CSSProperties}
    >
      <div aria-hidden className="absolute -right-12 -top-12 -z-10 size-52 rounded-full border-[18px] border-white/[0.05]" />
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />

      <div className="flex items-center gap-4">
        <span className="relative">
          <span aria-hidden className="absolute inset-0 rounded-full blur-xl" style={{ background: `${tier.mid}88` }} />
          <TierBadge tier={tier} className="anim-float relative size-16" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Your rank</p>
          <p className="font-display text-5xl font-bold leading-none tracking-tight tabular-nums">
            <span className="text-2xl text-white/50">#</span>
            {viewer.rank}
          </p>
          <p className="mt-1 text-sm font-bold" style={{ color: tier.from }}>
            {tier.name} tier
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10.5px] uppercase tracking-wider text-white/55">Spent</p>
          <p className="font-display text-lg font-bold">{formatMoney(viewer.totalSpent)}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-semibold text-white/80">{progress ? `Next: ${progress.next.name}` : "Top tier"}</span>
          <span className="text-white/60">
            {progress ? `$${progress.remainingUsd.toFixed(2)} to go` : "Max tier reached"}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full shadow-[0_0_12px_rgb(255_255_255/0.25)]"
            style={{
              width: `${progress ? Math.max(4, progress.pct) : 100}%`,
              background: `linear-gradient(90deg, ${tier.from}, ${tier.mid}, ${progress?.next.mid ?? tier.to})`,
            }}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-5 text-sm">
          <span className="flex items-center gap-1.5 text-white/75">
            <KeyRound className="size-3.5 text-white/50" /> <b className="text-white">{viewer.keyCount}</b> keys
          </span>
          <span className="flex items-center gap-1.5 text-white/75">
            <ShoppingBag className="size-3.5 text-white/50" /> <b className="text-white">{viewer.orderCount}</b> orders
          </span>
        </div>
        <Achievements entry={viewer} max={3} />
      </div>

      {ahead && gap > 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.07] px-3.5 py-2.5 text-xs text-white/75">
          <TrendingUp className="size-4 shrink-0 text-success" />
          <span>
            Spend <b className="text-white">${gap.toFixed(2)}</b> more to pass <b className="text-white">@{ahead.username}</b> for #{ahead.rank}
          </span>
        </p>
      ) : viewer.rank === 1 ? (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-300/10 px-3.5 py-2.5 text-xs font-semibold text-amber-200">
          <Crown className="size-4 shrink-0" /> You are the #1 customer. Hold the crown!
        </p>
      ) : null}
    </section>
  );
}

function UnrankedCard() {
  return (
    <section className="hero-card p-5 [--hero-a:#f59e0b] sm:p-6">
      <div className="flex items-center gap-4">
        <TierBadge tier={TIERS[0]} className="anim-float size-14 opacity-70" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold">You&apos;re not ranked yet</p>
          <p className="mt-0.5 text-sm text-white/65">Your first order puts you on the board and earns your first badge.</p>
        </div>
      </div>
      <Link
        href="/app"
        className="tap mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-[#0b1020] shadow-lg shadow-black/30"
      >
        <ShoppingBag className="size-4" /> Browse products
      </Link>
    </section>
  );
}

function Podium({ top, you }: { top: LeaderboardEntry[]; you: string }) {
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {PODIUM.map((slot, i) => {
        const e = top[slot.place];
        const m = slot.medal;
        return (
          <div key={slot.place} className="anim-fade-up flex min-w-0 flex-col items-center" style={{ "--d": `${[150, 0, 300][i]}ms` } as React.CSSProperties}>
            {e ? (
              <>
                {slot.place === 0 ? <Crown className="anim-float mb-1 size-7 text-amber-300 drop-shadow-[0_0_10px_rgb(251_191_36/0.6)]" /> : null}
                <div className="relative">
                  <div className="rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${m.from}, ${m.mid}, ${m.to})`, boxShadow: `0 0 24px -4px ${m.mid}` }}>
                    <UserAvatar src={e.avatarUrl} seed={e.username} className={cn("border-2 border-background", slot.avatar)} />
                  </div>
                  <TierBadge tier={tierForSpend(e.totalSpent)} className="absolute -bottom-1.5 -right-2 size-7" />
                </div>
                <p className={cn("mt-2.5 w-full truncate text-center text-[13px] font-bold", e.userId === you && "text-primary")}>
                  {displayName(e)}
                </p>
                <p className="font-display text-sm font-bold tabular-nums text-foreground/90">{formatMoney(e.totalSpent)}</p>
              </>
            ) : (
              <>
                <span className={cn("grid place-items-center rounded-full border-2 border-dashed border-white/15 text-muted-foreground", slot.avatar)}>
                  <Lock className="size-5" />
                </span>
                <p className="mt-2.5 text-[13px] font-semibold text-muted-foreground">Open spot</p>
                <p className="text-sm opacity-0">-</p>
              </>
            )}
            {/* pillar */}
            <div
              className={cn("relative mt-2.5 w-full overflow-hidden rounded-t-2xl", slot.pillar)}
              style={{ background: `linear-gradient(180deg, ${m.mid}cc, ${m.to}55 70%, transparent)` }}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/50" />
              <span className="absolute inset-x-0 top-2 text-center font-display text-3xl font-black text-white/90 drop-shadow-[0_2px_6px_rgb(0_0_0/0.35)]">
                {slot.place + 1}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankRow({ e, you, d }: { e: LeaderboardEntry; you: boolean; d: number }) {
  const tier = tierForSpend(e.totalSpent);
  return (
    <li
      className={cn("anim-fade-up flex items-center gap-3 rounded-2xl px-2.5 py-2.5", you && "bg-primary/10 ring-1 ring-inset ring-primary/30")}
      style={{ "--d": `${Math.min(d, 8) * 35}ms` } as React.CSSProperties}
    >
      <span className="w-7 shrink-0 text-center font-display text-base font-bold tabular-nums text-muted-foreground">{e.rank}</span>
      <span className="relative shrink-0">
        <UserAvatar src={e.avatarUrl} seed={e.username} className="size-10" />
        <TierBadge tier={tier} className="absolute -bottom-1 -right-1.5 size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
          <span className="truncate">{displayName(e)}</span>
          {you ? <span className="shrink-0 rounded-md bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground">YOU</span> : null}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-semibold" style={{ color: tier.mid }}>
            {tier.name}
          </span>
          <span>· {e.keyCount} keys</span>
        </p>
      </div>
      <span className="hidden sm:block">
        <Achievements entry={e} compact max={4} />
      </span>
      <span className="shrink-0 font-display text-sm font-bold tabular-nums">{formatMoney(e.totalSpent)}</span>
    </li>
  );
}

/** Horizontal ladder of tiers: reached ones in full metal, the rest locked. */
function TierLadder({ current }: { current: Tier }) {
  const at = TIERS.indexOf(current);
  return (
    <section>
      <SectionHeader title="Tiers" icon={Crown} />
      <Surface className="py-4">
        <ol className="flex snap-x gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TIERS.map((t, i) => {
            const reached = i <= at;
            const here = i === at;
            return (
              <li key={t.id} className="relative flex w-[4.75rem] shrink-0 snap-start flex-col items-center text-center">
                {/* connector to the next tier */}
                {i < TIERS.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-6 h-0.5 w-full"
                    style={{ background: i < at ? `linear-gradient(90deg, ${t.mid}, ${TIERS[i + 1].mid})` : "rgb(255 255 255 / 0.08)" }}
                  />
                ) : null}
                <span className={cn("relative rounded-full p-1", here && "bg-white/10 ring-2 ring-inset")} style={here ? { ["--tw-ring-color" as string]: t.mid } : undefined}>
                  <TierBadge tier={t} className={cn("size-10", !reached && "opacity-35 grayscale")} />
                  {!reached ? <Lock className="absolute bottom-0 right-0 size-3.5 rounded-full bg-card p-0.5 text-muted-foreground" /> : null}
                </span>
                <p className={cn("mt-1.5 text-xs font-bold", !reached && "text-muted-foreground")} style={reached ? { color: t.from } : undefined}>
                  {t.name}
                </p>
                <p className="text-[10.5px] text-muted-foreground">{t.min === 0 ? "Start" : `$${t.min.toLocaleString()}+`}</p>
                {here ? <span className="mt-1 rounded-full bg-primary px-1.5 py-px text-[9.5px] font-bold text-primary-foreground">YOU</span> : null}
              </li>
            );
          })}
        </ol>
      </Surface>
    </section>
  );
}
