"use client";

import {
  HubEmptyPanel,
  HubListRow,
  HubListStack,
  hubListRowStyles,
} from "@/components/app/hub/hub-list-row";
import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import {
  HubSearch,
  HubToolbar,
} from "@/components/app/hub/hub-toolbar";
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
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  type ActivityFilter,
  type ActivityItem,
  type ActivityKind,
} from "@/types/history";
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  LoaderCircle,
  Package,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type HistoryViewProps = {
  initialItems: ActivityItem[];
  initialHasMore: boolean;
  pageSize?: number;
};

const FILTERS: { value: ActivityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "order", label: "Orders" },
  { value: "deposit", label: "Deposits" },
  { value: "wallet", label: "Wallet" },
];

const WHEN_OPTS = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
} as const;

/** No-op subscribe — timezone is fixed for the session. */
const subscribeNoop = () => () => {};

function kindIcon(kind: ActivityKind) {
  if (kind === "order") return Package;
  if (kind === "deposit") return ArrowDownLeft;
  return Wallet;
}

function kindLabel(kind: ActivityKind) {
  if (kind === "order") return "Order";
  if (kind === "deposit") return "Deposit";
  return "Wallet";
}

function formatWhen(iso: string, timeZone?: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    ...WHEN_OPTS,
    ...(timeZone ? { timeZone } : {}),
  });
}

