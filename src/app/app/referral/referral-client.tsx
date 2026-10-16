"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Clock, Copy, Gift, Percent, Send, Share2, Sparkles, Ticket, Trophy, UserPlus, Users, Wallet } from "lucide-react";
import { EmptyState, Panel, formatDate } from "@/components/app-ui";
import { SpinWheel, prizeText } from "@/components/spin-wheel";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currencies";
import { formatReferralRewardNote } from "@/lib/referral-utils";
import type { SpinState } from "@/lib/spin";
import type { ReferralDashboard } from "@/types/referral";
import { cn } from "@/lib/utils";

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

export function ReferralClient({ data, spin: initialSpin, totals, earnedFriendIds, commission, role, isAdmin, origin }: Props) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [spin, setSpin] = useState(initialSpin);

  const link = `${origin}/register?ref=${encodeURIComponent(data.referralCode)}`;
  const shareText = `Join me on ${data.siteName} — sign up with my link:`;
  const earned = new Set(earnedFriendIds);
  // Server total plus wins from spins made on this page since it loaded.
  const wins = (s: SpinState) => s.history.filter((h) => h.prizeKind && h.prizeKind !== "NONE").length;
  const won = totals.won + Math.max(0, wins(spin) - wins(initialSpin));
  const { stats } = data;
  const rate = role === "SELLER" ? stats.commissionRates.seller : role === "RESELLER" ? stats.commissionRates.reseller : stats.commissionRates.user;

  function copy(kind: "link" | "code") {
    navigator.clipboard?.writeText(kind === "link" ? link : data.referralCode);
    setCopied(kind);
    toast.success(kind === "link" ? "Link copied" : "Code copied");
    setTimeout(() => setCopied(null), 1500);
  }

  async function share() {
    if (navigator.share) await navigator.share({ title: data.siteName, text: shareText, url: link }).catch(() => {});
    else copy("link");
  }

  const enc = encodeURIComponent;
  const socials = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${shareText} ${link}`)}`, className: "bg-[#25d366] text-white hover:bg-[#1ebe5a]" },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc(link)}&text=${enc(shareText)}`, className: "bg-[#229ed9] text-white hover:bg-[#1b8cc2]" },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(link)}`, className: "bg-neutral-900 text-white hover:bg-black" },
  ];

  const tiles = [
    { label: "Friends invited", value: stats.referralCount, icon: Users },
    { label: "Spins earned", value: totals.earned, icon: Ticket },
    { label: "Spins left", value: spin.available, icon: Sparkles, accent: spin.available > 0 },
    { label: "Prizes won", value: won, icon: Trophy },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-start">
      {/* wheel column (first on mobile) */}
      <div className="min-w-0 lg:sticky lg:top-20 lg:order-2">
        {spin.enabled ? (
          <SpinWheel initial={spin} onState={setSpin} />
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(120%_85%_at_50%_0%,#3b1d6e_0%,#1b1038_48%,#0b0718_100%)] p-8 text-center text-white">
            <span className="mx-auto grid size-16 place-items-center rounded-full border-4 border-[#1a0b04] bg-[radial-gradient(circle_at_35%_30%,#fff7c2,#fbbf24_45%,#b45309)] text-[#1a0b04]">
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
        )}
      </div>

      <div className="min-w-0 space-y-6 lg:order-1">
        {/* invite */}
        <section className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-amber-300/25 blur-[90px]" />
          <div className="relative">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/25 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
              <Gift className="size-3.5" /> 1 friend = 1 free spin
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">Share &amp; win more spins</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              When a friend signs up with your link and makes their <b className="text-foreground">first deposit</b>, you get a spin. Win keys,
              wallet credit, coupons — or even more spins.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <button
                type="button"
                onClick={() => copy("link")}
                className="flex min-w-0 items-center gap-2 rounded-xl border bg-background px-3 py-2.5 text-left font-mono text-sm transition-colors hover:border-primary/50"
              >
                <span className="min-w-0 flex-1 truncate">{link}</span>
                {copied === "link" ? <Check className="size-4 shrink-0 text-success" /> : <Copy className="size-4 shrink-0 text-muted-foreground" />}
              </button>
              <Button onClick={share} className="h-11">
                <Share2 /> Share link
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors", s.className)}
                >
                  <Send className="size-3.5" /> {s.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => copy("code")}
                className="ml-auto inline-flex h-9 items-center gap-2 rounded-full border bg-background px-3 text-sm text-muted-foreground"
              >
                Code <b className="font-mono text-foreground">{data.referralCode}</b>
                {copied === "code" ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>
        </section>

        {/* how it works */}
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: UserPlus, title: "Friend joins", text: "They sign up with your link or code." },
            { icon: Wallet, title: "First deposit", text: "Their first wallet top-up unlocks 1 spin for you." },
            { icon: Sparkles, title: "Spin & win", text: "Keys, wallet credit, coupons or bonus spins." },
          ].map((st, i) => (
            <li key={st.title} className="relative flex items-start gap-3 rounded-xl border bg-card p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <st.icon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                  {st.title}
                </p>
                <p className="text-xs text-muted-foreground">{st.text}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* stats */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className={cn("rounded-xl border bg-card p-4", t.accent && "border-amber-400/60 bg-amber-300/10")}>
              <t.icon className={cn("size-4", t.accent ? "text-amber-600" : "text-muted-foreground")} />
              <p className="mt-2 font-display text-2xl font-bold leading-none tabular-nums">{t.value}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </section>

        {/* prizes on the wheel */}
        {spin.enabled ? (
          <section className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On the wheel</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[...spin.prizes]
                .sort((a, b) => a.slot - b.slot)
                .filter((p) => p.kind !== "NONE")
                .map((p) => (
                  <span key={p.slot} className="rounded-full border border-amber-400/50 bg-amber-300/20 px-2.5 py-1 text-xs font-semibold text-amber-900">
                    {prizeText(p)}
                  </span>
                ))}
            </div>
          </section>
        ) : null}

        {/* friends */}
        <Panel title={`Your friends (${data.network.length})`} icon={Users}>
          {data.network.length === 0 ? (
            <EmptyState icon={UserPlus} title="No friends yet" hint="Share your link — friends who join appear here." />
          ) : (
            <ul className="divide-y">
              {data.network.map((n) => {
                const done = earned.has(n.id);
                return (
                  <li key={n.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted font-display text-sm font-bold uppercase">
                        {(n.name || n.username).slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">@{n.username}</p>
                        <p className="text-xs text-muted-foreground">Joined {formatDate(n.createdAt)}</p>
                      </div>
                    </div>
                    {done ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                        <Ticket className="size-3.5" /> Spin earned
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        <Clock className="size-3.5" /> Waiting for deposit
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* optional purchase commission */}
        {commission ? (
          <Panel
            title="Commission"
            icon={Percent}
            action={<span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{rate}% of purchases</span>}
          >
            <div className="mb-3 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Total earned</span>
              <b className="font-display text-lg">{formatMoney(stats.rewardTotal)}</b>
            </div>
            {data.rewards.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">You earn a % each time a referred friend buys.</p>
            ) : (
              <ul className="divide-y">
                {data.rewards.slice(0, 10).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{formatReferralRewardNote(r.note)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.createdAt, true)}</p>
                    </div>
                    <span className="text-sm font-semibold text-success">+{formatMoney(r.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
