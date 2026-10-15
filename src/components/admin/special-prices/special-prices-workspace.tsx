"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { SpecialPriceHistoryDialog } from "@/components/admin/special-prices/special-price-history-dialog";
import { adminMutate } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, microcentsToUsd, usdToMicrocents } from "@/lib/currencies";
import { roleBadge } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { formatWhen } from "@/types/admin-stats";
import type { UserRole } from "@prisma/client";
import {
  BadgeDollarSign,
  ChevronRight,
  History,
  LoaderCircle,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

type SearchUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  banned: boolean;
  specialPriceCount: number;
};

type CatalogDuration = {
  id: string;
  label: string;
  days: number | null;
  retailPrice: number | null;
  resellerPrice: number | null;
  specialPrice: number | null;
};

type CatalogProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
  specialCount: number;
  durations: CatalogDuration[];
};

type CatalogData = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  products: CatalogProduct[];
};

type ActiveSpecial = {
  id: string;
  userId: string;
  durationId: string;
  price: number;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: UserRole;
    banned: boolean;
  };
  productId: string;
  productTitle: string;
  productImageUrl: string | null;
  durationLabel: string;
  retailPrice: number | null;
  resellerPrice: number | null;
};

type ActiveSpecialsPage = {
  items: ActiveSpecial[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

const ACTIVE_PAGE_SIZE = 20;

function usdInputFromMicrocents(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return microcentsToUsd(value).toFixed(2);
}

export function SpecialPricesWorkspace() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selected, setSelected] = useState<SearchUser | null>(null);

  const [productQ, setProductQ] = useState("");
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [dialogProduct, setDialogProduct] = useState<CatalogProduct | null>(
    null,
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [activeQ, setActiveQ] = useState("");
  const deferredActiveQ = useDeferredValue(activeQ.trim());
  const [activeItems, setActiveItems] = useState<ActiveSpecial[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [activeTotal, setActiveTotal] = useState(0);
  const [activeHasMore, setActiveHasMore] = useState(false);
  const [activeLoading, setActiveLoading] = useState(true);
  const [activeLoadingMore, setActiveLoadingMore] = useState(false);

  const [editRow, setEditRow] = useState<ActiveSpecial | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const searchUsers = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/admin/special-prices?q=${encodeURIComponent(trimmed)}`,
        { credentials: "include" },
      );
      const json = (await res.json()) as {
        data?: { users: SearchUser[] };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Search failed");
        return;
      }
      setResults(json.data?.users ?? []);
    } catch {
      toast.error("Network error");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void searchUsers(query);
    }, 280);
    return () => clearTimeout(t);
  }, [query, searchUsers]);

  const loadActive = useCallback(
    async (opts?: { page?: number; append?: boolean; q?: string }) => {
      const page = opts?.page ?? 1;
      const append = opts?.append ?? false;
      const q = opts?.q ?? deferredActiveQ;
      if (append) setActiveLoadingMore(true);
      else setActiveLoading(true);
      try {
        const params = new URLSearchParams({
          active: "1",
          page: String(page),
          limit: String(ACTIVE_PAGE_SIZE),
        });
        if (q) params.set("q", q);
        const res = await fetch(`/api/admin/special-prices?${params}`, {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: ActiveSpecialsPage;
          error?: { message: string };
        };
        if (!res.ok || !json.data) {
          toast.error(json.error?.message ?? "Could not load specials");
          return;
        }
        setActiveItems((prev) =>
          append ? [...prev, ...json.data!.items] : json.data!.items,
        );
        setActivePage(json.data.page);
        setActiveTotal(json.data.total);
        setActiveHasMore(json.data.hasMore);
      } catch {
        toast.error("Network error");
      } finally {
        setActiveLoading(false);
        setActiveLoadingMore(false);
      }
    },
    [deferredActiveQ],
  );

  useEffect(() => {
    void loadActive({ page: 1, q: deferredActiveQ });
  }, [deferredActiveQ, loadActive]);

  const loadCatalog = useCallback(
    async (opts?: { page?: number; append?: boolean; q?: string }) => {
      if (!selected) return;
      const page = opts?.page ?? 1;
      const append = opts?.append ?? false;
      const q = opts?.q ?? productQ;
      if (append) setLoadingMore(true);
      else setCatalogLoading(true);
      try {
        const params = new URLSearchParams({
          userId: selected.id,
          page: String(page),
          limit: "20",
        });
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(
          `/api/admin/special-prices/catalog?${params}`,
          { credentials: "include" },
        );
        const json = (await res.json()) as {
          data?: CatalogData;
          error?: { message: string };
        };
        if (!res.ok || !json.data) {
          toast.error(json.error?.message ?? "Could not load products");
          return;
        }
        setCatalog((prev) => {
          if (!append || !prev) return json.data!;
          const seen = new Set(prev.products.map((p) => p.id));
          return {
            ...json.data!,
            products: [
              ...prev.products,
              ...json.data!.products.filter((p) => !seen.has(p.id)),
            ],
          };
        });
      } catch {
        toast.error("Network error");
      } finally {
        setCatalogLoading(false);
        setLoadingMore(false);
      }
    },
    [productQ, selected],
  );

  useEffect(() => {
    if (!selected) {
      setCatalog(null);
      return;
    }
    void loadCatalog({ page: 1, q: productQ });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on user / product search only
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => {
      void loadCatalog({ page: 1, q: productQ });
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productQ]);

  function selectUser(user: SearchUser) {
    setSelected(user);
    setQuery("");
    setResults([]);
    setProductQ("");
    setDialogProduct(null);
  }

  function openProduct(product: CatalogProduct) {
    setDialogProduct(product);
    const next: Record<string, string> = {};
    for (const d of product.durations) {
      next[d.id] = usdInputFromMicrocents(d.specialPrice);
    }
    setDrafts(next);
  }

  function openActiveEdit(row: ActiveSpecial) {
    setEditRow(row);
    setEditDraft(usdInputFromMicrocents(row.price));
  }

  function patchActiveRow(
    durationId: string,
    userId: string,
    nextPrice: number | null,
  ) {
    if (nextPrice == null) {
      setActiveItems((prev) =>
        prev.filter(
          (r) => !(r.durationId === durationId && r.userId === userId),
        ),
      );
      setActiveTotal((t) => Math.max(0, t - 1));
      return;
    }
    setActiveItems((prev) =>
      prev.map((r) =>
        r.durationId === durationId && r.userId === userId
          ? { ...r, price: nextPrice, updatedAt: new Date().toISOString() }
          : r,
      ),
    );
  }

  async function saveDuration(durationId: string) {
    if (!selected || !dialogProduct) return;
    const raw = drafts[durationId]?.trim() ?? "";
    const usd = Number(raw);
    if (!raw || !Number.isFinite(usd) || usd < 0) {
      toast.error("Enter a valid USD price (0 or more).");
      return;
    }
    setSavingId(durationId);
    const result = await adminMutate("/api/admin/special-prices", {
      method: "PUT",
      body: JSON.stringify({
        userId: selected.id,
        durationId,
        priceUsd: usd,
      }),
    });
    setSavingId(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Special price saved");
    const micro = usdToMicrocents(usd);
    const hadSpecial =
      dialogProduct.durations.find((d) => d.id === durationId)?.specialPrice !=
      null;
    setDialogProduct((prev) =>
      prev
        ? {
            ...prev,
            specialCount: prev.durations.filter((d) =>
              d.id === durationId ? true : d.specialPrice != null,
            ).length,
            durations: prev.durations.map((d) =>
              d.id === durationId ? { ...d, specialPrice: micro } : d,
            ),
          }
        : prev,
    );
    setCatalog((prev) =>
      prev
        ? {
            ...prev,
            products: prev.products.map((p) =>
              p.id !== dialogProduct.id
                ? p
                : {
                    ...p,
                    specialCount: p.durations.filter((d) =>
                      d.id === durationId ? true : d.specialPrice != null,
                    ).length,
                    durations: p.durations.map((d) =>
                      d.id === durationId
                        ? { ...d, specialPrice: micro }
                        : d,
                    ),
                  },
            ),
          }
        : prev,
    );
    setSelected((u) =>
      u
        ? {
            ...u,
            specialPriceCount: Math.max(
              u.specialPriceCount,
              (u.specialPriceCount ?? 0) + (hadSpecial ? 0 : 1),
            ),
          }
        : u,
    );
    if (hadSpecial) {
      patchActiveRow(durationId, selected.id, micro);
    } else {
      void loadActive({ page: 1 });
    }
  }

  async function clearDuration(durationId: string) {
    if (!selected || !dialogProduct) return;
    setSavingId(durationId);
    const result = await adminMutate("/api/admin/special-prices", {
      method: "DELETE",
      body: JSON.stringify({
        userId: selected.id,
        durationId,
      }),
    });
    setSavingId(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Special price cleared");
    setDrafts((d) => ({ ...d, [durationId]: "" }));
    const had =
      dialogProduct.durations.find((d) => d.id === durationId)?.specialPrice !=
      null;
    setDialogProduct((prev) =>
      prev
        ? {
            ...prev,
            specialCount: Math.max(0, prev.specialCount - (had ? 1 : 0)),
            durations: prev.durations.map((d) =>
              d.id === durationId ? { ...d, specialPrice: null } : d,
            ),
          }
        : prev,
    );
    setCatalog((prev) =>
      prev
        ? {
            ...prev,
            products: prev.products.map((p) =>
              p.id !== dialogProduct.id
                ? p
                : {
                    ...p,
                    specialCount: Math.max(
                      0,
                      p.specialCount - (had ? 1 : 0),
                    ),
                    durations: p.durations.map((d) =>
                      d.id === durationId
                        ? { ...d, specialPrice: null }
                        : d,
                    ),
                  },
            ),
          }
        : prev,
    );
    if (had) {
      setSelected((u) =>
        u
          ? {
              ...u,
              specialPriceCount: Math.max(0, u.specialPriceCount - 1),
            }
          : u,
      );
      patchActiveRow(durationId, selected.id, null);
    }
  }

  async function saveActiveEdit() {
    if (!editRow) return;
    const raw = editDraft.trim();
    const usd = Number(raw);
    if (!raw || !Number.isFinite(usd) || usd < 0) {
      toast.error("Enter a valid USD price (0 or more).");
      return;
    }
    setEditSaving(true);
    const result = await adminMutate("/api/admin/special-prices", {
      method: "PUT",
      body: JSON.stringify({
        userId: editRow.userId,
        durationId: editRow.durationId,
        priceUsd: usd,
      }),
    });
    setEditSaving(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Special price updated");
    const micro = usdToMicrocents(usd);
    patchActiveRow(editRow.durationId, editRow.userId, micro);
    setEditRow((row) => (row ? { ...row, price: micro } : row));
    if (selected?.id === editRow.userId) {
      void loadCatalog({ page: 1, q: productQ });
    }
  }

  async function clearActiveEdit() {
    if (!editRow) return;
    setEditSaving(true);
    const result = await adminMutate("/api/admin/special-prices", {
      method: "DELETE",
      body: JSON.stringify({
        userId: editRow.userId,
        durationId: editRow.durationId,
      }),
    });
    setEditSaving(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Special price cleared");
    patchActiveRow(editRow.durationId, editRow.userId, null);
    if (selected?.id === editRow.userId) {
      setSelected((u) =>
        u
          ? {
              ...u,
              specialPriceCount: Math.max(0, u.specialPriceCount - 1),
            }
          : u,
      );
      void loadCatalog({ page: 1, q: productQ });
    }
    setEditRow(null);
  }

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Special prices"
        description="Set exact USD prices for any user on product durations. Flash sales and promos do not apply."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="size-4" />
            History
          </Button>
        }
      />

      <section className="space-y-3 rounded-2xl border border-primary/20 bg-card/55 p-3 shadow-[var(--glow-soft)] supports-backdrop-filter:backdrop-blur-sm sm:p-4">
        <Label htmlFor="special-user-search" className="text-sm font-medium">
          Find user
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="special-user-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username, email, or name…"
            className="h-10 pl-9"
            autoComplete="off"
          />
          {searching ? (
            <LoaderCircle className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {query.trim() && results.length > 0 ? (
          <ul className="max-h-64 overflow-y-auto rounded-xl border border-border/50 divide-y divide-border/40">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => selectUser(u)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <UserRound className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      @{u.username}
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        {u.name}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="secondary">{roleBadge(u.role)}</Badge>
                    {u.specialPriceCount > 0 ? (
                      <span className="text-[10px] text-muted-foreground">
                        {u.specialPriceCount} special
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {query.trim() && !searching && results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users matched.</p>
        ) : null}

        {selected ? (
          <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <UserRound className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                @{selected.username}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {selected.name}
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleBadge(selected.role)} · {selected.specialPriceCount} special
                price
                {selected.specialPriceCount === 1 ? "" : "s"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => {
                setSelected(null);
                setCatalog(null);
                setDialogProduct(null);
              }}
              aria-label="Clear selected user"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}
      </section>

      {!selected ? (
        <AdminEmptyState message="Search and select a user to set special prices on product durations." />
      ) : (
        <section className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={productQ}
              onChange={(e) => setProductQ(e.target.value)}
              placeholder="Filter products…"
              className="h-9 pl-9"
            />
          </div>

          {catalogLoading && !catalog ? (
            <AdminListSkeleton rows={6} />
          ) : !catalog || catalog.products.length === 0 ? (
            <AdminEmptyState message="No products found." />
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-primary/20 bg-card/55 divide-y divide-border/40 shadow-[var(--glow-soft)]">
              {catalog.products.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => openProduct(product)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/35 sm:px-4"
                  >
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="size-11 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <BadgeDollarSign className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {product.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.durations.length} duration
                        {product.durations.length === 1 ? "" : "s"}
                        {product.specialCount > 0
                          ? ` · ${product.specialCount} special`
                          : ""}
                      </p>
                    </div>
                    {product.specialCount > 0 ? (
                      <Badge className="shrink-0">Special</Badge>
                    ) : null}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {catalog?.hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() =>
                  void loadCatalog({
                    page: (catalog?.page ?? 1) + 1,
                    append: true,
                  })
                }
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
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Active specials
            </h2>
            <p className="text-xs text-muted-foreground">
              Who has a live override — tap to change or clear.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {activeTotal} live
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={activeQ}
            onChange={(e) => setActiveQ(e.target.value)}
            placeholder="Filter by user or product…"
            className="h-9 pl-9"
          />
        </div>

        {activeLoading && activeItems.length === 0 ? (
          <AdminListSkeleton rows={5} />
        ) : activeItems.length === 0 ? (
          <AdminEmptyState message="No active special prices yet." />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-primary/20 bg-card/55 divide-y divide-border/40 shadow-[var(--glow-soft)]">
            {activeItems.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => openActiveEdit(row)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/35 sm:px-4"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <UserRound className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        @{row.user.username}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {roleBadge(row.user.role)}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.productTitle} · {row.durationLabel}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatWhen(row.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium text-success">
                      {formatMoney(row.price)}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {activeHasMore ? (
          <div className="flex justify-center pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activeLoadingMore}
              onClick={() =>
                void loadActive({ page: activePage + 1, append: true })
              }
            >
              {activeLoadingMore ? (
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
      </section>

      <SpecialPriceHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        userId={selected?.id}
        username={selected?.username}
      />

      <DialogShell
        open={Boolean(editRow)}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
        icon={<BadgeDollarSign className="size-5" />}
        title={editRow ? `@${editRow.user.username}` : "Special price"}
        description={
          editRow
            ? `${editRow.productTitle} · ${editRow.durationLabel}`
            : undefined
        }
        size="md"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={editSaving || !editRow}
              onClick={() => void clearActiveEdit()}
            >
              <Trash2 className="size-4" />
              Clear
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={editSaving}
                onClick={() => setEditRow(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={editSaving || !editRow}
                onClick={() => void saveActiveEdit()}
              >
                {editSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        }
      >
        {editRow ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
              <p>
                Retail{" "}
                {editRow.retailPrice != null
                  ? formatMoney(editRow.retailPrice)
                  : "—"}
                {" · "}Wholesale{" "}
                {editRow.resellerPrice != null && editRow.resellerPrice > 0
                  ? formatMoney(editRow.resellerPrice)
                  : "—"}
              </p>
              <p className="mt-1">
                Current special{" "}
                <span className="font-medium text-success">
                  {formatMoney(editRow.price)}
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="active-special-usd">Special USD</Label>
              <Input
                id="active-special-usd"
                inputMode="decimal"
                placeholder="0.00"
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                className="h-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                selectUser({
                  id: editRow.user.id,
                  name: editRow.user.name,
                  username: editRow.user.username,
                  email: editRow.user.email,
                  role: editRow.user.role,
                  banned: editRow.user.banned,
                  specialPriceCount: 1,
                });
                setEditRow(null);
              }}
            >
              Open full catalog for this user
            </Button>
          </div>
        ) : null}
      </DialogShell>

      <DialogShell
        open={Boolean(dialogProduct)}
        onOpenChange={(open) => {
          if (!open) setDialogProduct(null);
        }}
        icon={<BadgeDollarSign className="size-5" />}
        title={dialogProduct?.title ?? "Durations"}
        description={`Exact USD price for @${selected?.username ?? "user"}. Flash and promos skip these lines.`}
        size="lg"
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogProduct(null)}
          >
            Done
          </Button>
        }
      >
        {dialogProduct?.durations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This product has no durations.
          </p>
        ) : (
          <ul className="space-y-3">
            {dialogProduct?.durations.map((d) => (
              <li
                key={d.id}
                className={cn(
                  "rounded-xl border border-border/50 bg-muted/20 p-3",
                  d.specialPrice != null && "border-primary/30 bg-primary/5",
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{d.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Retail{" "}
                      {d.retailPrice != null
                        ? formatMoney(d.retailPrice)
                        : "—"}
                      {" · "}Wholesale{" "}
                      {d.resellerPrice != null && d.resellerPrice > 0
                        ? formatMoney(d.resellerPrice)
                        : "—"}
                    </p>
                  </div>
                  {d.specialPrice != null ? (
                    <Badge variant="secondary">
                      {formatMoney(d.specialPrice)}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[7rem] flex-1 space-y-1">
                    <Label
                      htmlFor={`sp-${d.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      Special USD
                    </Label>
                    <Input
                      id={`sp-${d.id}`}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={drafts[d.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [d.id]: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9"
                    disabled={savingId === d.id}
                    onClick={() => void saveDuration(d.id)}
                  >
                    {savingId === d.id ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                  {d.specialPrice != null ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 text-destructive"
                      disabled={savingId === d.id}
                      onClick={() => void clearDuration(d.id)}
                    >
                      <Trash2 className="size-4" />
                      Clear
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogShell>
    </main>
  );
}
