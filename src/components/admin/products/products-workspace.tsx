"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import {
  AdminProductDialog,
  durationToForm,
  emptyProductForm,
  type DurationFormRow,
  type ProductFormState,
} from "@/components/admin/products/admin-product-dialog";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChevronRight, Package, Plus, Search, SquarePlay } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const BUILTIN_DEFAULT_PRODUCT_DEMO_URL =
  "https://www.youtube.com/@cheapseller";

type CategoryRow = { id: string; name: string; slug: string };

type ProductRow = {
  id: string;
  title: string;
  description: string;
  apiCode?: string | null;
  imageUrl: string | null;
  demoUrl?: string | null;
  features?: string[];
  isActive: boolean;
  isPinned?: boolean;
  isBestSeller?: boolean;
  isMaintenance?: boolean;
  categoryId: string | null;
  category: CategoryRow | null;
  keyTotal: number;
  keyAvailable: number;
  durations: {
    id: string;
    label: string;
    version?: string;
    days: number | null;
    apiCode?: string | null;
    supplierProductId?: number | null;
    requiresAndroidId?: boolean;
    prices: {
      currency: string;
      price: number;
      resellerPrice: number;
      buyPrice: number;
    }[];
    keyCount: number;
  }[];
};

type ActiveFilter = "all" | "active" | "off";

