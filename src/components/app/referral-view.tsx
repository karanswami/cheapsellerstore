"use client";

import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import {
  HubEmptyPanel,
  HubListRow,
  HubListStack,
  HubPanelCard,
  hubListRowStyles,
} from "@/components/app/hub/hub-list-row";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { copyToClipboard } from "@/lib/clipboard";
import { formatMoney } from "@/lib/currencies";
import {
  buildReferralLink,
  formatReferralRewardNote,
} from "@/lib/referral-utils";
import { cn } from "@/lib/utils";
import type { ReferralDashboard } from "@/types/referral";
import {
  AlertCircle,
  Check,
  Copy,
  Gift,
  Link2,
  Share2,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TabId = "overview" | "network" | "rewards";

const TABS: { id: TabId; label: string; short: string }[] = [
  { id: "overview", label: "Overview", short: "Home" },
  { id: "network", label: "Network", short: "Invites" },
  { id: "rewards", label: "Rewards", short: "Earn" },
];

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ReferralView({ data }: { data: ReferralDashboard }) {
  const [tab, setTab] = useState<TabId>("overview");
  const [referralLink, setReferralLink] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setReferralLink(
      buildReferralLink(window.location.origin, data.referralCode),
    );
  }, [data.referralCode]);

  function resolveLink() {
    if (referralLink) return referralLink;
    if (typeof window === "undefined") return "";
    return buildReferralLink(window.location.origin, data.referralCode);
  }

  async function copyText(text: string, kind: "code" | "link") {
    const value = text.trim();
    if (!value) {
      toast.error("Nothing to copy yet");
      return;
    }
    const ok = await copyToClipboard(value);
    if (!ok) {
      toast.error("Could not copy");
      return;
    }
    if (kind === "code") {
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
      toast.success("Referral code copied");
    } else {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
      toast.success("Invite link copied");
    }
  }

  async function shareLink() {
    const link = resolveLink();
    if (!link) return;
    const text = `Join ${data.siteName} with my referral link.`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${data.siteName} Referral`,
          text,
          url: link,
        });
      } catch {
        // cancelled or unsupported payload — ignore
      }
      return;
    }
    await copyText(link, "link");
  }

  return (
    <HubPageShell>
      <HubHeaderBar
        icon={<Gift />}
        title="Referral"
        description={`Invite friends — User ${data.stats.commissionRates.user}% · Seller ${data.stats.commissionRates.seller}% · Reseller ${data.stats.commissionRates.reseller}%`}
        stats={[
          { label: "Invited", value: String(data.stats.referralCount) },
          { label: "Orders", value: String(data.stats.orderCount) },
          {
            label: "Network spend",
            value: formatMoney(data.stats.referralSales),
          },
          {
            label: "Your rewards",
            value: formatMoney(data.stats.rewardTotal),
            tone: "success",
          },
        ]}
        statsLabel="Referral summary"
      />

      <FilterChipRow role="tablist" aria-label="Referral sections">
        {TABS.map((t) => {
          const count =
            t.id === "network"
              ? data.network.length
              : t.id === "rewards"
                ? data.rewards.length
                : null;
          return (
            <FilterChip
              key={t.id}
              active={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {count != null ? (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-5 px-1.5 text-[10px]"
                >
                  {count}
                </Badge>
              ) : null}
            </FilterChip>
          );
        })}
      </FilterChipRow>

      {tab === "overview" ? (
        <div className="space-y-4">
          <HubPanelCard>
          <Card variant="feature" className="border-0 bg-transparent shadow-none">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Gift className="size-5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle>Your invite link</CardTitle>
                  <CardDescription>
                    New users who open this link get your code prefilled.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/8">
                <p className="text-[11px] text-muted-foreground">Invite URL</p>
                <p className="mt-0.5 truncate text-sm font-medium">
                  {referralLink || "Preparing link…"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => void copyText(resolveLink(), "link")}
                >
                  {copiedLink ? (
                    <Check className="size-4" />
                  ) : (
                    <Link2 className="size-4" />
                  )}
                  {copiedLink ? "Copied" : "Copy link"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => void shareLink()}
                >
                  <Share2 className="size-4" />
                  Share
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ring-1 ring-foreground/10">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">
                    Referral code
                  </p>
                  <p className="font-mono text-sm font-semibold tracking-wide">
                    {data.referralCode}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void copyText(data.referralCode, "code")}
                >
                  {copiedCode ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copiedCode ? "Copied" : "Copy"}
                </Button>
              </div>
            </CardContent>
          </Card>
          </HubPanelCard>

          <HubPanelCard>
          <Card variant="success" className="border-0 bg-transparent shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                  <Gift className="size-5" />
                </span>
                <div>
                  <CardTitle>Purchase commission rates</CardTitle>
                  <CardDescription className="mt-1">
                    Paid purchases from your invites credit your wallet by the
                    buyer&apos;s role rate.
                  </CardDescription>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">User</span>
                      <span className="font-semibold tabular-nums text-success">
                        {data.stats.commissionRates.user}%
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Seller</span>
                      <span className="font-semibold tabular-nums text-success">
                        {data.stats.commissionRates.seller}%
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Reseller</span>
                      <span className="font-semibold tabular-nums text-success">
                        {data.stats.commissionRates.reseller}%
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardHeader>
          </Card>
          </HubPanelCard>

          <HubPanelCard>
          <Card variant="list" className="border-0 bg-transparent shadow-none">
            <CardHeader className="border-b border-border/40 px-(--card-spacing) py-4">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-amber-500" />
                <CardTitle className="text-base">Weekly earners</CardTitle>
              </div>
              <CardDescription>
                Top referral rewards this week (UTC)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.weeklyLeaderboard.length === 0 ? (
                <EmptyState
                  className="rounded-none border-0 ring-0"
                  icon={<Trophy className="size-6" />}
                  title="No referral rewards this week yet"
                  description="Be the first."
                />
              ) : (
                <ul className="divide-y divide-border/40">
                  {data.weeklyLeaderboard.map((entry) => (
                    <li
                      key={entry.userId}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 sm:px-5",
                        entry.isCurrentUser && "bg-primary/8",
                      )}
                    >
                      <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                        {entry.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          @{entry.username}
                          {entry.isCurrentUser ? (
                            <Badge
                              variant="secondary"
                              className="ml-2 h-5 align-middle"
                            >
                              You
                            </Badge>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {entry.rewardCount} reward
                          {entry.rewardCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-success">
                        {formatMoney(entry.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          </HubPanelCard>

          <HubPanelCard>
          <Card variant="info" className="border-0 bg-transparent shadow-none">
            <CardHeader className="border-b border-border/40 pb-3">
              <CardTitle className="text-base">Tasks</CardTitle>
              <CardDescription>
                Daily and challenge tasks are not live yet
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Alert>
                <AlertCircle />
                <AlertTitle>Coming soon</AlertTitle>
                <AlertDescription>
                  Task rewards will appear here in a future update. Referral
                  commission on purchases is already live.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          </HubPanelCard>
        </div>
      ) : null}

      {tab === "network" ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Your network</h2>
            <p className="text-xs text-muted-foreground">
              People who signed up with your code
            </p>
          </div>
          {data.network.length === 0 ? (
            <HubEmptyPanel>
              <EmptyState
                className="border-0 bg-transparent ring-0"
                icon={<Users className="size-6" />}
                title="No invites yet"
                description="Share your link to grow your network."
              />
            </HubEmptyPanel>
          ) : (
            <HubListStack>
              {data.network.map((item) => (
                <HubListRow key={item.id} stripe={false}>
                  <div className={hubListRowStyles.innerRow}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                      {item.username.charAt(0).toUpperCase()}
                    </span>
                    <div className={hubListRowStyles.body}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={hubListRowStyles.title}>@{item.username}</p>
                        <Badge variant="outline" className="h-5 text-[10px]">
                          {item.role}
                        </Badge>
                      </div>
                      <p className={hubListRowStyles.meta}>
                        Joined {formatWhen(item.createdAt)} · {item.orderCount}{" "}
                        order{item.orderCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className={hubListRowStyles.value}>
                      {formatMoney(item.totalSpend)}
                    </span>
                  </div>
                </HubListRow>
              ))}
            </HubListStack>
          )}
        </section>
      ) : null}

      {tab === "rewards" ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Reward history</h2>
            <p className="text-xs text-muted-foreground">
              Wallet credits from referred purchases
            </p>
          </div>
          {data.rewards.length === 0 ? (
            <HubEmptyPanel>
              <EmptyState
                className="border-0 bg-transparent ring-0"
                icon={<Gift className="size-6" />}
                title="No rewards yet"
                description="They appear when invited users buy keys."
              />
            </HubEmptyPanel>
          ) : (
            <HubListStack>
              {data.rewards.map((item) => (
                <HubListRow key={item.id} stripe={false}>
                  <div className={hubListRowStyles.innerRow}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                      <Gift className="size-4" />
                    </span>
                    <div className={hubListRowStyles.body}>
                      <p className={hubListRowStyles.title}>
                        {formatReferralRewardNote(item.note)}
                      </p>
                      <p className={hubListRowStyles.meta}>
                        {formatWhen(item.createdAt)}
                        {item.reference
                          ? ` · Order ${item.reference.slice(-8)}`
                          : ""}
                      </p>
                    </div>
                    <span className={hubListRowStyles.value}>
                      +{formatMoney(item.amount)}
                    </span>
                  </div>
                </HubListRow>
              ))}
            </HubListStack>
          )}
        </section>
      ) : null}
    </HubPageShell>
  );
}
