"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/currencies";
import type {
  AdminOrderAudience,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderStatusFilter,
} from "@/types/admin-orders";
import { roleBadge } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  LoaderCircle,
  Package,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const PAGE_SIZE = 15;

const AUDIENCE_FILTERS: { value: AdminOrderAudience; label: string }[] = [
  { value: "all", label: "All buyers" },
  { value: "users", label: "Users" },
  { value: "resellers", label: "Sellers & resellers" },
  { value: "admins", label: "Admins" },
  { value: "guests", label: "Guests" },
];

const STATUS_FILTERS: { value: AdminOrderStatusFilter; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

type OrdersPage = {
  orders: AdminOrderListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatusLabel(raw: string) {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function statusTone(status: string) {
  switch (status) {
    case "FULFILLED":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "PAID":
      return "bg-primary/10 text-primary";
    case "PENDING":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "FAILED":
      return "bg-destructive/15 text-destructive";
    case "REFUNDED":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function buyerLabel(order: AdminOrderListItem) {
  if (order.user) return order.user.username;
  return order.buyerEmail.split("@")[0] || "Guest";
}

function buyerSub(order: AdminOrderListItem) {
  if (order.user) return order.user.email;
  return order.buyerEmail;
}

function initials(order: AdminOrderListItem) {
  const source = order.user?.name || order.user?.username || order.buyerEmail;
  return (source[0] ?? "?").toUpperCase();
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Could not copy");
  }
}

export function AdminOrdersWorkspace({
  initialOrderId,
}: {
  initialOrderId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkId = initialOrderId || searchParams.get("id") || undefined;

  const [audience, setAudience] = useState<AdminOrderAudience>("all");
  const [status, setStatus] = useState<AdminOrderStatusFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selected, setSelected] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchGen = useRef(0);
  const loadingMoreLock = useRef(false);
  const openedDeepLink = useRef<string | null>(null);

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
          audience,
          status,
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (deferredQuery) params.set("q", deferredQuery);

        const res = await fetch(`/api/admin/orders?${params}`, {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: OrdersPage;
          error?: { message: string };
        };

        if (gen !== fetchGen.current) return;

        if (!res.ok || !json.data) {
          toast.error(json.error?.message ?? "Failed to load orders");
          return;
        }

        const data = json.data;
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(data.page);
        setOrders((prev) =>
          mode === "replace" ? data.orders : [...prev, ...data.orders],
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
    [audience, status, deferredQuery],
  );

  useEffect(() => {
    setOrders([]);
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
  }, [hasMore, loadMore, orders.length]);

  const openDetail = useCallback(async (orderId: string) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: AdminOrderDetail;
        error?: { message: string };
      };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Failed to load order");
        return;
      }
      setSelected(json.data);
    } catch {
      toast.error("Network error");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!deepLinkId || openedDeepLink.current === deepLinkId) return;
    openedDeepLink.current = deepLinkId;
    void openDetail(deepLinkId);
  }, [deepLinkId, openDetail]);

  function closeDetail() {
    setSelected(null);
    if (searchParams.get("id") || initialOrderId) {
      router.replace("/admin/orders", { scroll: false });
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5">
      <AdminPageHeader
        title="Orders"
        description="Recent purchases by users, resellers, and guests"
      />

      <div className="space-y-3">
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Buyer filters"
        >
          {AUDIENCE_FILTERS.map((f) => (
            <Button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={audience === f.value}
              size="sm"
              variant={audience === f.value ? "default" : "outline"}
              className="h-8 shrink-0"
              onClick={() => setAudience(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Status filters"
        >
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={status === f.value}
              size="sm"
              variant={status === f.value ? "secondary" : "ghost"}
              className="h-8 shrink-0"
              onClick={() => setStatus(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email, username, product, order id…"
            className="h-10 pl-9"
            aria-label="Search orders"
          />
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <AdminListSkeleton rows={8} />
      ) : !orders.length ? (
        <AdminEmptyState message="No orders match this filter." />
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {orders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => void openDetail(order.id)}
                  className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Avatar className="mt-0.5 size-9 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                      {initials(order)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-medium">
                        {buyerLabel(order)}
                      </p>
                      {order.user ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px]"
                        >
                          {roleBadge(order.user.role)}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px]"
                        >
                          Guest
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 text-[10px]",
                          statusTone(order.status),
                        )}
                      >
                        {formatStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {order.productSummary}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {buyerSub(order)} · {formatWhen(order.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 pt-0.5 text-right">
                    <p className="text-sm font-semibold tabular-nums text-success">
                      {formatMoney(order.total)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col items-stretch gap-2 pt-1">
            <p className="text-center text-xs text-muted-foreground sm:text-left">
              Showing {orders.length} of {total} order
              {total === 1 ? "" : "s"}
            </p>

            {loadingMore ? (
              <div className="space-y-2" aria-busy="true" aria-live="polite">
                {Array.from({ length: 3 }).map((_, i) => (
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
            ) : (
              <p className="pb-2 text-center text-[11px] text-muted-foreground">
                You’re all caught up
              </p>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={!!selected || detailLoading}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          {detailLoading && !selected ? (
            <div className="space-y-3 px-4 py-6 sm:px-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingBag className="size-4 text-primary" />
                  Loading order…
                </DialogTitle>
                <DialogDescription>Fetching purchase details.</DialogDescription>
              </DialogHeader>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : selected ? (
            <>
              <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
                <DialogHeader className="gap-3 pr-8 text-left">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Package className="size-5" />
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <DialogTitle className="text-lg leading-snug">
                        {selected.productSummary}
                      </DialogTitle>
                      <DialogDescription className="line-clamp-2">
                        {selected.user
                          ? `${selected.user.name} (@${selected.user.username})`
                          : selected.buyerEmail}
                      </DialogDescription>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {selected.user ? (
                          <Badge variant="outline">
                            {roleBadge(selected.user.role)}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Guest</Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className={statusTone(selected.status)}
                        >
                          {formatStatusLabel(selected.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3">
                  <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Total
                  </span>
                  <span className="text-base font-semibold tabular-nums text-success">
                    {formatMoney(selected.total)}
                  </span>
                </div>

                <div className="rounded-xl border border-border">
                  <DetailRow label="When" value={formatWhen(selected.createdAt)} />
                  <Separator />
                  <DetailRow label="Buyer email" value={selected.buyerEmail} />
                  {selected.user ? (
                    <>
                      <Separator />
                      <DetailRow
                        label="Account"
                        value={`@${selected.user.username}`}
                      />
                    </>
                  ) : null}
                  {selected.buyerDiscord ? (
                    <>
                      <Separator />
                      <DetailRow
                        label="Discord"
                        value={selected.buyerDiscord}
                      />
                    </>
                  ) : null}
                  {selected.promoCode ? (
                    <>
                      <Separator />
                      <DetailRow
                        label="Promo"
                        value={selected.promoCode.code}
                      />
                    </>
                  ) : null}
                  {selected.flashSale ? (
                    <>
                      <Separator />
                      <DetailRow
                        label="Flash sale"
                        value={selected.flashSale.title}
                      />
                    </>
                  ) : null}
                  <Separator />
                  <DetailRow
                    label="Order id"
                    value={selected.id}
                    mono
                    onCopy={() => void copyText(selected.id, "Order id")}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Items ({selected.items.length})
                  </p>
                  <ul className="space-y-2">
                    {selected.items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.productTitle}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.durationLabel}
                            </p>
                            {item.androidId && (
                              <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                                <span className="font-semibold text-foreground/70">Android ID:</span> {item.androidId}
                              </p>
                            )}
                          </div>
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-success">
                            {formatMoney(item.unitPrice)}
                          </p>
                        </div>
                        {item.key ? (
                          <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-2">
                            <code className="min-w-0 flex-1 truncate font-mono text-xs">
                              {item.key.code}
                            </code>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              className="shrink-0"
                              onClick={() =>
                                void copyText(item.key!.code, "Key")
                              }
                              aria-label="Copy key"
                            >
                              <Copy className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">
                            No key assigned
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-3.5 sm:justify-between sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    void copyText(selected.accessToken, "Access token")
                  }
                >
                  <Copy data-icon="inline-start" />
                  Copy token
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={closeDetail}
                >
                  <Check data-icon="inline-start" />
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function DetailRow({
  label,
  value,
  mono,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex max-w-[70%] items-start gap-1.5">
        <span
          className={cn(
            "text-right text-xs font-medium break-all",
            mono && "font-mono",
          )}
        >
          {value}
        </span>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`Copy ${label}`}
          >
            <Copy className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