/** Local timezone after hydrate; UTC snapshot matches SSR. */
function When({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const label = useSyncExternalStore(
    subscribeNoop,
    () => formatWhen(iso),
    () => formatWhen(iso, "UTC"),
  );
  return <span className={className}>{label}</span>;
}

function formatStatusLabel(raw: string) {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function statusBadgeVariant(
  kind: ActivityKind,
  status: string,
): "secondary" | "outline" | "destructive" {
  const s = status.toUpperCase();
  if (
    s === "FAILED" ||
    s === "REJECTED" ||
    s === "CANCELLED" ||
    s === "REFUNDED"
  ) {
    return "destructive";
  }
  if (kind === "deposit" && s === "PENDING") return "outline";
  if (kind === "order" && s === "PENDING") return "outline";
  return "secondary";
}

function amountClass(amount: number | null) {
  if (amount == null || amount === 0) return "text-muted-foreground";
  return amount > 0 ? "text-success" : "text-foreground";
}

export function HistoryView({
  initialItems,
  initialHasMore,
  pageSize = 20,
}: HistoryViewProps) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const bootstrapped = useRef(false);

  const fetchPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: String(pageSize),
          filter,
        });
        if (deferredQuery) params.set("q", deferredQuery);
        const res = await fetch(`/api/history?${params}`);
        const body = (await res.json()) as {
          data?: {
            items: ActivityItem[];
            page: number;
            hasMore: boolean;
          };
          error?: { message?: string };
        };
        if (!res.ok || !body.data) {
          throw new Error(body.error?.message ?? "Could not load history");
        }
        setItems((prev) => {
          if (replace) return body.data!.items;
          const seen = new Set(prev.map((i) => i.id));
          return [
            ...prev,
            ...body.data!.items.filter((i) => !seen.has(i.id)),
          ];
        });
        setPage(body.data.page);
        setHasMore(body.data.hasMore);
      } catch {
        // Keep current list
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [deferredQuery, filter, pageSize],
  );

  // Reset to page 1 when filter / search changes (skip first mount — SSR data).
  useEffect(() => {
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      return;
    }
    void fetchPage(1, true);
  }, [filter, deferredQuery, fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    void fetchPage(page + 1, false);
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, items.length]);

  return (
    <HubPageShell>
      <HubHeaderBar
        icon={<History />}
        title="History"
        description="Orders, deposits, and wallet activity"
        stats={[
          { label: "Items", value: String(items.length) },
          {
            label: "Filter",
            value: FILTERS.find((f) => f.value === filter)?.label ?? "All",
            tone: "accent",
          },
        ]}
        statsLabel="Activity summary"
      />

      <HubToolbar>
        <FilterChipRow role="tablist" aria-label="Activity filters">
          {FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </FilterChip>
          ))}
        </FilterChipRow>
        <HubSearch
          value={query}
          onChange={setQuery}
          placeholder="Search activity…"
        />
      </HubToolbar>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <HubEmptyPanel>
          <EmptyState
            className="border-0 bg-transparent ring-0"
            icon={<History className="size-6" />}
            title="No activity yet"
            description={
              deferredQuery
                ? "Nothing matches your search."
                : "Purchases, deposits, and wallet changes will show up here."
            }
          />
        </HubEmptyPanel>
      ) : (
        <HubListStack>
          {items.map((item) => {
            const Icon = kindIcon(item.kind);
            const credit = (item.amount ?? 0) > 0;
            return (
              <HubListRow
                key={item.id}
                interactive
                stripe={false}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(item);
                  }
                }}
              >
                <div className={hubListRowStyles.innerRow}>
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      item.kind === "deposit"
                        ? "bg-success/15 text-success"
                        : item.kind === "order"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className={hubListRowStyles.body}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className={hubListRowStyles.title}>{item.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {kindLabel(item.kind)}
                      </Badge>
                      <Badge
                        variant={statusBadgeVariant(item.kind, item.status)}
                        className="text-[10px]"
                      >
                        {formatStatusLabel(item.status)}
                      </Badge>
                    </div>
                    <p className={hubListRowStyles.meta}>{item.subtitle}</p>
                    <When
                      iso={item.createdAt}
                      className="mt-0.5 block text-[11px] text-muted-foreground"
                    />
                  </div>
                  {item.amount != null ? (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold tabular-nums",
                        amountClass(item.amount),
                      )}
                    >
                      {credit ? (
                        <ArrowDownLeft className="size-3.5" aria-hidden />
                      ) : (
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      )}
                      {formatMoney(Math.abs(item.amount))}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </HubListRow>
            );
          })}
        </HubListStack>
      )}

      {loadingMore ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : null}

      {hasMore && !loading ? (
        <div ref={sentinelRef} className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? (
              <LoaderCircle
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            Load more
          </Button>
        </div>
      ) : null}

      <Dialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[min(92dvh,40rem)] gap-0 overflow-hidden p-0 sm:max-w-md">
          {selected ? (
            <>
              <DialogHeader className="border-b border-border bg-muted/40 px-4 py-4 pr-12 text-left">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      selected.kind === "deposit"
                        ? "bg-success/15 text-success"
                        : selected.kind === "order"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-foreground",
                    )}
                  >
                    {(() => {
                      const Icon = kindIcon(selected.kind);
                      return <Icon className="size-5" aria-hidden />;
                    })()}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <DialogTitle>{selected.title}</DialogTitle>
                    <DialogDescription>{selected.subtitle}</DialogDescription>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="outline">
                        {kindLabel(selected.kind)}
                      </Badge>
                      <Badge
                        variant={statusBadgeVariant(
                          selected.kind,
                          selected.status,
                        )}
                      >
                        {formatStatusLabel(selected.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[min(60dvh,28rem)]">
                <div className="space-y-3 px-4 py-4">
                  {selected.amount != null ? (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3">
                      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Amount
                      </span>
                      <span
                        className={cn(
                          "text-base font-semibold tabular-nums",
                          amountClass(selected.amount),
                        )}
                      >
                        {selected.amount > 0
                          ? "+"
                          : selected.amount < 0
                            ? "−"
                            : ""}
                        {formatMoney(Math.abs(selected.amount))}
                      </span>
                    </div>
                  ) : null}

                  {selected.details.some((d) => d.label.toLowerCase().includes("rejection reason")) ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 space-y-1 text-left">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                        <ShieldAlert className="size-3.5" />
                        <span>Rejection Reason</span>
                      </div>
                      <p className="text-xs text-foreground font-medium leading-relaxed whitespace-pre-line break-words">
                        {selected.details.find((d) => d.label.toLowerCase().includes("rejection reason"))?.value}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-border">
                    {selected.details.map((row, i) => (
                      <div key={`${row.label}-${i}`}>
                        {i > 0 ? <Separator /> : null}
                        <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                          <span className="text-xs text-muted-foreground">
                            {row.label}
                          </span>
                          <span className="max-w-[60%] text-right text-xs font-medium break-all">
                            {row.value}
                          </span>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">When</span>
                      <When
                        iso={selected.createdAt}
                        className="text-right text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="mx-0 mb-0 rounded-none sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </HubPageShell>
  );
}
