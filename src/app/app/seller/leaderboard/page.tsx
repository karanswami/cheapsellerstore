import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown, Lock, TrendingUp, Trophy, UsersRound } from "lucide-react";
import { SectionHeader, Surface } from "@/components/app-kit";
import { UserAvatar } from "@/components/user-avatar";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/currencies";
import { TIERS } from "@/lib/leaderboard-tiers";
import { isWholesaleRole } from "@/lib/roles";
import { getSellerLeaderboard, type SellerBoardMetric, type SellerLeaderboardEntry } from "@/lib/seller-leaderboard";
import { isReferralCommissionEnabled } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seller board" };

const SHOWN = 25;
const medal = (id: string) => TIERS.find((t) => t.id === id)!;
const MEDALS = [medal("gold"), medal("silver"), medal("bronze")];
/** Visual podium order is 2nd · 1st · 3rd. */
const PODIUM = [
  { place: 1, pillar: "h-20", avatar: "size-16" },
  { place: 0, pillar: "h-28", avatar: "size-20" },
  { place: 2, pillar: "h-14", avatar: "size-16" },
];

type Ranked = SellerLeaderboardEntry & { rank: number };

const METRICS: Record<SellerBoardMetric, { label: string; unit: string; value: (e: SellerLeaderboardEntry) => number; fmt: (n: number) => string }> = {
  volume: { label: "Volume", unit: "bought", value: (e) => e.sales, fmt: formatMoney },
  referrals: { label: "Referrals", unit: "referred", value: (e) => e.referrals, fmt: (n) => n.toLocaleString() },
  earnings: { label: "Earnings", unit: "earned", value: (e) => e.earnings, fmt: formatMoney },
};

export default async function SellerLeaderboardPage({ searchParams }: { searchParams: Promise<{ by?: string }> }) {
  const user = (await getCurrentUser())!;
  // Fully hidden from regular customers — sellers, resellers and admins only.
  if (!isWholesaleRole(user.role) && user.role !== "ADMIN") notFound();

  const commission = await isReferralCommissionEnabled();
  const tabs: SellerBoardMetric[] = commission ? ["volume", "referrals", "earnings"] : ["volume", "referrals"];
  const { by: raw } = await searchParams;
  const by: SellerBoardMetric = tabs.includes(raw as SellerBoardMetric) ? (raw as SellerBoardMetric) : "volume";
  const m = METRICS[by];

  const all: Ranked[] = (await getSellerLeaderboard(500, user.id, by).catch(() => [])).map((e, i) => ({ ...e, rank: i + 1 }));
  const board = all.filter((e) => m.value(e) > 0);
  const top = board.slice(0, SHOWN);
  const viewer = board.find((e) => e.id === user.id) ?? null;
  const viewerOutside = viewer && viewer.rank > SHOWN;
  const ahead = viewer && viewer.rank > 1 ? board[viewer.rank - 2] : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Standing viewer={viewer} ahead={ahead} total={board.length} by={by} />

      <nav aria-label="Rank by" className={cn("relative grid rounded-2xl border border-white/[0.06] bg-card/80 p-1", tabs.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        <span
          aria-hidden
          className="bg-brand-gradient absolute inset-y-1 left-1 rounded-xl shadow-lg shadow-primary/25"
          style={{ width: `calc((100% - 0.5rem) / ${tabs.length})`, transform: `translateX(${tabs.indexOf(by) * 100}%)` }}
        />
        {tabs.map((t) => (
          <Link
            key={t}
            href={`/app/seller/leaderboard?by=${t}`}
            replace
            scroll={false}
            aria-current={t === by ? "page" : undefined}
            className={cn("relative flex h-9 items-center justify-center rounded-xl text-[13px] font-semibold transition-colors", t === by ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {METRICS[t].label}
          </Link>
        ))}
      </nav>

      {board.length === 0 ? (
        <Surface className="flex flex-col items-center px-6 py-14 text-center">
          <span className="anim-float grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-amber-400/30 to-amber-400/5 text-amber-300 ring-1 ring-inset ring-amber-300/25">
            <Crown className="size-7" />
          </span>
          <p className="mt-4 font-display text-lg font-bold">No one on this board yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {by === "referrals" ? "Invite your first customer to claim the top spot." : "Your first wholesale order puts you on the board."}
          </p>
        </Surface>
      ) : (
        <>
          <section aria-label="Top 3">
            <SectionHeader title={`Top sellers by ${m.label.toLowerCase()}`} icon={Trophy} />
            <Podium top={top.slice(0, 3)} you={user.id} by={by} />
          </section>

          {top.length > 3 || viewerOutside ? (
            <Surface>
              <ol className="p-1.5">
                {top.slice(3).map((e, i) => (
                  <Row key={e.id} e={e} you={e.id === user.id} by={by} d={i} />
                ))}
                {viewerOutside && viewer ? (
                  <>
                    <li aria-hidden className="flex justify-center gap-1 py-1.5">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="size-1 rounded-full bg-muted-foreground/40" />
                      ))}
                    </li>
                    <Row e={viewer} you by={by} d={0} />
                  </>
                ) : null}
              </ol>
            </Surface>
          ) : null}
        </>
      )}

      <p className="px-1 text-center text-xs text-muted-foreground">
        Private to sellers and resellers. Other usernames are partly hidden. Volume counts paid wholesale orders.
      </p>
    </div>
  );
}

