"use client";

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminFetch } from "@/components/admin/use-admin-fetch";
import { microcentsToUsd } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import type {
  SupplierCatalogDto,
  SupplierCatalogItemDto,
} from "@/types/admin-supplier";
import {
  ArrowLeft,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const PRESET_FEATURE_TAGS = [
  "⚡ Instant Key",
  "🛡️ Undetected",
  "📱 No Root",
  "🔄 Auto Update",
  "🎮 Android 14",
  "✨ Safe & Tested",
];

const SUPPLIER_NONE = "__none__";

function supplierBuyPriceFromCatalog(
  price: string,
  buyPricePercent: number,
): string {
  const n = Number(price);
  if (!Number.isFinite(n) || n < 0) return "0";
  const factor = Math.min(100, Math.max(0, buyPricePercent)) / 100;
  const discounted = Math.round(n * factor * 100) / 100;
  return String(discounted);
}

function groupSupplierCatalog(items: SupplierCatalogItemDto[]) {
  const map = new Map<string, SupplierCatalogItemDto[]>();
  for (const item of items) {
    const key = item.group_name?.trim() || "Other";
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export type CategoryOption = { id: string; name: string };

export type DurationFormRow = {
  id?: string;
  label: string;
  /** Optional version group (Lite / Brutal). Empty = no version step. */
  version: string;
  days: string;
  apiCode: string;
  /** Upstream supplier catalog product id (empty = local only). */
  supplierProductId: string;
  userPrice: string;
  resellerPrice: string;
  buyPrice: string;
  requiresAndroidId: boolean;
  deviceIdName: string;
  keyCount?: number;
};

export type ProductFormState = {
  title: string;
  description: string;
  apiCode: string;
  imageUrl: string;
  /** Per-product demo link; empty uses site default. */
  demoUrl: string;
  features: string[];
  isActive: boolean;
  isPinned: boolean;
  isBestSeller: boolean;
  isMaintenance: boolean;
  categoryId: string;
  categoryName: string;
  durations: DurationFormRow[];
};

export const emptyDurationRow = (): DurationFormRow => ({
  label: "",
  version: "",
  days: "",
  apiCode: "",
  supplierProductId: "",
  userPrice: "",
  resellerPrice: "",
  buyPrice: "0",
  requiresAndroidId: false,
  deviceIdName: "",
  keyCount: 0,
});

export const emptyProductForm: ProductFormState = {
  title: "",
  description: "",
  apiCode: "",
  imageUrl: "",
  demoUrl: "",
  features: [],
  isActive: true,
  isPinned: false,
  isBestSeller: false,
  isMaintenance: false,
  categoryId: "",
  categoryName: "",
  durations: [],
};

export function priceFromMicrocents(value: number | undefined | null): string {
  if (value == null || value === 0) return value === 0 ? "0" : "";
  return String(microcentsToUsd(value));
}

type DurationPrice = {
  currency: string;
  price: number;
  resellerPrice?: number;
  buyPrice?: number;
};

export function durationToForm(d: {
  id: string;
  label: string;
  version?: string | null;
  days: number | null;
  apiCode?: string | null;
  supplierProductId?: number | null;
  requiresAndroidId?: boolean | null;
  deviceIdName?: string | null;
  prices: DurationPrice[];
  keyCount?: number;
  _count?: { keys: number };
}): DurationFormRow {
  const usd = d.prices.find((p) => p.currency === "USD") ?? d.prices[0];
  return {
    id: d.id,
    label: d.label,
    version: d.version ?? "",
    days: d.days != null ? String(d.days) : "",
    apiCode: d.apiCode ?? "",
    supplierProductId:
      d.supplierProductId != null ? String(d.supplierProductId) : "",
    userPrice: priceFromMicrocents(usd?.price),
    resellerPrice: priceFromMicrocents(usd?.resellerPrice),
    buyPrice: priceFromMicrocents(usd?.buyPrice ?? 0),
    requiresAndroidId: d.requiresAndroidId ?? false,
    deviceIdName: d.deviceIdName ?? "",
    keyCount: d.keyCount ?? d._count?.keys ?? 0,
  };
}

export function AdminProductDialog({
  open,
  onOpenChange,
  mode,
  form,
  onFormChange,
  categories,
  pending,
  onSubmit,
  onDelete,
  canDelete,
  onSaveDuration,
  onDeleteDuration,
  supplierBuyPricePercent = 50,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  form: ProductFormState;
  onFormChange: (next: ProductFormState) => void;
  categories: CategoryOption[];
  pending: boolean;
  onSubmit: () => void;
  onDelete?: () => void;
  canDelete: boolean;
  onSaveDuration: (row: DurationFormRow, index: number) => Promise<boolean>;
  onDeleteDuration: (row: DurationFormRow, index: number) => Promise<boolean>;
  /** Percent of supplier list price used as buy cost (Settings). */
  supplierBuyPricePercent?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<"product" | "duration">("product");
  const [durationIndex, setDurationIndex] = useState<number | null>(null);
  const [durationDraft, setDurationDraft] = useState<DurationFormRow>(
    emptyDurationRow(),
  );
  const [durationPending, setDurationPending] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState("");
  const { data: supplierCatalog } =
    useAdminFetch<SupplierCatalogDto>("/api/admin/supplier/catalog");

  const supplierGroups = useMemo(() => {
    const items = supplierCatalog?.items ?? [];
    const q = supplierFilter.trim().toLowerCase();
    const filtered = q
      ? items.filter((item) => {
          const hay = `${item.id} ${item.name} ${item.group_name ?? ""} ${item.price}`.toLowerCase();
          return hay.includes(q);
        })
      : items;
    return groupSupplierCatalog(filtered);
  }, [supplierCatalog?.items, supplierFilter]);

  const hasSupplierCatalog = (supplierCatalog?.items.length ?? 0) > 0;

  function applySupplierCatalogItem(value: string) {
    if (value === SUPPLIER_NONE) {
      setDurationDraft({ ...durationDraft, supplierProductId: "" });
      return;
    }
    const item = (supplierCatalog?.items ?? []).find(
      (row) => String(row.id) === value,
    );
    if (!item) {
      setDurationDraft({ ...durationDraft, supplierProductId: value });
      return;
    }
    setDurationDraft({
      ...durationDraft,
      supplierProductId: String(item.id),
      label: durationDraft.label.trim() ? durationDraft.label : item.name,
      days: durationDraft.days.trim()
        ? durationDraft.days
        : item.validity_days != null
          ? String(item.validity_days)
          : "",
      // Catalog shows supplier list price; buy cost uses Settings supplier %.
      buyPrice: supplierBuyPriceFromCatalog(item.price, supplierBuyPricePercent),
      requiresAndroidId: durationDraft.requiresAndroidId || (item.requires_android_id === true),
    });
  }

  const [featureDraft, setFeatureDraft] = useState("");

  function patch<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ) {
    onFormChange({ ...form, [key]: value });
  }

  function addFeatureTag(tagToAdd?: string) {
    const raw = tagToAdd !== undefined ? tagToAdd : featureDraft;
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const current = Array.isArray(form.features) ? form.features : [];
    const updated = [...current];
    for (const p of parts) {
      if (!updated.includes(p)) {
        updated.push(p);
      }
    }
    patch("features", updated);
    if (tagToAdd === undefined) {
      setFeatureDraft("");
    }
  }

  function removeFeatureTag(indexToRemove: number) {
    const current = Array.isArray(form.features) ? form.features : [];
    patch(
      "features",
      current.filter((_, idx) => idx !== indexToRemove),
    );
  }

  function resetDurationView() {
    setView("product");
    setDurationIndex(null);
    setDurationDraft(emptyDurationRow());
    setDurationPending(false);
    setSupplierFilter("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetDurationView();
    onOpenChange(next);
  }

  async function onPickImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/products/upload", {
        method: "POST",
        credentials: "include",
        body,
      });
      const json = (await res.json()) as {
        data?: { upload: { url: string } };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Upload failed");
        return;
      }
      patch("imageUrl", json.data?.upload.url ?? "");
      toast.success("Photo uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function openDurationCreate() {
    setDurationIndex(null);
    setDurationDraft(emptyDurationRow());
    setView("duration");
  }

  function openDurationEdit(row: DurationFormRow, index: number) {
    setDurationIndex(index);
    setDurationDraft({ ...row });
    setView("duration");
  }

  async function saveDurationDraft() {
    setDurationPending(true);
    const ok = await onSaveDuration(durationDraft, durationIndex ?? -1);
    setDurationPending(false);
    if (ok) resetDurationView();
  }

  async function removeDurationDraft() {
    if (durationIndex == null) return;
    setDurationPending(true);
    const ok = await onDeleteDuration(durationDraft, durationIndex);
    setDurationPending(false);
    if (ok) resetDurationView();
  }

  const categorySelectValue =
    form.categoryId || (form.categoryName ? "__new__" : "__none__");
  const onDurationView = view === "duration";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,820px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            {onDurationView ? (
              <>
                <button
                  type="button"
                  onClick={resetDurationView}
                  className="mb-1 inline-flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors hover:bg-primary/20"
                  aria-label="Back to product"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <DialogTitle className="text-lg">
                  {durationDraft.id ? "Edit duration" : "Add duration"}
                </DialogTitle>
                <DialogDescription>
                  Label must be unique per version on this product. Optional
                  Version (e.g. Lite / Brutal) enables a storefront version
                  step. Buy price is for admin stats only.
                </DialogDescription>
              </>
            ) : (
              <>
                <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Package className="size-5" />
                </div>
                <DialogTitle className="text-lg">
                  {mode === "create" ? "Add product" : "Edit product"}
                </DialogTitle>
                <DialogDescription>
                  Photo, category folder, active toggle, and duration prices.
                </DialogDescription>
              </>
            )}
          </DialogHeader>
        </div>

        {onDurationView ? (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Label
                </Label>
                <Input
                  value={durationDraft.label}
                  onChange={(e) =>
                    setDurationDraft({
                      ...durationDraft,
                      label: e.target.value,
                    })
                  }
                  placeholder="30 Days"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Version (optional)
                </Label>
                <Input
                  value={durationDraft.version}
                  onChange={(e) =>
                    setDurationDraft({
                      ...durationDraft,
                      version: e.target.value,
                    })
                  }
                  placeholder="Lite / Brutal — leave blank for normal products"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Validity (Hours or Days)
                </Label>
                <Input
                  type="number"
                  value={durationDraft.days}
                  onChange={(e) =>
                    setDurationDraft({
                      ...durationDraft,
                      days: e.target.value,
                    })
                  }
                  placeholder="30"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Duration API code
                </Label>
                <Input
                  value={durationDraft.apiCode}
                  onChange={(e) =>
                    setDurationDraft({
                      ...durationDraft,
                      apiCode: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Auto from product + label"
                  className="h-10 font-mono text-xs"
                />
              </div>
              <div className="space-y-3 rounded-lg border border-border/40 p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Requires Device Bound ID</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Mint device-bound keys on demand (requires buyer to input custom ID).
                    </p>
                  </div>
                  <Switch
                    checked={durationDraft.requiresAndroidId}
                    onCheckedChange={(c) =>
                      setDurationDraft({ ...durationDraft, requiresAndroidId: c })
                    }
                  />
                </div>
                {durationDraft.requiresAndroidId && (
                  <div className="space-y-1.5 pt-1 border-t border-border/20">
                    <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                      Device ID Field Label / Name
                    </Label>
                    <Input
                      value={durationDraft.deviceIdName}
                      onChange={(e) =>
                        setDurationDraft({
                          ...durationDraft,
                          deviceIdName: e.target.value,
                        })
                      }
                      placeholder="e.g. Android ID, HWID, Device Serial"
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Label shown to customer at checkout. Defaults to &quot;Android ID&quot; if left empty.
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Supplier product
                </Label>
                {hasSupplierCatalog ? (
                  <>
                    <Input
                      value={supplierFilter}
                      onChange={(e) => setSupplierFilter(e.target.value)}
                      placeholder="Search catalog…"
                      className="h-9"
                    />
                    <Select
                      value={
                        durationDraft.supplierProductId.trim()
                          ? durationDraft.supplierProductId.trim()
                          : SUPPLIER_NONE
                      }
                      onValueChange={applySupplierCatalogItem}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Local inventory only" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value={SUPPLIER_NONE}>
                          Local inventory only
                        </SelectItem>
                        {supplierGroups.map(([groupName, rows]) => (
                          <SelectGroup key={groupName}>
                            <SelectLabel>{groupName}</SelectLabel>
                            {rows.map((item) => (
                              <SelectItem
                                key={item.id}
                                value={String(item.id)}
                              >
                                #{item.id} · {item.name}
                                {item.in_stock ? "" : " (out)"} · $
                                {item.price} {item.requires_android_id ? " [Android ID]" : ""}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Pick from supplier catalog (buy cost ={" "}
                      {supplierBuyPricePercent}% of supplier price + empty
                      label/days). Or leave local-only.
                    </p>
                  </>
                ) : (
                  <>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={durationDraft.supplierProductId}
                      onChange={(e) =>
                        setDurationDraft({
                          ...durationDraft,
                          supplierProductId: e.target.value,
                        })
                      }
                      placeholder="e.g. 62 — blank = local inventory only"
                      className="h-10 font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Sync catalog on Supplier desk to pick by name. Manual ID
                      still works.
                    </p>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    User USD
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={durationDraft.userPrice}
                    onChange={(e) =>
                      setDurationDraft({
                        ...durationDraft,
                        userPrice: e.target.value,
                      })
                    }
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Seller / Reseller USD
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={durationDraft.resellerPrice}
                    onChange={(e) =>
                      setDurationDraft({
                        ...durationDraft,
                        resellerPrice: e.target.value,
                      })
                    }
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Buy USD
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={durationDraft.buyPrice}
                    onChange={(e) =>
                      setDurationDraft({
                        ...durationDraft,
                        buyPrice: e.target.value,
                      })
                    }
                    className="h-10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:justify-between sm:px-5">
              {durationDraft.id ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={
                    durationPending || (durationDraft.keyCount ?? 0) > 0
                  }
                  onClick={() => void removeDurationDraft()}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={durationPending}
                  onClick={resetDurationView}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={durationPending}
                  onClick={() => void saveDurationDraft()}
                >
                  {durationPending ? "Saving…" : "Save duration"}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Off hides this product from the storefront
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => patch("isActive", v)}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3">
                <div>
                  <p className="text-sm font-medium">Pin to top</p>
                  <p className="text-xs text-muted-foreground">
                    Pinned products stay above bestsellers and newest
                  </p>
                </div>
                <Switch
                  checked={form.isPinned}
                  onCheckedChange={(v) => patch("isPinned", v)}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3">
                <div>
                  <p className="text-sm font-medium">Best seller</p>
                  <p className="text-xs text-muted-foreground">
                    Shows the Bestseller badge and ranks below pins
                  </p>
                </div>
                <Switch
                  checked={form.isBestSeller}
                  onCheckedChange={(v) => patch("isBestSeller", v)}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 ring-1 ring-amber-500/20 px-3.5 py-3">
                <div>
                  <p className="text-sm font-semibold text-amber-400">Maintenance Mode</p>
                  <p className="text-xs text-amber-200/70">
                    Disables buy/demo buttons and shows maintenance badge with blur on store
                  </p>
                </div>
                <Switch
                  checked={form.isMaintenance}
                  onCheckedChange={(v) => patch("isMaintenance", v)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Name
                </Label>
                <Input
                  value={form.title}
                  onChange={(e) => patch("title", e.target.value)}
                  placeholder="Product name"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  API code
                </Label>
                <Input
                  value={form.apiCode}
                  onChange={(e) =>
                    patch("apiCode", e.target.value.toUpperCase())
                  }
                  placeholder="Auto from title if empty"
                  className="h-10 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Short description
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => patch("description", e.target.value)}
                  placeholder="Brief summary for the store"
                  className="min-h-20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Demo URL
                </Label>
                <Input
                  type="url"
                  value={form.demoUrl}
                  onChange={(e) => patch("demoUrl", e.target.value)}
                  placeholder="https://youtube.com/watch?v=… (empty = site default)"
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">
                  Plays in an on-site Demo dialog. Use a YouTube video link
                  (watch / shorts / youtu.be). Leave empty for the site default.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] tracking-wide text-muted-foreground uppercase flex items-center gap-1.5">
                    <Tag className="size-3 text-primary" />
                    Product Features / Tags
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Type comma (,) or Enter to create chip
                  </span>
                </div>

                <div className="min-h-11 rounded-xl border border-input bg-background/80 p-2.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary/50 transition-all space-y-2">
                  {Array.isArray(form.features) && form.features.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {form.features.map((feat, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/15 border border-primary/30 px-2 py-0.5 text-xs font-semibold text-primary"
                        >
                          <span>{feat}</span>
                          <button
                            type="button"
                            onClick={() => removeFeatureTag(idx)}
                            className="rounded-full p-0.5 hover:bg-primary/20 hover:text-foreground transition-colors"
                            aria-label={`Remove ${feat}`}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <Input
                    value={featureDraft}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes(",")) {
                        addFeatureTag(val);
                        setFeatureDraft("");
                      } else {
                        setFeatureDraft(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addFeatureTag();
                      } else if (
                        e.key === "Backspace" &&
                        !featureDraft &&
                        form.features.length > 0
                      ) {
                        removeFeatureTag(form.features.length - 1);
                      }
                    }}
                    onBlur={() => {
                      if (featureDraft.trim()) {
                        addFeatureTag();
                      }
                    }}
                    placeholder={
                      form.features.length === 0
                        ? "e.g. ⚡ Instant Key, 🛡️ Undetected (type comma to add chip)"
                        : "Add another feature tag..."
                    }
                    className="h-8 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" />
                    Quick presets:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_FEATURE_TAGS.map((preset) => {
                      const exists = form.features.includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={exists}
                          onClick={() => addFeatureTag(preset)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-all",
                            exists
                              ? "bg-muted/40 text-muted-foreground opacity-40 cursor-not-allowed"
                              : "bg-muted/60 text-foreground/80 hover:bg-primary/20 hover:text-primary hover:border-primary/40 border border-border/40 cursor-pointer",
                          )}
                        >
                          <Plus className="size-2.5" />
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Photo
                </Label>
                <div className="flex items-center gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                    {form.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        void onPickImage(e.target.files?.[0] ?? null)
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading || pending}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? "Uploading…" : "Upload photo"}
                    </Button>
                    {form.imageUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-start px-0 text-muted-foreground"
                        onClick={() => patch("imageUrl", "")}
                      >
                        Remove photo
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Category
                </Label>
                <Select
                  value={categorySelectValue}
                  onValueChange={(v) => {
                    if (v === "__none__") {
                      onFormChange({
                        ...form,
                        categoryId: "",
                        categoryName: "",
                      });
                    } else if (v === "__new__") {
                      onFormChange({
                        ...form,
                        categoryId: "",
                        categoryName: form.categoryName || "",
                      });
                    } else {
                      onFormChange({
                        ...form,
                        categoryId: v,
                        categoryName: "",
                      });
                    }
                  }}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Uncategorized</SelectItem>
                    <SelectItem value="__new__">Create new…</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(categorySelectValue === "__new__" ||
                  (!form.categoryId && form.categoryName)) && (
                  <Input
                    value={form.categoryName}
                    onChange={(e) =>
                      onFormChange({
                        ...form,
                        categoryId: "",
                        categoryName: e.target.value,
                      })
                    }
                    placeholder="New category name"
                    className="mt-2 h-10"
                  />
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Durations
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={mode === "create"}
                    onClick={openDurationCreate}
                  >
                    <Plus data-icon="inline-start" />
                    Add
                  </Button>
                </div>
                {mode === "create" ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Save the product first, then add durations with prices.
                  </p>
                ) : form.durations.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                    No durations yet
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {form.durations.map((d, i) => (
                      <li key={d.id ?? `new-${i}`}>
                        <button
                          type="button"
                          onClick={() => openDurationEdit(d, i)}
                          className="flex w-full items-center gap-3 rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3 text-left transition-colors hover:bg-muted/50"
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Timer className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {d.version.trim() ? (
                                <>
                                  <span className="mr-1.5 inline-flex rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                    {d.version.trim()}
                                  </span>
                                  {d.label}
                                </>
                              ) : (
                                d.label
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              User ${d.userPrice || "—"} · Seller $
                              {d.resellerPrice || "—"} · Buy $
                              {d.buyPrice || "0"}
                              {d.supplierProductId
                                ? ` · Supplier #${d.supplierProductId}`
                                : ""}
                              {d.keyCount ? ` · ${d.keyCount} keys` : ""}
                            </p>
                          </div>
                          <Pencil className="size-3.5 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:justify-between sm:px-5">
              {mode === "edit" && onDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending || !canDelete}
                  title={
                    canDelete
                      ? "Remove available stock; keep sold keys & order history"
                      : undefined
                  }
                  onClick={onDelete}
                >
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (featureDraft.trim()) {
                      addFeatureTag();
                    }
                    onSubmit();
                  }}
                >
                  {pending ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
