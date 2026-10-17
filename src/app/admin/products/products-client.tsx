"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Boxes, FolderTree, KeyRound, MoreHorizontal, Pencil, Pin, Plus, ShoppingCart, Sparkles, Star, Trash2, Wrench } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { Chips, ConfirmDialog, SearchBox, StatCard, TableSkeleton, adminFetch, errMsg, useAdminQuery, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { microcentsToUsd } from "@/lib/currencies";
import { CategoriesManager } from "./categories-manager";
import { CategoryIcon, CategorySelect } from "./category-picker";
import { usd, type CategoryRow, type ProductRow } from "./types";

export function AdminProductsClient({ defaultTab = "products" }: { defaultTab?: string }) {
  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="products">
          <Boxes className="size-4" /> Products
        </TabsTrigger>
        <TabsTrigger value="categories">
          <FolderTree className="size-4" /> Categories
        </TabsTrigger>
      </TabsList>
      <TabsContent value="products">
        <ProductsTab />
      </TabsContent>
      <TabsContent value="categories">
        <CategoriesManager />
      </TabsContent>
    </Tabs>
  );
}

type Status = "all" | "true" | "false";

function ProductsTab() {
  const router = useRouter();
  const [rawQ, setQ] = useState("");
  const q = useDebounced(rawQ);
  const [status, setStatus] = useState<Status>("all");
  const [categoryId, setCategoryId] = useState<string | null>("all");
  const [toDelete, setToDelete] = useState<ProductRow | null>(null);

  // Fetch everything once; filtering is instant client-side and the counts stay stable.
  const { data: all, reload, error } = useAdminQuery<ProductRow[]>("/api/admin/products");
  const categories = useAdminQuery<CategoryRow[]>("/api/admin/categories").data ?? [];
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const rows = useMemo(() => {
    if (!all) return null;
    const needle = q.trim().toLowerCase();
    return all.filter((p) => {
      if (status === "true" && !p.isActive) return false;
      if (status === "false" && p.isActive) return false;
      if (categoryId !== "all" && categoryId !== p.categoryId) return false;
      if (!needle) return true;
      return p.title.toLowerCase().includes(needle) || String(p.number) === needle || p.durations.some((d) => String(d.number) === needle);
    });
  }, [all, q, status, categoryId]);

  const stats = useMemo(() => {
    const list = all ?? [];
    return {
      total: list.length,
      active: list.filter((p) => p.isActive).length,
      stock: list.reduce((n, p) => n + p.keyAvailable, 0),
      sold: list.reduce((n, p) => n + p.keySold, 0),
    };
  }, [all]);

  async function quick(p: ProductRow, patch: Partial<ProductRow>) {
    try {
      await adminFetch(`/api/admin/products/${p.id}`, { method: "PATCH", json: patch });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Products" value={stats.total} icon={Boxes} />
        <StatCard label="Active" value={stats.active} icon={Sparkles} />
        <StatCard label="Keys in stock" value={stats.stock} icon={KeyRound} />
        <StatCard label="Keys sold" value={stats.sold} icon={ShoppingCart} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchBox value={rawQ} onChange={setQ} placeholder="Search name or # number…" />
          <CategorySelect allowAll value={categoryId} onChange={setCategoryId} categories={categories} className="sm:w-52" />
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus /> New product
          </Link>
        </Button>
      </div>

      <Chips
        value={status}
        onChange={setStatus}
        options={[
          { v: "all", label: "All", count: stats.total },
          { v: "true", label: "Active", count: stats.active },
          { v: "false", label: "Archived", count: stats.total - stats.active },
        ]}
      />

      {!rows ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={Boxes} title={all?.length ? "No products match" : "No products yet"} hint={all?.length ? "Try a different filter." : "Create your first product to start selling."}>
          {!all?.length ? (
            <Button asChild size="sm" className="mt-3">
              <Link href="/admin/products/new">
                <Plus /> New product
              </Link>
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <ul className="grid gap-2">
          {rows.map((p) => (
            <ProductRowCard
              key={p.id}
              p={p}
              onOpen={() => router.push(`/admin/products/${p.id}/edit`)}
              onActive={(v) => quick(p, { isActive: v })}
              onPin={() => quick(p, { isPinned: !p.isPinned })}
              onDelete={() => setToDelete(p)}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.title}"?`}
        description="Unsold keys are removed. If the product has purchase history it is archived instead, so orders stay intact."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            const r = await adminFetch<{ mode: string }>(`/api/admin/products/${toDelete!.id}`, { method: "DELETE" });
            toast.success(r.mode === "archived" ? "Product archived (has purchase history)." : "Product deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function ProductRowCard({
  p,
  onOpen,
  onActive,
  onPin,
  onDelete,
}: {
  p: ProductRow;
  onOpen: () => void;
  onActive: (v: boolean) => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const prices = p.durations.map((d) => d.prices[0]?.price).filter((v): v is number => typeof v === "number" && v > 0);
  const from = prices.length ? usd(microcentsToUsd(Math.min(...prices))) : null;
  const low = p.keyAvailable === 0;

  return (
    <li className={`group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 ${p.isActive ? "" : "opacity-70"}`}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 basis-64 items-center gap-3 text-left">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <Boxes className="size-5 text-muted-foreground" />
          )}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{p.title}</span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">#{p.number}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.category ? (
              <span className="inline-flex items-center gap-1 text-foreground/80">
                <CategoryIcon icon={p.category.icon} slug={p.category.slug} className="size-3.5 text-primary" /> {p.category.name}
              </span>
            ) : (
              <span>Uncategorized</span>
            )}
            <span>
              {p.durations.length} duration{p.durations.length === 1 ? "" : "s"}
            </span>
            {from ? <span>from {from}</span> : <span className="text-warning">No price</span>}
          </span>
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        {!p.isActive ? <Badge variant="muted"><Archive /> Archived</Badge> : null}
        {p.isPinned ? <Badge variant="default"><Pin /> Pinned</Badge> : null}
        {p.isBestSeller ? <Badge variant="highlight"><Star /> Best</Badge> : null}
        {p.isNew ? <Badge variant="success"><Sparkles /> New</Badge> : null}
        {p.isMaintenance ? <Badge variant="warning"><Wrench /> Maint.</Badge> : null}
      </div>

      <div className="w-24 text-right text-sm">
        <p className={`font-semibold tabular-nums ${low ? "text-warning" : ""}`}>{p.keyAvailable}</p>
        <p className="text-xs text-muted-foreground">{p.keySold} sold</p>
      </div>

      <Switch checked={p.isActive} onCheckedChange={onActive} aria-label="Active" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/products/${p.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPin}>
            <Pin /> {p.isPinned ? "Unpin" : "Pin to top"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
