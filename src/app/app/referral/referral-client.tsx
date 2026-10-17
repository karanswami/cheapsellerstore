"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Copy,
  Frown,
  Gift,
  KeyRound,
  Link2,
  MessageCircle,
  Percent,
  Send,
  Share2,
  Sparkles,
  Ticket,
  TicketPercent,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { IconTile, SectionHeader, Surface, type Tone } from "@/components/app-kit";
import { CountUp } from "@/components/app-kit-client";
import { formatDate } from "@/components/app-ui";
import { SpinWheel } from "@/components/spin-wheel";
import { RobotAvatar } from "@/components/user-avatar";
import { formatMoney } from "@/lib/currencies";
import { feedbackTap } from "@/lib/feedback";
import { formatReferralRewardNote } from "@/lib/referral-utils";
import type { SpinHistoryItem, SpinState } from "@/lib/spin";
import { cn } from "@/lib/utils";
import type { ReferralDashboard } from "@/types/referral";

type Props = {
  data: ReferralDashboard;
  spin: SpinState;
  totals: { earned: number; won: number };
  earnedFriendIds: string[];
  commission: boolean;
  role: string;
  isAdmin: boolean;
  origin: string;
};

const tap = () => feedbackTap({ impact: "selection", silent: true });
const FRIENDS_PREVIEW = 8;
const PRIZES_PREVIEW = 6;

