import { Crown, KeyRound, ShoppingBag, TrendingUp } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/app-ui";
import { Achievements, TierBadge } from "@/components/rank-badge";
import { UserAvatar } from "@/components/user-avatar";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/currencies";
import { getLeaderboard } from "@/lib/leaderboard";
import { TIERS, nextTierProgress, tierForSpend } from "@/lib/leaderboard-tiers";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/leaderboard";

export const dynamic = "force-dynamic";

const tierById = (id: string) => TIERS.find((t) => t.id === id)!;

/** Podium order: 1st is centred and tallest on desktop. */
const PODIUM = [
  { order: "sm:order-2", medal: tierById("gold"), avatar: "size-24", lift: "sm:-translate-y-4", label: "1st" },
  { order: "sm:order-1", medal: tierById("silver"), avatar: "size-20", lift: "", label: "2nd" },
  { order: "sm:order-3", medal: tierById("bronze"), avatar: "size-20", lift: "", label: "3rd" },
];

function displayName(e: LeaderboardEntry) {
  return `${e.emojiStatus ? `${e.emojiStatus} ` : ""}${e.username}`;
}

function PodiumCard({ e, slot }: { e: LeaderboardEntry; slot: (typeof PODIUM)[number] }) {
  const tier = tierForSpend(e.totalSpent);
  const m = slot.medal;
  return (
    <div className={cn("relative", slot.order, slot.lift)}>
      <div
        className="relative overflow-hidden rounded-2xl border bg-card p-5 pt-7 text-center shadow-sm"
        style={{ borderColor: `${m.mid}88`, boxShadow: `0 10px 30px -12px ${m.mid}99` }}
      >
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${m.from}, ${m.mid}, ${m.to})` }} />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{ background: `radial-gradient(circle at 50% 0%, ${m.mid}, transparent 65%)` }}
        />
        <span
          className="absolute left-3 top-4 rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${m.mid}, ${m.to})` }}
        >
          {slot.label}
        </span>
        <div className="relative mx-auto w-fit">
          <div className="rounded-full p-1" style={{ background: `linear-gradient(135deg, ${m.from}, ${m.mid}, ${m.to})` }}>
            <UserAvatar src={e.avatarUrl} seed={e.username} className={cn("border-2 border-card", slot.avatar)} />
          </div>
          <TierBadge tier={tier} className="absolute -bottom-2 -right-3 size-9" />
        </div>
        <p className="relative mt-4 truncate font-display text-lg font-bold">{displayName(e)}</p>
        <p className="relative text-xs font-semibold uppercase tracking-wider" style={{ color: tier.text }}>
          {tier.name}
        </p>
        <p className="relative mt-3 font-display text-2xl font-bold">{formatMoney(e.totalSpent)}</p>
        <p className="relative mt-1 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <KeyRound className="size-3" /> {e.keyCount} key{e.keyCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1">
            <ShoppingBag className="size-3" /> {e.orderCount} order{e.orderCount === 1 ? "" : "s"}
          </span>
        </p>
        <div className="relative mt-3 flex justify-center">
          <Achievements entry={e} max={3} />
        </div>
      </div>
    </div>
  );
}

function ViewerCard({ viewer }: { viewer: LeaderboardEntry }) {
  const tier = tierForSpend(viewer.totalSpent);
  const progress = nextTierProgress(viewer.totalSpent);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5 sm:p-6"
      style={{ borderColor: `${tier.mid}77`, background: `linear-gradient(135deg, ${tier.from}33, transparent 60%)` }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <TierBadge tier={tier} className="size-16" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your rank</p>
            <p className="font-display text-3xl font-bold leading-none">#{viewer.rank}</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: tier.text }}>
              {tier.name} tier
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold">{formatMoney(viewer.totalSpent)} spent</span>
            {progress ? (
              <span className="text-xs text-muted-foreground">
                ${progress.remainingUsd.toFixed(2)} to {progress.next.name}
              </span>
            ) : (
              <span className="text-xs font-semibold" style={{ color: tier.text }}>
                Max tier reached
              </span>
            )}
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress ? Math.max(4, progress.pct) : 100}%`,
                background: `linear-gradient(90deg, ${tier.from}, ${tier.mid}, ${tier.to})`,
              }}
            />
          </div>
          <div className="mt-3">
            <Achievements entry={viewer} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LeaderboardPage() {
  const user = (await getCurrentUser())!;
  const { entries, viewer } = await getLeaderboard(user.id, 25);
  const top = entries.slice(0, 3);
  const rest = entries.slice(3);
  const viewerOutside = viewer && !entries.some((e) => e.userId === viewer.userId);
  const listed = [...rest, ...(viewerOutside && viewer ? [viewer] : [])];

  return (
    <>
      <PageHeader title="Leaderboard" subtitle="Top customers by total spend. Climb tiers and earn badges." />

      {entries.length === 0 ? (
        <EmptyState icon={Crown} title="No ranked customers yet" hint="Complete an order to claim the first spot." />
      ) : (
        <div className="space-y-8">
          {viewer ? (
            <ViewerCard viewer={viewer} />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
              <TrendingUp className="size-5 text-primary" />
              Make a purchase to appear on the leaderboard and earn your first badge.
            </div>
          )}

          <div className="grid gap-4 pt-4 sm:grid-cols-3 sm:items-end">
            {top.map((e, i) => (
              <PodiumCard key={e.userId} e={e} slot={PODIUM[i]} />
            ))}
          </div>

          {listed.length > 0 ? (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {listed.map((e) => {
                const tier = tierForSpend(e.totalSpent);
                const you = e.userId === user.id;
                return (
                  <li
                    key={e.userId}
                    className={cn("flex items-center gap-3 p-3.5 sm:gap-4 sm:px-5", you && "bg-primary/10")}
                    style={you ? { boxShadow: `inset 3px 0 0 ${tier.mid}` } : undefined}
                  >
                    <span className="w-8 text-center font-display text-lg font-bold text-muted-foreground">{e.rank}</span>
                    <UserAvatar src={e.avatarUrl} seed={e.username} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {displayName(e)}
                        {you ? <span className="ml-2 text-xs font-medium text-primary">(you)</span> : null}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold" style={{ color: tier.text }}>
                          {tier.name}
                        </span>
                        <span>· {e.keyCount} keys</span>
                      </p>
                    </div>
                    <span className="hidden sm:block">
                      <Achievements entry={e} compact max={4} />
                    </span>
                    <TierBadge tier={tier} className="size-9" />
                    <span className="w-24 text-right font-display text-sm font-bold sm:w-28 sm:text-base">
                      {formatMoney(e.totalSpent)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <Panel title="Tiers" icon={Crown}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {TIERS.map((t) => (
                <div key={t.id} className="flex flex-col items-center rounded-xl border bg-background/50 p-3 text-center">
                  <TierBadge tier={t} className="size-12" />
                  <p className="mt-2 text-sm font-semibold" style={{ color: t.text }}>
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.min === 0 ? "Start" : `$${t.min.toLocaleString()}+`}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
