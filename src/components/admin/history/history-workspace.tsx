"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  formatWhen,
  HISTORY_KIND_LABEL,
  type AdminHistoryEvent,
  type AdminHistoryKind,
  type HistoryEventsPage,
} from "@/types/admin-stats";
import {
  ArrowDownLeft,
  ExternalLink,
  History,
  KeyRound,
  LoaderCircle,
  MessageSquareText,
  Package,
  Search,
  Store,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type Filter = AdminHistoryKind | "all";

const PAGE_SIZE = 15;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "order", label: "Orders" },
  { value: "deposit", label: "Deposits" },
  { value: "transaction", label: "Wallet" },
  { value: "key", label: "Keys" },
  { value: "review", label: "Reviews" },
  { value: "reseller", label: "Sellers & resellers" },
];

function kindIcon(kind: AdminHistoryKind) {
  if (kind === "order") return Package;
  if (kind === "deposit") return ArrowDownLeft;
  if (kind === "transaction") return Wallet;
  if (kind === "key") return KeyRound;
  if (kind === "review") return MessageSquareText;
  return Store;
}

function kindTone(kind: AdminHistoryKind) {
  if (kind === "deposit") return "bg-success/15 text-success";
  if (kind === "order") return "bg-primary/10 text-primary";
  if (kind === "transaction") return "bg-muted text-foreground";
  return "bg-muted text-muted-foreground";
}

function formatStatusLabel(raw: string) {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function HistoryWorkspace() {
  const [kind, setKind] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [selected, setSelected] = useState<AdminHistoryEvent | null>(null);

  const [events, setEvents] = useState<AdminHistoryEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
          kind,
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (deferredQuery) params.set("q", deferredQuery);

        const res = await fetch(`/api/admin/history?${params}`, {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: HistoryEventsPage;
          error?: { message: string };
        };

        if (gen !== fetchGen.current) return;

        if (!res.ok || !json.data) {
          toast.error(json.error?.message ?? "Failed to load history");
          return;
        }

        const data = json.data;
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(data.page);
        setEvents((prev) =>
          mode === "replace" ? data.events : [...prev, ...data.events],
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
    [kind, deferredQuery],
  );

  useEffect(() => {
    setEvents([]);
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
  }, [hasMore, loadMore, events.length]);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5">
      <AdminPageHeader
        title="History"
        description="Orders, deposits, wallet, keys, reviews, and seller apps"
      />

      <div className="space-y-3">
        <FilterChipRow role="tablist" aria-label="History filters">
          {FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={kind === f.value}
              onClick={() => setKind(f.value)}
            >
              {f.label}
            </FilterChip>
          ))}
        </FilterChipRow>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity…"
            className="h-10 pl-9"
            aria-label="Search activity"
          />
        </div>
      </div>

      {loading && events.length === 0 ? (
        <AdminListSkeleton rows={8} />
      ) : !events.length ? (
        <AdminEmptyState message="No history matches this filter." />
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {events.map((e) => {
              const Icon = kindIcon(e.kind);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(e)}
                    className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                        kindTone(e.kind),
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-medium">{e.title}</p>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px]"
                        >
                          {HISTORY_KIND_LABEL[e.kind]}
                        </Badge>
                        {e.status ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px]"
                          >
                            {formatStatusLabel(e.status)}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.subtitle}
                        {e.meta ? ` · ${e.meta}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatWhen(e.at)}
                      </p>
                    </div>
                    {e.amount != null ? (
                      <p
                        className={cn(
                          "shrink-0 pt-0.5 text-sm font-semibold tabular-nums",
                          e.amount < 0 ? "text-destructive" : "text-success",
                        )}
                      >
                        {formatMoney(e.amount)}
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col items-stretch gap-2 pt-1">
            <p className="text-center text-xs text-muted-foreground sm:text-left">
              Showing {events.length} of {total} event
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
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {selected ? (
            <>
              <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
                <DialogHeader className="gap-3 pr-8 text-left">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        kindTone(selected.kind),
                      )}
                    >
                      {(() => {
                        const Icon = kindIcon(selected.kind);
                        return <Icon className="size-5" />;
                      })()}
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <DialogTitle className="text-lg leading-snug">
                        {selected.title}
                      </DialogTitle>
                      <DialogDescription className="line-clamp-2">
                        {selected.subtitle}
                      </DialogDescription>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <Badge variant="outline">
                          {HISTORY_KIND_LABEL[selected.kind]}
                        </Badge>
                        {selected.status ? (
                          <Badge variant="secondary">
                            {formatStatusLabel(selected.status)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                {selected.amount != null ? (
                  <div className="flex items-center justify-between rounded-xl bg-card px-3.5 py-3 ring-1 ring-foreground/10">
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      Amount
                    </span>
                    <span
                      className={cn(
                        "text-base font-semibold tabular-nums",
                        selected.amount < 0
                          ? "text-destructive"
                          : "text-success",
                      )}
                    >
                      {formatMoney(selected.amount)}
                    </span>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                  <DetailRow label="When" value={formatWhen(selected.at)} />
                  <Separator />
                  <DetailRow label="Who" value={selected.subtitle} />
                  {selected.status ? (
                    <>
                      <Separator />
                      <DetailRow
                        label="Status"
                        value={formatStatusLabel(selected.status)}
                      />
                    </>
                  ) : null}
                  {selected.meta ? (
                    <>
                      <Separator />
                      <DetailRow label="Meta" value={selected.meta} />
                    </>
                  ) : null}
                </div>
              </div>

              <DialogFooter
                className={cn(
                  "mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-3.5 sm:px-5",
                  selected.href ? "sm:justify-between" : "sm:justify-end",
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
                {selected.href ? (
                  <Button type="button" className="w-full sm:w-auto" asChild>
                    <Link href={selected.href}>
                      Open related
                      <ExternalLink data-icon="inline-end" />
                    </Link>
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : (
            <div className="px-4 py-8">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="size-4 text-primary" />
                  Activity detail
                </DialogTitle>
                <DialogDescription>
                  Select an activity row to inspect.
                </DialogDescription>
              </DialogHeader>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[70%] text-right text-xs font-medium break-words">
        {value}
      </span>
    </div>
  );
}