export function ReferralClient({ data, spin: initialSpin, totals, earnedFriendIds, commission, role, isAdmin, origin }: Props) {
  const [spin, setSpin] = useState(initialSpin);
  const [allFriends, setAllFriends] = useState(false);
  const [allPrizes, setAllPrizes] = useState(false);

  const link = `${origin}/register?ref=${encodeURIComponent(data.referralCode)}`;
  const shareText = `Join me on ${data.siteName} — sign up with my link:`;
  const earned = new Set(earnedFriendIds);
  // Server totals plus wins from spins made on this page since it loaded.
  const wins = (s: SpinState) => s.history.filter((h) => h.prizeKind && h.prizeKind !== "NONE").length;
  const won = totals.won + Math.max(0, wins(spin) - wins(initialSpin));
  const { stats } = data;
  const rate = role === "SELLER" ? stats.commissionRates.seller : role === "RESELLER" ? stats.commissionRates.reseller : stats.commissionRates.user;

  const deposited = data.network.filter((n) => earned.has(n.id)).length;
  // Friends who already unlocked a spin sink below the ones still to nudge.
  const friends = [...data.network].sort((a, b) => Number(earned.has(a.id)) - Number(earned.has(b.id)));
  const prizes = spin.history.filter((h) => h.prizeKind);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-start">
      {/* wheel column (first on mobile) */}
      <div className="min-w-0 space-y-3 lg:sticky lg:top-20 lg:order-2">
        {spin.enabled ? (
          <SpinWheel initial={spin} onState={setSpin} hideHistory />
        ) : (
          <WheelSoon isAdmin={isAdmin} />
        )}
        {spin.enabled && spin.available < 1 ? (
          <p className="px-2 text-center text-xs text-muted-foreground">
            Out of spins — invite a friend below and their first deposit gives you another.
          </p>
        ) : null}
      </div>

      <div className="min-w-0 space-y-6 lg:order-1">
        <InviteTicket code={data.referralCode} link={link} shareText={shareText} siteName={data.siteName} />

        {/* stats */}
        <Surface className="grid grid-cols-4 divide-x divide-white/[0.06] py-4">
          <Stat icon={Users} label="Friends" value={stats.referralCount} storageKey="ref-friends" />
          <Stat icon={Ticket} label="Earned" value={totals.earned} storageKey="ref-earned" />
          <Stat icon={Sparkles} label="Left" value={spin.available} accent={spin.available > 0} />
          <Stat icon={Trophy} label="Won" value={won} />
        </Surface>

        <HowItWorks />

        {/* friends */}
        <section>
          <SectionHeader title={`Your friends`} icon={Users} />
          {data.network.length === 0 ? (
            <Surface className="flex flex-col items-center px-6 py-10 text-center">
              <span className="anim-float grid size-14 place-items-center rounded-3xl bg-gradient-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-inset ring-primary/25">
                <UserPlus className="size-6" />
              </span>
              <p className="mt-3 font-display font-bold">No friends yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">Share your ticket above — everyone who joins shows up here.</p>
            </Surface>
          ) : (
            <Surface>
              <div className="border-b border-white/[0.06] p-4">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">
                    {deposited} of {data.network.length} deposited
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {data.network.length - deposited} {data.network.length - deposited === 1 ? "spin" : "spins"} waiting
                  </span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#fbbf24,#f59e0b)] transition-[width] duration-700"
                    style={{ width: `${(deposited / data.network.length) * 100}%` }}
                  />
                </div>
              </div>
              <ul className="p-1.5">
                {(allFriends ? friends : friends.slice(0, FRIENDS_PREVIEW)).map((n) => {
                  const done = earned.has(n.id);
                  return (
                    <li key={n.id} className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5">
                      <RobotAvatar seed={n.username} className="size-10 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">@{n.username}</p>
                        <p className="text-xs text-muted-foreground">Joined {formatDate(n.createdAt)}</p>
                      </div>
                      {done ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-300/15 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                          <Ticket className="size-3.5" /> Spin earned
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          <Clock className="size-3.5" /> No deposit yet
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {friends.length > FRIENDS_PREVIEW ? (
                <ShowMore open={allFriends} count={friends.length} onClick={() => setAllFriends((v) => !v)} />
              ) : null}
            </Surface>
          )}
        </section>

        {/* prize history */}
        {prizes.length ? (
          <section>
            <SectionHeader title="Your prizes" icon={Gift} />
            <Surface>
              <ul className="p-1.5">
                {(allPrizes ? prizes : prizes.slice(0, PRIZES_PREVIEW)).map((h) => (
                  <PrizeRow key={h.id} h={h} />
                ))}
              </ul>
              {prizes.length > PRIZES_PREVIEW ? (
                <ShowMore open={allPrizes} count={prizes.length} onClick={() => setAllPrizes((v) => !v)} />
              ) : null}
            </Surface>
          </section>
        ) : null}

        {/* optional purchase commission */}
        {commission ? (
          <section>
            <SectionHeader title="Commission" icon={Percent} />
            <Surface>
              <div className="flex items-center gap-3 border-b border-white/[0.06] p-4">
                <IconTile icon={Percent} tone="emerald" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">You earn {rate}% of every friend purchase</p>
                  <p className="font-display text-2xl font-bold">
                    <CountUp value={stats.rewardTotal} storageKey="ref-commission" money />
                  </p>
                </div>
              </div>
              {data.rewards.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Nothing yet — it lands here when a friend buys.</p>
              ) : (
                <ul className="p-1.5">
                  {data.rewards.slice(0, 10).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl px-2.5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{formatReferralRewardNote(r.note)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.createdAt, true)}</p>
                      </div>
                      <span className="shrink-0 font-display text-sm font-bold text-success tabular-nums">+{formatMoney(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** Golden invite ticket: tap the code to copy, share stub underneath. */
function InviteTicket({ code, link, shareText, siteName }: { code: string; link: string; shareText: string; siteName: string }) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  async function copy(kind: "link" | "code") {
    try {
      await navigator.clipboard.writeText(kind === "link" ? link : code);
      feedbackTap({ impact: "success", silent: true });
      setCopied(kind);
      toast.success(kind === "link" ? "Invite link copied" : "Code copied");
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function share() {
    tap();
    if (navigator.share) await navigator.share({ title: siteName, text: shareText, url: link }).catch(() => {});
    else copy("link");
  }

  const enc = encodeURIComponent;
  const socials: { label: string; href: string; icon: LucideIcon; className: string }[] = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${shareText} ${link}`)}`, icon: MessageCircle, className: "bg-[#25d366]/15 text-[#4ade80] ring-[#25d366]/30" },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc(link)}&text=${enc(shareText)}`, icon: Send, className: "bg-[#229ed9]/15 text-[#38bdf8] ring-[#229ed9]/30" },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(link)}`, icon: Share2, className: "bg-white/10 text-white ring-white/20" },
  ];

  return (
    <section className="hero-card [--hero-a:#f59e0b] [--hero-b:#f43f5e]">
      <div aria-hidden className="absolute -right-10 -top-10 -z-10 size-44 rounded-full border-[16px] border-amber-200/[0.06]" />
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />

      <div className="p-5 pb-4 sm:p-6 sm:pb-5">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200">
          <Gift className="size-3.5" /> 1 friend = 1 free spin
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">Invite friends, spin to win</h1>
        <p className="mt-1 text-sm text-white/65">
          Your spin unlocks when a friend joins with your code and makes their <b className="text-white">first deposit</b>.
        </p>

        <button
          type="button"
          onClick={() => copy("code")}
          className="tap mt-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-amber-300/40 bg-amber-300/[0.07] px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.2em] text-amber-200/70">Your invite code</span>
            <span className="mt-0.5 block truncate font-mono text-2xl font-bold tracking-[0.15em] text-amber-100">{code}</span>
          </span>
          <span className={cn("flex shrink-0 items-center gap-1 text-xs font-semibold", copied === "code" ? "text-success" : "text-amber-300")}>
            {copied === "code" ? <Check className="anim-pop-in size-4" strokeWidth={3} /> : <Copy className="size-4" />}
            {copied === "code" ? "Copied" : "Copy"}
          </span>
        </button>
      </div>

      {/* perforation */}
      <div aria-hidden className="relative h-4">
        <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
        <span className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
        <span className="absolute inset-x-4 top-1/2 border-t border-dashed border-amber-200/20" />
      </div>

      <div className="space-y-3 p-5 pt-3 sm:px-6">
        <button
          type="button"
          onClick={() => copy("link")}
          className="tap flex w-full min-w-0 items-center gap-2.5 rounded-2xl bg-white/[0.06] px-3.5 py-3 text-left transition-colors hover:bg-white/10"
        >
          <Link2 className="size-4 shrink-0 text-white/60" />
          <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-white/80">{link.replace(/^https?:\/\//, "")}</span>
          {copied === "link" ? <Check className="anim-pop-in size-4 shrink-0 text-success" strokeWidth={3} /> : <Copy className="size-4 shrink-0 text-white/60" />}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={share}
            className="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#fde68a,#f59e0b_60%,#d97706)] text-sm font-black uppercase tracking-wide text-[#1a0b04] shadow-[inset_0_2px_0_rgb(255_255_255/0.5),0_10px_24px_-10px_rgb(245_158_11/0.8)]"
          >
            <Share2 className="size-4" /> Share invite
          </button>
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share on ${s.label}`}
              title={s.label}
              onClick={tap}
              className={cn("tap grid size-12 shrink-0 place-items-center rounded-2xl ring-1 ring-inset", s.className)}
            >
              <s.icon className="size-5" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  storageKey,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  storageKey?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1 text-center">
      <Icon className={cn("size-4", accent ? "text-amber-300" : "text-muted-foreground")} />
      <p className={cn("mt-1.5 font-display text-2xl font-bold leading-none", accent && "text-amber-300")}>
        {storageKey ? <CountUp value={value} storageKey={storageKey} /> : <span className="tabular-nums">{value}</span>}
      </p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function HowItWorks() {
  const steps: { icon: LucideIcon; tone: Tone; title: string; text: string }[] = [
    { icon: UserPlus, tone: "sky", title: "Friend joins", text: "With your link or code" },
    { icon: Wallet, tone: "emerald", title: "First deposit", text: "Unlocks 1 spin for you" },
    { icon: Sparkles, tone: "amber", title: "Spin & win", text: "Keys, credit, coupons" },
  ];
  return (
    <section>
      <SectionHeader title="How it works" />
      <ol className="relative grid grid-cols-3 gap-2">
        <span aria-hidden className="absolute left-[16%] right-[16%] top-[1.375rem] border-t border-dashed border-white/15" />
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex flex-col items-center text-center">
            <span className="relative rounded-2xl bg-background p-0.5">
              <IconTile icon={s.icon} tone={s.tone} />
              <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-card text-[10px] font-bold ring-1 ring-white/10">
                {i + 1}
              </span>
            </span>
            <p className="mt-2 text-[13px] font-semibold leading-tight">{s.title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const PRIZE_LOOK: Record<string, { icon: LucideIcon; tone: Tone }> = {
  KEY: { icon: KeyRound, tone: "amber" },
  WALLET: { icon: Wallet, tone: "emerald" },
  COUPON: { icon: TicketPercent, tone: "rose" },
  SPIN: { icon: Sparkles, tone: "violet" },
};

function prizeTitle(h: SpinHistoryItem) {
  switch (h.prizeKind) {
    case "KEY":
      return `${h.quantity ?? 1}× ${h.prizeLabel}`;
    case "WALLET":
      return `${formatMoney(h.walletAmount ?? 0)} wallet credit`;
    case "SPIN":
      return `+${h.quantity ?? 1} free spin${(h.quantity ?? 1) > 1 ? "s" : ""}`;
    default:
      return h.prizeLabel ?? "Spin";
  }
}

function PrizeRow({ h }: { h: SpinHistoryItem }) {
  const [copied, setCopied] = useState(false);
  const lose = h.prizeKind === "NONE";
  const look = PRIZE_LOOK[h.prizeKind ?? ""];
  const when = formatDate(h.usedAt ?? h.createdAt);
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl px-2.5 py-2.5", lose && "opacity-60")}>
      {look ? (
        <IconTile icon={look.icon} tone={look.tone} className="size-10 rounded-xl" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Frown className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{prizeTitle(h)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {h.friend ? `From @${h.friend} · ` : ""}
          {when}
        </p>
      </div>
      {h.prizeKind === "KEY" && h.orderId ? (
        <Link
          href={`/app/win/${h.orderId}`}
          className="tap flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-amber-300/15 px-3 text-xs font-bold text-amber-300"
        >
          <KeyRound className="size-3.5" /> Reveal
        </Link>
      ) : h.prizeKind === "COUPON" && h.couponCode ? (
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(h.couponCode!);
              feedbackTap({ impact: "success", silent: true });
              setCopied(true);
              toast.success("Coupon copied");
              setTimeout(() => setCopied(false), 1200);
            } catch {
              toast.error("Copy failed");
            }
          }}
          className="tap flex h-9 max-w-[45%] shrink-0 items-center gap-1.5 rounded-xl bg-muted/70 px-3 font-mono text-xs font-semibold"
        >
          {copied ? <Check className="anim-pop-in size-3.5 shrink-0 text-success" strokeWidth={3} /> : <Copy className="size-3.5 shrink-0" />}
          <span className="truncate">{h.couponCode}</span>
        </button>
      ) : null}
    </li>
  );
}

function ShowMore({ open, count, onClick }: { open: boolean; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        tap();
        onClick();
      }}
      className="tap w-full border-t border-white/[0.06] py-3 text-center text-xs font-semibold text-primary"
    >
      {open ? "Show less" : `Show all ${count}`}
    </button>
  );
}

function WheelSoon({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(120%_85%_at_50%_0%,#3b1d6e_0%,#1b1038_48%,#0b0718_100%)] p-8 text-center text-white">
      <span className="anim-float mx-auto grid size-16 place-items-center rounded-full border-4 border-[#1a0b04] bg-[radial-gradient(circle_at_35%_30%,#fff7c2,#fbbf24_45%,#b45309)] text-[#1a0b04]">
        <Clock className="size-7" />
      </span>
      <p className="mt-4 font-display text-2xl font-black">Wheel coming soon</p>
      <p className="mt-1 text-sm text-white/60">Keep inviting — spins you earn now are saved for launch.</p>
      {isAdmin ? (
        <Link href="/admin/spin" className="mt-4 inline-block text-sm font-semibold text-amber-300 underline underline-offset-2">
          Set up prizes
        </Link>
      ) : null}
    </div>
  );
}
