"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { adminMutate } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/currencies";
import { depositMethodLabel } from "@/lib/deposit-labels";
import { isManualProofDeposit } from "@/types/manual-deposit";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChevronRight, LoaderCircle, ShieldAlert, Wallet } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type Deposit = {
  id: string;
  amount: number;
  currency: "USD";
  payCurrency?: string;
  payableAmount?: number;
  method?: string;
  manualMethodKey?: string | null;
  manualMethodName?: string | null;
  status: string;
  proofImage: string | null;
  proofUploadedAt?: string | null;
  secretCode?: string | null;
  providerDepositId?: string | null;
  paymentUrl?: string | null;
  instructions?: string | null;
  qrImage?: string | null;
  adminAction?: string | null;
  adminNote?: string | null;
  failReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
    username: string;
    banned?: boolean;
  };
};

const REJECT_REASON_PRESETS = [
  "Invalid payment screenshot",
  "Transaction ID / UTR mismatch",
  "Payment not received in bank/wallet",
  "Amount paid does not match ticket",
  "Duplicate / reused receipt",
  "Screenshot is blurry or unreadable",
] as const;

type StatusFilter = "open" | "PENDING" | "PROCESSING" | "all";

const PAGE_SIZE = 15;

function canRecheck(method?: string) {
  return (
    method === "BINANCE" ||
    method === "QRIS" ||
    method === "UPI" ||
    method === "MGCLOUDPAY"
  );
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toUpperCase();
  if (s === "FAILED" || s === "EXPIRED" || s === "CANCELLED" || s === "REJECTED") {
    return "destructive";
  }
  if (s === "PENDING" || s === "PROCESSING") return "outline";
  if (s === "COMPLETED") return "secondary";
  return "secondary";
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function methodLabel(d: Deposit) {
  return depositMethodLabel(d.method, d.manualMethodName);
}

export function DepositsWorkspace() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Deposit | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Deposit | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pending, setPending] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchGen = useRef(0);
  const loadingMoreLock = useRef(false);

  const fetchPage = useCallback(
    async (pageNum: number, mode: "replace" | "append") => {
      const gen = ++fetchGen.current;
      if (mode === "replace") {
        setLoading(true);
        loadingMoreLock.current = false;
      } else {
        if (loadingMoreLock.current) return;
        loadingMoreLock.current = true;
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (statusFilter === "all") params.set("status", "all");
        else if (statusFilter === "open") params.set("status", "open");
        else params.set("status", statusFilter);

        const res = await fetch(`/api/admin/deposits?${params}`, {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: {
            deposits: Deposit[];
            total: number;
            hasMore: boolean;
            page: number;
          };
          error?: { message: string };
        };

        if (gen !== fetchGen.current) return;

        if (!res.ok || !json.data) {
          toast.error(json.error?.message ?? "Failed to load deposits");
          return;
        }

        const data = json.data;
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(data.page);
        setDeposits((prev) =>
          mode === "replace" ? data.deposits : [...prev, ...data.deposits],
        );
      } catch {
        if (gen === fetchGen.current) toast.error("Network error");
      } finally {
        if (gen === fetchGen.current) {
          setLoading(false);
          setLoadingMore(false);
          loadingMoreLock.current = false;
        }
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    setDeposits([]);
    setPage(1);
    setTotal(0);
    setHasMore(false);
    void fetchPage(1, "replace");
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    void fetchPage(page + 1, "append");
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, deposits.length]);

  async function act(id: string, action: "approve" | "reject", note?: string) {
    setPending(true);
    try {
      const result = await adminMutate(`/api/admin/deposits/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, note }),
      });
      if (!result.ok) toast.error(result.message);
      else {
        toast.success(action === "approve" ? "Approved" : "Deposit rejected");
        setRejectTarget(null);
        setSelected(null);
        void fetchPage(1, "replace");
      }
    } finally {
      setPending(false);
    }
  }

  function promptReject(deposit: Deposit) {
    setRejectTarget(deposit);
    setRejectReason(REJECT_REASON_PRESETS[0]);
  }

  async function recheck(id: string) {
    setPending(true);
    try {
      const result = await adminMutate(`/api/admin/deposits/${id}/recheck`, {
        method: "POST",
        body: "{}",
      });
      if (!result.ok) toast.error(result.message);
      else {
        const data = result.data as { result?: { completed?: boolean; reason?: string } } | undefined;
        const outcome = data?.result;
        if (outcome?.completed) toast.success("Payment verified and credited");
        else if (outcome?.reason === "needs_review")
          toast.error("Provider still returns a timestamp error — try again shortly");
        else if (outcome?.reason)
          toast.message(`Not credited yet: ${outcome.reason}`);
        else toast.success("Recheck finished");
        setSelected(null);
        void fetchPage(1, "replace");
      }
    } finally {
      setPending(false);
    }
  }

  const showRecheck =
    selected &&
    canRecheck(selected.method) &&
    (selected.status === "PENDING" ||
      selected.status === "PROCESSING" ||
      selected.status === "EXPIRED");
  const showApproveReject =
    selected &&
    (selected.status === "PENDING" || selected.status === "PROCESSING");
  const manualNeedsProof =
    selected &&
    isManualProofDeposit(selected.method ?? "") &&
    !selected.proofImage;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5">
      <AdminPageHeader
        title="Deposits"
        description="Manual proof queue · auto rails recheck"
      />

      <FilterChipRow role="tablist" aria-label="Deposit filters">
        {(
          [
            { value: "open" as const, label: "Pending queue" },
            { value: "PROCESSING" as const, label: "Processing" },
            { value: "all" as const, label: "All" },
          ] as const
        ).map((f) => (
          <FilterChip
            key={f.value}
            active={statusFilter === f.value}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </FilterChip>
        ))}
      </FilterChipRow>

      {loading && deposits.length === 0 ? (
        <AdminListSkeleton rows={6} />
      ) : !deposits.length ? (
        <AdminEmptyState message="No deposits match this filter." />
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {deposits.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setSelected(d)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 sm:px-4"
                >
                  {d.proofImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.proofImage}
                      alt=""
                      className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Wallet className="size-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(d.amount)}
                        {` · ${methodLabel(d)}`}
                      </p>
                      <Badge
                        variant={statusVariant(d.status)}
                        className="text-[10px]"
                      >
                        {d.status}
                      </Badge>
                      {d.user.banned ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Banned
                        </Badge>
                      ) : null}
                      {d.proofImage &&
                      isManualProofDeposit(d.method ?? "") &&
                      (d.status === "PENDING" || d.status === "PROCESSING") ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 text-[10px] text-primary"
                        >
                          Awaiting review
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.user.name} · @{d.user.username} · {d.user.email}
                    </p>
                    {typeof d.payableAmount === "number" ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        Pay {d.payableAmount} {d.payCurrency || ""}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col items-stretch gap-2 pt-1">
            <p className="text-center text-xs text-muted-foreground sm:text-left">
              Showing {deposits.length} of {total} deposit
              {total === 1 ? "" : "s"}
            </p>
            {loadingMore ? (
              <div className="space-y-2" aria-busy="true">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
                <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Loading more…
                </p>
              </div>
            ) : null}
            {hasMore ? (
              <div ref={sentinelRef} className="flex justify-center py-1">
                {!loadingMore ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={loadMore}
                  >
                    Load more
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !pending) setSelected(null);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {selected ? (
            <>
              <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
                <DialogHeader className="gap-3 pr-8 text-left">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Wallet className="size-5" />
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <DialogTitle className="text-lg leading-snug tabular-nums">
                        {formatMoney(selected.amount)}
                        {` · ${methodLabel(selected)}`}
                      </DialogTitle>
                      <DialogDescription className="line-clamp-2">
                        {selected.user.name} · @{selected.user.username}
                      </DialogDescription>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant={statusVariant(selected.status)}
                          className="w-fit"
                        >
                          {selected.status}
                        </Badge>
                        {selected.user.banned ? (
                          <Badge variant="destructive" className="w-fit">
                            User banned
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                {selected.proofImage ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Payment screenshot
                    </p>
                    <a
                      href={selected.proofImage}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl ring-1 ring-foreground/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selected.proofImage}
                        alt="Payment proof"
                        className="mx-auto max-h-[min(40dvh,320px)] w-full object-contain bg-muted/30"
                      />
                    </a>
                    <p className="text-center text-[11px] text-muted-foreground">
                      Tap image to open full size
                    </p>
                  </div>
                ) : manualNeedsProof ? (
                  <p className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    No payment proof attached — cannot approve yet.
                  </p>
                ) : null}

                {selected.user.banned ? (
                  <p className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    Account is banned — wallet credit is blocked. Unban the
                    user first, or reject this deposit.
                  </p>
                ) : null}

                {selected.adminAction === "REVIEW_TIMESTAMP" ? (
                  <div className="space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-500">
                      <ShieldAlert className="size-3.5" />
                      <span>Needs review</span>
                    </div>
                    <p className="break-words text-xs leading-relaxed text-foreground">
                      {selected.adminNote}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Auto-credit is paused. Tap Recheck to look up the payment
                      (last 24h) and credit it.
                    </p>
                  </div>
                ) : selected.adminAction === "rejected" ||
                selected.adminNote ||
                selected.failReason ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                      <ShieldAlert className="size-3.5" />
                      <span>Rejection Reason</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-line break-words">
                      {selected.adminNote || selected.failReason || "Rejected by admin"}
                    </p>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                  <DetailRow label="Email" value={selected.user.email} />
                  <Separator className="opacity-40" />
                  <DetailRow label="When" value={formatWhen(selected.createdAt)} />
                  <Separator className="opacity-40" />
                  <DetailRow label="Currency" value={selected.currency} />
                  {typeof selected.payableAmount === "number" ? (
                    <>
                      <Separator className="opacity-40" />
                      <DetailRow
                        label="Pay amount"
                        value={`${selected.payableAmount} ${selected.payCurrency || ""}`.trim()}
                      />
                    </>
                  ) : null}
                  {selected.secretCode ? (
                    <>
                      <Separator className="opacity-40" />
                      <DetailRow label="Memo" value={selected.secretCode} />
                    </>
                  ) : null}
                  {selected.providerDepositId &&
                  selected.method !== "MANUAL" ? (
                    <>
                      <Separator className="opacity-40" />
                      <DetailRow
                        label="Provider ID"
                        value={selected.providerDepositId}
                      />
                    </>
                  ) : null}
                  {selected.reviewedAt ? (
                    <>
                      <Separator className="opacity-40" />
                      <DetailRow
                        label="Reviewed"
                        value={formatWhen(selected.reviewedAt)}
                      />
                    </>
                  ) : null}
                  {selected.instructions ? (
                    <>
                      <Separator className="opacity-40" />
                      <DetailRow
                        label="Instructions"
                        value={selected.instructions}
                      />
                    </>
                  ) : null}
                </div>
              </div>

              <DialogFooter
                className={cn(
                  "mx-0 mb-0 shrink-0 flex-col gap-2 border-t border-border/40 bg-muted/20 px-4 py-3.5 sm:flex-row sm:px-5",
                  showRecheck || showApproveReject
                    ? "sm:justify-between"
                    : "sm:justify-end",
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={pending}
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                  {showRecheck ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="flex-1 sm:flex-none"
                      disabled={pending || Boolean(selected.user.banned)}
                      onClick={() => void recheck(selected.id)}
                    >
                      Recheck
                    </Button>
                  ) : null}
                  {showApproveReject ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 sm:flex-none"
                        disabled={
                          pending ||
                          Boolean(manualNeedsProof) ||
                          Boolean(selected.user.banned)
                        }
                        onClick={() => void act(selected.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="flex-1 sm:flex-none"
                        disabled={pending}
                        onClick={() => promptReject(selected)}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reject Deposit Reason Dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open && !pending) setRejectTarget(null);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {rejectTarget ? (
            <>
              <div className="shrink-0 border-b border-border/40 bg-destructive/10 px-4 pt-4 pb-3.5 sm:px-5">
                <DialogHeader className="gap-3 pr-8 text-left">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                      <ShieldAlert className="size-5" />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <DialogTitle className="text-lg leading-snug">
                        Reject Deposit
                      </DialogTitle>
                      <DialogDescription className="line-clamp-2">
                        {formatMoney(rejectTarget.amount)} · @{rejectTarget.user.username}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick reason presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {REJECT_REASON_PRESETS.map((preset) => {
                      const active = rejectReason === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={pending}
                          onClick={() => setRejectReason(preset)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors text-left",
                            active
                              ? "border-destructive bg-destructive/15 text-destructive font-semibold"
                              : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-reject-reason"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Rejection Reason (Visible to Customer)
                  </label>
                  <Textarea
                    id="admin-reject-reason"
                    rows={3}
                    maxLength={500}
                    placeholder="Enter rejection reason..."
                    value={rejectReason}
                    disabled={pending}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="min-h-[80px] text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This reason will be clearly displayed to the customer on their ticket, history page, and notifications.
                  </p>
                </div>
              </div>

              <DialogFooter className="mx-0 mb-0 shrink-0 flex-col-reverse gap-2 border-t border-border/40 bg-muted/20 px-4 py-3.5 sm:flex-row sm:justify-end sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setRejectTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending || !rejectReason.trim()}
                  onClick={() => void act(rejectTarget.id, "reject", rejectReason.trim())}
                >
                  {pending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Rejecting…
                    </>
                  ) : (
                    "Confirm Rejection"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "max-w-[70%] text-right text-xs font-medium break-words",
          value.includes("\n") && "whitespace-pre-line text-left",
        )}
      >
        {value}
      </span>
    </div>
  );
}
