"use client";

import { AdminEmptyState, AdminListSkeleton } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { formatWhen } from "@/types/admin-stats";
import type {
  SpecialPriceHistoryPage,
  SpecialPriceHistoryRow,
} from "@/types/special-price-history";
import {
  History,
  LoaderCircle,
  Minus,
  Search,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type ActionFilter = "all" | "SET" | "UPDATE" | "CLEAR";

const PAGE_SIZE = 20;

const ACTION_FILTERS: { value: ActionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "SET", label: "Set" },
  { value: "UPDATE", label: "Updated" },
  { value: "CLEAR", label: "Cleared" },
];

function actionBadge(action: string) {
  if (action === "SET") return { label: "Set", tone: "bg-success/15 text-success" };
  if (action === "UPDATE")
    return { label: "Updated", tone: "bg-primary/15 text-primary" };
  if (action === "CLEAR")
    return { label: "Cleared", tone: "bg-destructive/15 text-destructive" };
  return { label: action, tone: "bg-muted text-muted-foreground" };
}

function priceChangeLine(row: SpecialPriceHistoryRow) {
  const from =
    row.previousPrice != null ? formatMoney(row.previousPrice) : null;
  const to = row.newPrice != null ? formatMoney(row.newPrice) : null;
  if (row.action === "CLEAR") {
    return from ? `${from} → cleared` : "Cleared";
  }
  if (row.action === "SET") {
    return to ? `Set to ${to}` : "Set";
  }
  if (from && to) return `${from} → ${to}`;
  if (to) return to;
  return "—";
}

export function SpecialPriceHistoryDialog({
  open,
  onOpenChange,
  userId,
  username,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, default filter to this user (can switch to All). */
  userId?: string | null;
  username?: string | null;
}) {
  const [scopeUserOnly, setScopeUserOnly] = useState(Boolean(userId));
  const [action, setAction] = useState<ActionFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const [items, setItems] = useState<SpecialPriceHistoryRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchGen = useRef(0);

  useEffect(() => {
    if (open) {
      setScopeUserOnly(Boolean(userId));
      setAction("all");
      setQuery("");
    }
  }, [open, userId]);

  const activeUserId = scopeUserOnly && userId ? userId : null;

  const buildUrl = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(PAGE_SIZE),
      });
      if (activeUserId) params.set("userId", activeUserId);
      if (action !== "all") params.set("action", action);
      if (deferredQuery) params.set("q", deferredQuery);
      return `/api/admin/special-prices/history?${params.toString()}`;
    },
    [action, activeUserId, deferredQuery],
  );

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const gen = ++fetchGen.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await fetch(buildUrl(pageNum), { credentials: "include" });
        const json = (await res.json()) as {
          data?: SpecialPriceHistoryPage;
          error?: { message: string };
        };
        if (gen !== fetchGen.current) return;
        if (!res.ok || !json.data) {
          toast.error(json.error?.message ?? "Could not load history");
          return;
        }
        setItems((prev) =>
          append ? [...prev, ...json.data!.items] : json.data!.items,
        );
        setPage(json.data.page);
        setTotal(json.data.total);
        setHasMore(json.data.hasMore);
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
    if (!open) return;
    setItems([]);
    setPage(1);
    void fetchPage(1, false);
  }, [open, fetchPage]);

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<History className="size-5" />}
      title="Special price history"
      description={
        activeUserId && username
          ? `Changes for @${username} — who got what price.`
          : "Audit of every special price set, updated, or cleared."
      }
      size="xl"
      className="sm:max-w-2xl"
      maxHeightClass="max-h-[min(92dvh,720px)]"
      footer={
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      <div className="space-y-3">
        {userId ? (
          <FilterChipRow>
            <FilterChip
              active={scopeUserOnly}
              onClick={() => setScopeUserOnly(true)}
            >
              @{username ?? "user"}
            </FilterChip>
            <FilterChip
              active={!scopeUserOnly}
              onClick={() => setScopeUserOnly(false)}
            >
              All users
            </FilterChip>
          </FilterChipRow>
        ) : null}

        <FilterChipRow>
          {ACTION_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={action === f.value}
              onClick={() => setAction(f.value)}
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
            placeholder="Search user, product, admin…"
            className="h-9 pl-9"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {total} event{total === 1 ? "" : "s"}
        </p>

        {loading && items.length === 0 ? (
          <AdminListSkeleton rows={5} />
        ) : items.length === 0 ? (
          <AdminEmptyState message="No special price history yet." />
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border/50 divide-y divide-border/40">
            {items.map((row) => {
              const badge = actionBadge(row.action);
              return (
                <li
                  key={row.id}
                  className="flex items-start gap-3 px-3 py-2.5 text-left"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      badge.tone,
                    )}
                  >
                    {row.action === "CLEAR" ? (
                      <Minus className="size-3.5" />
                    ) : (
                      "$"
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">
                        @{row.username ?? "unknown"}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.productTitle ?? "Product"}
                      {row.durationLabel ? ` · ${row.durationLabel}` : ""}
                    </p>
                    <p className="text-xs font-medium text-success">
                      {priceChangeLine(row)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatWhen(row.createdAt)}
                      {row.adminUsername
                        ? ` · by @${row.adminUsername}`
                        : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore ? (
          <div className="flex justify-center pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => void fetchPage(page + 1, true)}
            >
              {loadingMore ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}