function Standing({ viewer, ahead, total, by }: { viewer: Ranked | null; ahead?: Ranked; total: number; by: SellerBoardMetric }) {
  const m = METRICS[by];
  const tint = viewer && viewer.rank <= 3 ? MEDALS[viewer.rank - 1].mid : "#8b5cf6";
  return (
    <section className="hero-card p-5 sm:p-6" style={{ "--hero-a": tint, "--hero-b": "var(--primary)" } as React.CSSProperties}>
      <div aria-hidden className="absolute -right-12 -top-12 -z-10 size-52 rounded-full border-[18px] border-white/[0.05]" />
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
        <Trophy className="size-3.5" /> Seller board
      </p>
      {viewer ? (
        <>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-white/60">Your rank · {m.label}</p>
              <p className="font-display text-5xl font-bold leading-none tracking-tight tabular-nums">
                <span className="text-2xl text-white/50">#</span>
                {viewer.rank}
                <span className="ml-1.5 text-base font-semibold text-white/45">of {total}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] uppercase tracking-wider text-white/55">{m.unit}</p>
              <p className="font-display text-xl font-bold tabular-nums">{m.fmt(m.value(viewer))}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-5 text-sm text-white/75">
            <span className="flex items-center gap-1.5">
              <UsersRound className="size-3.5 text-white/50" /> <b className="text-white">{viewer.referrals}</b> referrals
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-white/50" /> <b className="text-white">{formatMoney(viewer.sales)}</b> volume
            </span>
          </div>
          {ahead ? (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.07] px-3.5 py-2.5 text-xs text-white/75">
              <TrendingUp className="size-4 shrink-0 text-success" />
              <span>
                <b className="text-white">{m.fmt(m.value(ahead) - m.value(viewer))}</b> more {by === "referrals" ? "referrals" : m.unit} to pass <b className="text-white">@{ahead.username}</b> for #{ahead.rank}
              </span>
            </p>
          ) : viewer.rank === 1 ? (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-300/10 px-3.5 py-2.5 text-xs font-semibold text-amber-200">
              <Crown className="size-4 shrink-0" /> You&apos;re the #1 seller. Hold the crown!
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-3 font-display text-2xl font-bold tracking-tight">You&apos;re not on this board yet</p>
          <p className="mt-1 max-w-sm text-sm text-white/65">
            {by === "referrals" ? "Share your referral link to start climbing." : "Place a wholesale order to get ranked."}
          </p>
          <Link
            href={by === "referrals" ? "/app/referral" : "/app"}
            className="tap mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#0b1020] shadow-lg shadow-black/30"
          >
            {by === "referrals" ? "Invite customers" : "Browse products"}
          </Link>
        </>
      )}
    </section>
  );
}

function Podium({ top, you, by }: { top: Ranked[]; you: string; by: SellerBoardMetric }) {
  const m = METRICS[by];
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {PODIUM.map((slot, i) => {
        const e = top[slot.place];
        const md = MEDALS[slot.place];
        return (
          <div key={slot.place} className="anim-fade-up flex min-w-0 flex-col items-center" style={{ "--d": `${[150, 0, 300][i]}ms` } as React.CSSProperties}>
            {e ? (
              <>
                {slot.place === 0 ? <Crown className="anim-float mb-1 size-7 text-amber-300 drop-shadow-[0_0_10px_rgb(251_191_36/0.6)]" /> : null}
                <div className="rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${md.from}, ${md.mid}, ${md.to})`, boxShadow: `0 0 24px -4px ${md.mid}` }}>
                  <UserAvatar src={e.avatarUrl} seed={e.username} className={cn("border-2 border-background", slot.avatar)} />
                </div>
                <p className={cn("mt-2.5 w-full truncate text-center text-[13px] font-bold", e.id === you && "text-primary")}>
                  {e.emojiStatus ? `${e.emojiStatus} ` : ""}
                  {e.username}
                </p>
                <p className="font-display text-sm font-bold tabular-nums text-foreground/90">{m.fmt(m.value(e))}</p>
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
            <div className={cn("relative mt-2.5 w-full overflow-hidden rounded-t-2xl", slot.pillar)} style={{ background: `linear-gradient(180deg, ${md.mid}cc, ${md.to}55 70%, transparent)` }}>
              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/50" />
              <span className="absolute inset-x-0 top-2 text-center font-display text-3xl font-black text-white/90 drop-shadow-[0_2px_6px_rgb(0_0_0/0.35)]">{slot.place + 1}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Row({ e, you, by, d }: { e: Ranked; you: boolean; by: SellerBoardMetric; d: number }) {
  const m = METRICS[by];
  return (
    <li
      className={cn("anim-fade-up flex items-center gap-3 rounded-2xl px-2.5 py-2.5", you && "bg-primary/10 ring-1 ring-inset ring-primary/30")}
      style={{ "--d": `${Math.min(d, 8) * 35}ms` } as React.CSSProperties}
    >
      <span className="w-7 shrink-0 text-center font-display text-base font-bold tabular-nums text-muted-foreground">{e.rank}</span>
      <UserAvatar src={e.avatarUrl} seed={e.username} className="size-10" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
          <span className="truncate">
            {e.emojiStatus ? `${e.emojiStatus} ` : ""}
            {e.username}
          </span>
          {you ? <span className="shrink-0 rounded-md bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground">YOU</span> : null}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className={cn("font-semibold", e.role === "SELLER" ? "text-sky-300" : "text-violet-300")}>{e.role === "SELLER" ? "Seller" : "Reseller"}</span>
          {by === "referrals" ? ` · ${formatMoney(e.sales)} volume` : ` · ${e.referrals} referrals`}
        </p>
      </div>
      <span className="shrink-0 font-display text-sm font-bold tabular-nums">{m.fmt(m.value(e))}</span>
    </li>
  );
}
