"use client";

import { HubEmptyPanel, HubPanelCard } from "@/components/app/hub/hub-list-row";
import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CheckCircle2, Gift, Lock, Ticket, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ClaimRow = {
  id: string;
  code: string;
  amount: number;
  claimedAt: string | null;
  note: string | null;
};

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GiftCodesView({
  initialBalance,
}: {
  initialBalance: number;
}) {
  const { user, refresh, pagesEnabled } = useAuth();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastCredit, setLastCredit] = useState<number | null>(null);

  useEffect(() => {
    if (user?.walletBalance != null) setBalance(user.walletBalance);
  }, [user?.walletBalance]);

  const loadClaims = useCallback(async (opts?: { page?: number; append?: boolean }) => {
    const nextPage = opts?.page ?? 1;
    try {
      const res = await fetch(
        `/api/gift-codes?page=${nextPage}&limit=20`,
        { credentials: "include" },
      );
      const json = (await res.json()) as {
        data?: {
          claims: ClaimRow[];
          hasMore: boolean;
          page: number;
        };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to load claims");
        return;
      }
      const data = json.data!;
      setClaims((prev) =>
        opts?.append ? [...prev, ...data.claims] : data.claims,
      );
      setHasMore(data.hasMore);
      setPage(data.page);
    } catch {
      toast.error("Network error");
    } finally {
      setLoadingClaims(false);
    }
  }, []);

  useEffect(() => {
    void loadClaims({ page: 1 });
  }, [loadClaims]);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Enter a gift code");
      return;
    }
    setPending(true);
    setLastCredit(null);
    try {
      const res = await fetch("/api/gift-codes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const json = (await res.json()) as {
        data?: {
          amount: number;
          balance: number;
          code: string;
          message: string;
        };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Could not claim code");
        return;
      }
      const data = json.data!;
      setBalance(data.balance);
      setLastCredit(data.amount);
      setCode("");
      toast.success(data.message);
      void refresh();
      void loadClaims({ page: 1 });
    } catch {
      toast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  if (!pagesEnabled.giftCodes) {
    return (
      <HubPageShell maxWidth="sm">
        <HubHeaderBar
          icon={<Gift className="size-5" />}
          title="Gift codes"
          description="Redeem USD gift codes"
        />
        <HubEmptyPanel>
          <EmptyState
            icon={<Lock />}
            title="Gift codes unavailable"
            description="This store has turned off gift code redeeming."
          />
        </HubEmptyPanel>
      </HubPageShell>
    );
  }

  return (
    <HubPageShell maxWidth="sm">
      <HubHeaderBar
        icon={<Gift className="size-5" />}
        title="Gift codes"
        description="Redeem USD gift codes · credits your Binance USD wallet"
        stats={[
          {
            label: "Balance",
            value: formatMoney(balance),
            tone: "success",
          },
          {
            label: "Claimed",
            value: String(claims.length),
            tone: claims.length > 0 ? "accent" : "default",
          },
        ]}
      />

      <HubPanelCard>
        <form onSubmit={handleClaim} className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Ticket className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Claim a code</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enter the code from admin. Amount credits your wallet in USD.
              </p>
            </div>
          </div>

          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CHEAP-XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 font-mono tracking-wider"
            disabled={pending}
          />

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Claiming…" : "Claim & credit wallet"}
          </Button>

          {lastCredit != null ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border border-success/30",
                "bg-success/10 px-3 py-2.5 text-sm text-success",
              )}
            >
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                Credited{" "}
                <span className="font-semibold">{formatMoney(lastCredit)}</span>
              </span>
            </div>
          ) : null}

          <p className="text-center text-[11px] text-muted-foreground">
            Prefer a payment rail?{" "}
            <Link
              href="/app/deposit"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Open Deposit
            </Link>
          </p>
        </form>
      </HubPanelCard>

      <section className="space-y-2">
        <h2 className="px-0.5 text-sm font-semibold">Your claims</h2>
        {loadingClaims ? (
          <HubEmptyPanel>
            <p className="text-sm text-muted-foreground">Loading…</p>
          </HubEmptyPanel>
        ) : claims.length === 0 ? (
          <HubEmptyPanel>
            <EmptyState
              icon={<Wallet />}
              title="No claims yet"
              description="When you redeem a gift code, it shows up here with the credited amount."
            />
          </HubEmptyPanel>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 divide-y divide-border/50">
            {claims.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-3 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success">
                  <Gift className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-medium tracking-wide">
                    {c.code}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatWhen(c.claimedAt)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-success">
                  +{formatMoney(c.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {hasMore ? (
          <div className="flex justify-center pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void loadClaims({ page: page + 1, append: true })}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </section>
    </HubPageShell>
  );
}
