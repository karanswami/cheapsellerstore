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
import { cn } from "@/lib/utils";
import { formatWhen } from "@/types/admin-stats";
import {
  ACTIVITY_ACTION_LABEL,
  ACTIVITY_CATEGORY_LABEL,
  ACTIVITY_LOG_CATEGORIES,
  type ActivityLogCategory,
  type ActivityLogRow,
  type ActivityLogsPage,
} from "@/types/activity-log";
import {
  KeyRound,
  LoaderCircle,
  LogIn,
  Package,
  ScrollText,
  Search,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type Filter = ActivityLogCategory | "all";

const PAGE_SIZE = 20;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...ACTIVITY_LOG_CATEGORIES.map((c) => ({
    value: c,
    label: ACTIVITY_CATEGORY_LABEL[c],
  })),
];

function categoryIcon(category: string) {
  if (category === "AUTH" || category === "SECURITY") return LogIn;
  if (category === "WALLET") return Wallet;
  if (category === "ORDER") return Package;
  if (category === "ACCOUNT") return User;
  if (category === "ADMIN") return Shield;
  if (category === "API") return KeyRound;
  return ScrollText;
}

function categoryTone(category: string) {
  if (category === "AUTH") return "bg-primary/10 text-primary";
  if (category === "SECURITY") return "bg-destructive/15 text-destructive";
  if (category === "WALLET") return "bg-success/15 text-success";
  if (category === "ORDER") return "bg-primary/10 text-primary";
  if (category === "ADMIN") return "bg-muted text-foreground";
  return "bg-muted text-muted-foreground";
}

function actionLabel(action: string) {
  return (
    ACTIVITY_ACTION_LABEL[action as keyof typeof ACTIVITY_ACTION_LABEL] ??
    action
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function categoryLabel(category: string) {
  return (
    ACTIVITY_CATEGORY_LABEL[category as ActivityLogCategory] ?? category
  );
}

function whoLine(row: ActivityLogRow) {
  if (row.username) return `@${row.username}`;
  if (row.email) return row.email;
  if (row.userId) return row.userId.slice(0, 10) + "…";
  return "Unknown";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 bg-card px-3.5 py-2.5">
      <span className="shrink-0 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm break-all">{value}</span>
    </div>
  );
}

export function LogsWorkspace() {
  const [category, setCategory] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [selected, setSelected] = useState<ActivityLogRow | null>(null);

  const [items, setItems] = useState<ActivityLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [retentionDays, setRetentionDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchGen = useRef(0);

  const buildUrl = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(PAGE_SIZE),
      });
      if (category !== "all") params.set("category", category);
      if (deferredQuery) params.set("q", deferredQuery);
      return `/api/admin/logs?${params.toString()}`;
    },
    [category, deferredQuery],
  );

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const gen = ++fetchGen.current;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const res = await fetch(buildUrl(pageNum), { credentials: "include" });
        const json = (await res.json()) as {
          data?: ActivityLogsPage;
          error?: { message: string };
        };
        if (gen !== fetchGen.current) return;
        if (!res.ok) {
          toast.error(json.error?.message ?? "Failed to load logs");
          return;
        }
        const data = json.data;
        if (!data) return;
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setPage(data.page);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setRetentionDays(data.retentionDays);
      } catch {
        if (gen === fetchGen.current) toast.error("Network error");
      } finally {
        if (gen === fetchGen.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildUrl],
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(false);
    void fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    void fetchPage(page + 1, true);
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, items.length]);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5">
      <AdminPageHeader
        title="Logs"
        description={`All user activity · auto-deletes after ${retentionDays} days`}
      />

      <div className="space-y-3">
        <FilterChipRow>
          {FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={category === f.value}
              onClick={() => setCategory(f.value)}
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
            placeholder="Search user, email, IP, action…"
            className="h-10 pl-9"
            aria-label="Search logs"
          />
        </div>
      </div>

      {loading && items.length === 0 ? (
        <AdminListSkeleton rows={8} />
      ) : !items.length ? (
        <AdminEmptyState message="No activity logs in the last 7 days." />
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {items.map((row) => {
              const Icon = categoryIcon(row.category);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                        categoryTone(row.category),
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-medium">
                          {row.message}
                        </p>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px]"
                        >
                          {categoryLabel(row.category)}
                        </Badge>
                        {!row.success ? (
                          <Badge
                            variant="destructive"
                            className="shrink-0 text-[10px]"
                          >
                            Failed
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {whoLine(row)}
                        {row.role ? ` · ${row.role}` : ""}
                        {row.ip ? ` · ${row.ip}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatWhen(row.createdAt)} · {actionLabel(row.action)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col items-stretch gap-2 pt-1">
            <p className="text-center text-xs text-muted-foreground sm:text-left">
              Showing {items.length} of {total} log
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
                You’re all caught up · older than {retentionDays}d auto-deleted
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
                        categoryTone(selected.category),
                      )}
                    >
                      {(() => {
                        const Icon = categoryIcon(selected.category);
                        return <Icon className="size-5" />;
                      })()}
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <DialogTitle className="text-lg leading-snug">
                        {actionLabel(selected.action)}
                      </DialogTitle>
                      <DialogDescription className="line-clamp-3">
                        {selected.message}
                      </DialogDescription>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <Badge variant="outline">
                          {categoryLabel(selected.category)}
                        </Badge>
                        {!selected.success ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                  <DetailRow
                    label="When"
                    value={formatWhen(selected.createdAt)}
                  />
                  <Separator />
                  <DetailRow label="Who" value={whoLine(selected)} />
                  {selected.email ? (
                    <>
                      <Separator />
                      <DetailRow label="Email" value={selected.email} />
                    </>
                  ) : null}
                  {selected.role ? (
                    <>
                      <Separator />
                      <DetailRow label="Role" value={selected.role} />
                    </>
                  ) : null}
                  {selected.userId ? (
                    <>
                      <Separator />
                      <DetailRow label="User ID" value={selected.userId} />
                    </>
                  ) : null}
                  {selected.ip ? (
                    <>
                      <Separator />
                      <DetailRow label="IP" value={selected.ip} />
                    </>
                  ) : null}
                  {selected.userAgent ? (
                    <>
                      <Separator />
                      <DetailRow label="Device" value={selected.userAgent} />
                    </>
                  ) : null}
                </div>

                {selected.metadata &&
                Object.keys(selected.metadata).length > 0 ? (
                  <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                    {Object.entries(selected.metadata).map(([key, value], i) => (
                      <div key={key}>
                        {i > 0 ? <Separator /> : null}
                        <DetailRow
                          label={key}
                          value={
                            typeof value === "string"
                              ? value
                              : JSON.stringify(value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <DialogFooter className="mx-0 mb-0 shrink-0 border-t border-border/40 bg-muted/20 px-4 py-3 sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setSelected(null)}
                >
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
