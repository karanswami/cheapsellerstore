"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Crown, Gift, Percent, Share2, ShoppingBag, Users, Wallet } from "lucide-react";
import { EmptyState, Panel, formatDate } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currencies";
import { formatReferralRewardNote } from "@/lib/referral-utils";
import { roleLabel } from "@/lib/roles";
import type { ReferralDashboard } from "@/types/referral";
import { cn } from "@/lib/utils";

export function ReferralClient({ data, role, origin }: { data: ReferralDashboard; role: string; origin: string }) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [tab, setTab] = useState<"network" | "rewards">("network");

  const link = `${origin}/register?ref=${encodeURIComponent(data.referralCode)}`;
  const { stats } = data;
  const rate = role === "SELLER" ? stats.commissionRates.seller : role === "RESELLER" ? stats.commissionRates.reseller : stats.commissionRates.user;

  function copy(kind: "link" | "code") {
    navigator.clipboard?.writeText(kind === "link" ? link : data.referralCode);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: data.siteName, text: `Join ${data.siteName}`, url: link }).catch(() => {});
    } else {
      copy("link");
      toast.success("Link copied");
    }
  }

  const tiles = [
    { label: "Friends joined", value: String(stats.referralCount), icon: Users },
    { label: "Their orders", value: String(stats.orderCount), icon: ShoppingBag },
    { label: "Sales generated", value: formatMoney(stats.referralSales), icon: Wallet },
    { label: "You earned", value: formatMoney(stats.rewardTotal), icon: Gift, accent: true },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-7">
        <div className="absolute -right-10 -top-10 size-56 rounded-full bg-highlight/20 blur-[90px]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <Badge variant="highlight">
              <Percent /> {rate}% commission as {roleLabel(role as never)}
            </Badge>
            <h2 className="font-display text-2xl font-bold">Your referral link</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <p className="min-w-0 flex-1 truncate rounded-lg border bg-background/70 px-3 py-2.5 font-mono text-sm">{link}</p>
              <Button onClick={() => copy("link")}>
                {copied === "link" ? <Check /> : <Copy />} Copy link
              </Button>
              <Button variant="secondary" onClick={share}>
                <Share2 /> Share
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Or share your code{" "}
              <button onClick={() => copy("code")} className="rounded bg-muted px-2 py-0.5 font-mono font-semibold text-foreground">
                {data.referralCode} {copied === "code" ? "✓" : ""}
              </button>
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center text-xs lg:w-72">
            {([["User", stats.commissionRates.user], ["Seller", stats.commissionRates.seller], ["Reseller", stats.commissionRates.reseller]] as const).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-background/60 p-2.5">
                <dd className="font-display text-lg font-bold">{v}%</dd>
                <dt className="text-muted-foreground">{k} buys</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", t.accent ? "bg-success/15 text-success" : "bg-primary/15 text-primary")}>
              <t.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-bold leading-none">{t.value}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{t.label}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel>
          <div className="mb-4 flex gap-2">
            {(["network", "rewards"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn("h-9 rounded-full border px-4 text-sm font-medium capitalize", tab === t ? "border-transparent bg-brand-gradient text-primary-foreground" : "bg-muted text-muted-foreground")}
              >
                {t === "network" ? `Your network (${data.network.length})` : `Rewards (${data.rewards.length})`}
              </button>
            ))}
          </div>

          {tab === "network" ? (
            data.network.length === 0 ? (
              <EmptyState icon={Users} title="No referrals yet" hint="Friends who sign up with your link will appear here." />
            ) : (
              <ul className="divide-y">
                {data.network.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {n.name} <span className="text-muted-foreground">@{n.username}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Joined {formatDate(n.createdAt)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{formatMoney(n.totalSpend)}</p>
                      <p className="text-xs text-muted-foreground">{n.orderCount} order{n.orderCount === 1 ? "" : "s"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : data.rewards.length === 0 ? (
            <EmptyState icon={Gift} title="No rewards yet" hint="You earn a commission each time a referred friend buys." />
          ) : (
            <ul className="divide-y">
              {data.rewards.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
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

        <Panel title="Top earners this week" icon={Crown}>
          {data.weeklyLeaderboard.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No rewards earned yet this week.</p>
          ) : (
            <ol className="space-y-1.5">
              {data.weeklyLeaderboard.map((e) => (
                <li key={e.userId} className={cn("flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm", e.isCurrentUser && "bg-primary/10")}>
                  <span className="w-5 text-center font-display font-bold text-muted-foreground">{e.rank}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{e.isCurrentUser ? "You" : `@${e.username}`}</span>
                  <span className="font-semibold">{formatMoney(e.amount)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