export function ProductsWorkspace() {
  const { data, loading, reload } = useAdminFetch<ProductRow[]>(
    "/api/admin/products",
  );
  const { data: categoriesData, reload: reloadCategories } = useAdminFetch<
    CategoryRow[]
  >("/api/admin/categories");
  const { data: settingsData, reload: reloadSettings } = useAdminFetch<{
    defaultProductDemoUrl?: string;
    supplierBuyPricePercent?: number;
  }>("/api/admin/settings");

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [pending, setPending] = useState(false);
  const [defaultDemoOpen, setDefaultDemoOpen] = useState(false);
  const [defaultDemoDraft, setDefaultDemoDraft] = useState(
    BUILTIN_DEFAULT_PRODUCT_DEMO_URL,
  );
  const [defaultDemoPending, setDefaultDemoPending] = useState(false);

  useEffect(() => {
    if (settingsData?.defaultProductDemoUrl) {
      setDefaultDemoDraft(settingsData.defaultProductDemoUrl);
    }
  }, [settingsData?.defaultProductDemoUrl]);

  const products = data ?? [];
  const categories = categoriesData ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (activeFilter === "active" && !p.isActive) return false;
      if (activeFilter === "off" && p.isActive) return false;
      if (categoryFilter === "none" && p.categoryId) return false;
      if (
        categoryFilter !== "all" &&
        categoryFilter !== "none" &&
        p.categoryId !== categoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.category?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, query, activeFilter, categoryFilter]);

  function productToForm(p: ProductRow): ProductFormState {
    return {
      title: p.title,
      description: p.description,
      apiCode: p.apiCode ?? "",
      imageUrl: p.imageUrl ?? "",
      demoUrl: p.demoUrl ?? "",
      features: Array.isArray(p.features) ? p.features : [],
      isActive: p.isActive,
      isPinned: p.isPinned ?? false,
      isBestSeller: p.isBestSeller ?? false,
      isMaintenance: p.isMaintenance ?? false,
      categoryId: p.categoryId ?? "",
      categoryName: "",
      durations: p.durations.map(durationToForm),
    };
  }

  function openDefaultDemo() {
    setDefaultDemoDraft(
      settingsData?.defaultProductDemoUrl?.trim() ||
        BUILTIN_DEFAULT_PRODUCT_DEMO_URL,
    );
    setDefaultDemoOpen(true);
  }

  async function saveDefaultDemo() {
    const url = defaultDemoDraft.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      toast.error("Demo URL must start with http:// or https://");
      return;
    }
    setDefaultDemoPending(true);
    const result = await adminMutate("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({
        defaultProductDemoUrl: url || BUILTIN_DEFAULT_PRODUCT_DEMO_URL,
      }),
    });
    setDefaultDemoPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Default demo link saved");
    setDefaultDemoOpen(false);
    void reloadSettings();
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyProductForm);
    setOpen(true);
  }

  function openEdit(p: ProductRow) {
    setEditing(p);
    setForm(productToForm(p));
    setOpen(true);
  }

  async function refreshEditing(productId: string) {
    const res = await fetch(`/api/admin/products/${productId}`, {
      credentials: "include",
    });
    const json = (await res.json()) as { data?: ProductRow };
    if (json.data) {
      setEditing({
        ...json.data,
        keyTotal: json.data.durations.reduce(
          (n, d) => n + (d.keyCount ?? 0),
          0,
        ),
        keyAvailable: 0,
      });
      setForm(productToForm({
        ...json.data,
        keyTotal: 0,
        keyAvailable: 0,
        durations: json.data.durations.map((d) => ({
          ...d,
          keyCount: d.keyCount ?? 0,
        })),
      }));
    }
    void reload();
  }

  async function saveProduct() {
    if (!form.title.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Short description is required.");
      return;
    }
    const demoRaw = form.demoUrl.trim();
    if (demoRaw && !/^https?:\/\//i.test(demoRaw)) {
      toast.error("Demo URL must start with http:// or https://");
      return;
    }
    setPending(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      apiCode: form.apiCode.trim() || null,
      imageUrl: form.imageUrl || null,
      demoUrl: demoRaw || null,
      features: Array.isArray(form.features)
        ? form.features.map((s) => s.trim()).filter(Boolean)
        : [],
      isActive: form.isActive,
      isPinned: form.isPinned,
      isBestSeller: form.isBestSeller,
      isMaintenance: form.isMaintenance,
    };
    if (form.categoryId) {
      payload.categoryId = form.categoryId;
    } else if (form.categoryName.trim()) {
      payload.categoryId = null;
      payload.categoryName = form.categoryName.trim();
    } else {
      payload.categoryId = null;
    }

    const result = editing
      ? await adminMutate(`/api/admin/products/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await adminMutate("/api/admin/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(editing ? "Product updated" : "Product created");
    void reloadCategories();
    if (!editing) {
      const created = result.data as { id?: string } | null;
      if (created?.id) {
        setEditing({
          id: created.id,
          title: form.title,
          description: form.description,
          imageUrl: form.imageUrl || null,
          demoUrl: demoRaw || null,
          isActive: form.isActive,
          isPinned: form.isPinned,
          isBestSeller: form.isBestSeller,
          categoryId: form.categoryId || null,
          category: null,
          keyTotal: 0,
          keyAvailable: 0,
          durations: [],
        });
        setForm((f) => ({ ...f, durations: [] }));
        void reload();
        return;
      }
    } else {
      await refreshEditing(editing.id);
      return;
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyProductForm);
    void reload();
  }

  async function deleteProduct() {
    if (!editing) return;
    if (
      !window.confirm(
        `Delete “${editing.title}”?\n\nAvailable stock will be removed. Purchased keys and order history stay.`,
      )
    ) {
      return;
    }
    setPending(true);
    const result = await adminMutate(`/api/admin/products/${editing.id}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const payload = result.data as {
      mode?: "deleted" | "archived";
      purgedAvailable?: number;
      soldKeysKept?: number;
    } | null;
    if (payload?.mode === "archived") {
      toast.success(
        `Product archived — cleared ${payload.purgedAvailable ?? 0} available key(s); kept ${payload.soldKeysKept ?? 0} sold.`,
      );
    } else {
      toast.success(
        `Product deleted${
          payload?.purgedAvailable
            ? ` (cleared ${payload.purgedAvailable} available key(s))`
            : ""
        }`,
      );
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyProductForm);
    void reload();
  }

  async function saveDuration(row: DurationFormRow, index: number) {
    if (!editing) {
      toast.error("Save the product first.");
      return false;
    }
    if (!row.label.trim()) {
      toast.error("Duration label is required.");
      return false;
    }
    const userPrice = Number(row.userPrice);
    if (!(userPrice > 0)) {
      toast.error("Enter a user USD price greater than 0.");
      return false;
    }
    const resellerPrice = Number(row.resellerPrice || 0);
    const buyPrice = Number(row.buyPrice || 0);
    if (resellerPrice < 0 || buyPrice < 0) {
      toast.error("Prices cannot be negative.");
      return false;
    }
    const daysRaw = row.days.trim();
    const days = daysRaw
      ? Number.parseInt(daysRaw, 10)
      : null;
    if (daysRaw && (!Number.isFinite(days) || (days ?? 0) < 1)) {
      toast.error("Days must be a positive integer or blank.");
      return false;
    }

    const supplierRaw = row.supplierProductId.trim();
    let supplierProductId: number | null = null;
    if (supplierRaw) {
      const n = Number.parseInt(supplierRaw, 10);
      if (!Number.isFinite(n) || n < 1) {
        toast.error("Supplier product ID must be a positive integer or blank.");
        return false;
      }
      supplierProductId = n;
    }

    const prices = [
      {
        currency: "USD" as const,
        price: userPrice,
        resellerPrice,
        buyPrice,
      },
    ];

    const result = row.id
      ? await adminMutate(`/api/admin/durations/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            label: row.label.trim(),
            version: row.version.trim(),
            days,
            apiCode: row.apiCode.trim() || null,
            supplierProductId,
            requiresAndroidId: row.requiresAndroidId,
            deviceIdName: row.deviceIdName?.trim() || "",
            prices,
          }),
        })
      : await adminMutate("/api/admin/durations", {
          method: "POST",
          body: JSON.stringify({
            productId: editing.id,
            label: row.label.trim(),
            version: row.version.trim(),
            days,
            apiCode: row.apiCode.trim() || null,
            supplierProductId,
            requiresAndroidId: row.requiresAndroidId,
            deviceIdName: row.deviceIdName?.trim() || "",
            prices,
          }),
        });

    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    toast.success(row.id ? "Duration updated" : "Duration added");
    await refreshEditing(editing.id);
    void index;
    return true;
  }

  async function deleteDuration(row: DurationFormRow) {
    if (!row.id || !editing) return false;
    if ((row.keyCount ?? 0) > 0) {
      toast.error("Cannot delete a duration that still has keys.");
      return false;
    }
    if (!window.confirm(`Delete duration “${row.label}”?`)) return false;
    const result = await adminMutate(`/api/admin/durations/${row.id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    toast.success("Duration deleted");
    await refreshEditing(editing.id);
    return true;
  }

  return (
    <main className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          title="Products"
          description="Catalog, durations and USD prices"
        />
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={openDefaultDemo}>
            <SquarePlay data-icon="inline-start" />
            Default demo
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Add product
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {(
            [
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "off", label: "Off" },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveFilter(chip.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === chip.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              categoryFilter === "all"
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            Any folder
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("none")}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              categoryFilter === "none"
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            Uncategorized
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                categoryFilter === c.id
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <AdminListSkeleton />
      ) : filtered.length === 0 ? (
        <AdminEmptyState message="No products match. Add a product to start the catalog." />
      ) : (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openEdit(p)}
                className="flex w-full items-center gap-3.5 px-3.5 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <Package className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{p.title}</p>
                    <Badge variant={p.isActive ? "secondary" : "outline"}>
                      {p.isActive ? "Active" : "Off"}
                    </Badge>
                    {p.isMaintenance ? (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold">
                        Maintenance
                      </Badge>
                    ) : null}
                    {p.isPinned ? (
                      <Badge variant="default" className="font-normal">
                        Pinned
                      </Badge>
                    ) : null}
                    {p.isBestSeller ? (
                      <Badge variant="outline" className="font-normal">
                        Best seller
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="font-normal">
                      {p.category?.name ?? "Uncategorized"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.durations.length} duration
                    {p.durations.length === 1 ? "" : "s"}
                    {p.keyTotal > 0
                      ? ` · ${p.keyAvailable}/${p.keyTotal} keys avail`
                      : " · no keys"}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AdminProductDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setForm(emptyProductForm);
            void reload();
          }
        }}
        mode={editing ? "edit" : "create"}
        form={form}
        onFormChange={setForm}
        categories={categories}
        pending={pending}
        onSubmit={() => void saveProduct()}
        onDelete={editing ? () => void deleteProduct() : undefined}
        canDelete={Boolean(editing)}
        onSaveDuration={saveDuration}
        onDeleteDuration={async (row) => deleteDuration(row)}
        supplierBuyPricePercent={settingsData?.supplierBuyPricePercent ?? 50}
      />

      <Dialog open={defaultDemoOpen} onOpenChange={setDefaultDemoOpen}>
        <DialogContent className="flex max-h-[min(92dvh,28rem)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                <SquarePlay className="size-5" />
              </div>
              <DialogTitle className="text-lg">Default demo link</DialogTitle>
              <DialogDescription>
                Used on the storefront Demo button when a product has no demo
                URL of its own. Prefer a YouTube video link (watch / shorts /
                youtu.be) so it plays in the on-site Dialog.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Demo URL
              </Label>
              <Input
                type="url"
                value={defaultDemoDraft}
                onChange={(e) => setDefaultDemoDraft(e.target.value)}
                placeholder={BUILTIN_DEFAULT_PRODUCT_DEMO_URL}
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border/40 px-4 py-3 sm:px-5">
            <Button
              type="button"
              variant="outline"
              disabled={defaultDemoPending}
              onClick={() => setDefaultDemoOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={defaultDemoPending}
              onClick={() => void saveDefaultDemo()}
            >
              {defaultDemoPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
