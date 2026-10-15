"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import {
  AdminFlashSaleDialog,
  emptyFlashSaleForm,
  type FlashSaleFormState,
  type FlashSaleProductOption,
} from "@/components/admin/flash-sales/admin-flash-sale-dialog";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  flashAudienceLabel,
  flashDateTimeInput,
  flashDateTimeLabel,
  flashScopeLabel,
  localDateTimeToIso,
} from "@/lib/flash-sale-format";
import { cn } from "@/lib/utils";
import { ChevronRight, Flame, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Sale = {
  id: string;
  title: string;
  discountPercent: number;
  scope: "GLOBAL" | "PRODUCT" | "DURATION";
  targetRole: "ALL" | "USER" | "SELLER";
  productId: string | null;
  durationId: string | null;
  active: boolean;
  showBanner: boolean;
  bannerDescription: string | null;
  displayPromoCode: string | null;
  startsAt: string | null;
  expiresAt: string | null;
};

type AdminProduct = {
  id: string;
  title: string;
  durations: { id: string; label: string }[];
};

type StatusFilter = "all" | "active" | "off";

function saleToForm(sale: Sale): FlashSaleFormState {
  return {
    title: sale.title,
    discountPercent: String(sale.discountPercent || 0),
    scope: sale.scope,
    targetRole: sale.targetRole,
    productId: sale.productId ?? "",
    durationId: sale.durationId ?? "",
    startsAt: flashDateTimeInput(sale.startsAt),
    expiresAt: flashDateTimeInput(sale.expiresAt),
    active: sale.active,
    showBanner: sale.showBanner !== false,
    bannerDescription: sale.bannerDescription ?? "",
    displayPromoCode: sale.displayPromoCode ?? "",
    sendNotification: false,
  };
}

function validateForm(form: FlashSaleFormState): string | null {
  if (!form.title.trim()) return "Title is required.";
  const percent = Number(form.discountPercent);
  if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
    return "Percent off must be between 1 and 100.";
  }
  if (form.scope === "PRODUCT" && !form.productId) {
    return "Select a product.";
  }
  if (form.scope === "DURATION" && !form.durationId) {
    return "Select a duration.";
  }
  if (form.startsAt && form.expiresAt && form.startsAt > form.expiresAt) {
    return "Start date must be on or before end date.";
  }
  return null;
}

function formPayload(form: FlashSaleFormState) {
  return {
    title: form.title.trim(),
    discountPercent: Number(form.discountPercent) || 0,
    scope: form.scope,
    targetRole: form.targetRole,
    productId: form.scope === "PRODUCT" ? form.productId || null : null,
    durationId: form.scope === "DURATION" ? form.durationId || null : null,
    active: form.active,
    showBanner: form.showBanner,
    bannerDescription: form.bannerDescription.trim() || null,
    displayPromoCode: form.displayPromoCode.trim() || null,
    startsAt: localDateTimeToIso(form.startsAt),
    expiresAt: localDateTimeToIso(form.expiresAt),
    sendNotification: form.sendNotification,
  };
}

export function FlashSalesWorkspace() {
  const { data, loading, reload } = useAdminFetch<{ sales: Sale[] }>(
    "/api/admin/flash-sales",
  );
  const { data: productsData } = useAdminFetch<AdminProduct[]>(
    "/api/admin/products",
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [form, setForm] = useState<FlashSaleFormState>(emptyFlashSaleForm);
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const products: FlashSaleProductOption[] = useMemo(
    () =>
      (productsData ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        durations: (p.durations ?? []).map((d) => ({
          id: d.id,
          label: d.label,
        })),
      })),
    [productsData],
  );

  const productTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) map.set(p.id, p.title);
    return map;
  }, [products]);

  const durationLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      for (const d of p.durations) {
        map.set(d.id, `${p.title} · ${d.label}`);
      }
    }
    return map;
  }, [products]);

  const sales = data?.sales ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sales.filter((s) => {
      if (statusFilter === "active" && !s.active) return false;
      if (statusFilter === "off" && s.active) return false;
      if (!q) return true;
      return s.title.toLowerCase().includes(q);
    });
  }, [sales, query, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyFlashSaleForm);
    setOpen(true);
  }

  function openEdit(sale: Sale) {
    setEditing(sale);
    setForm(saleToForm(sale));
    setOpen(true);
  }

  async function save() {
    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }
    setPending(true);
    const payload = formPayload(form);
    const result = editing
      ? await adminMutate(`/api/admin/flash-sales/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await adminMutate("/api/admin/flash-sales", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const notified =
      typeof result.data === "object" &&
      result.data &&
      "notified" in result.data
        ? Number((result.data as { notified?: number }).notified ?? 0)
        : 0;
    toast.success(
      editing
        ? notified > 0
          ? `Flash sale updated · notified ${notified}`
          : "Flash sale updated"
        : notified > 0
          ? `Flash sale created · notified ${notified}`
          : "Flash sale created",
    );
    setOpen(false);
    setEditing(null);
    setForm(emptyFlashSaleForm);
    void reload();
  }

  async function remove() {
    if (!editing) return;
    if (!window.confirm(`Delete flash sale “${editing.title}”?`)) return;
    setPending(true);
    const result = await adminMutate(`/api/admin/flash-sales/${editing.id}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Flash sale deleted");
    setOpen(false);
    setEditing(null);
    setForm(emptyFlashSaleForm);
    void reload();
  }

  return (
    <main className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          title="Flash Sale"
          description="Timed discounts — store, product, or duration"
        />
        <Button size="sm" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Add sale
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sales…"
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
              onClick={() => setStatusFilter(chip.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === chip.id
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <AdminListSkeleton />
      ) : !filtered.length ? (
        <AdminEmptyState
          message={
            sales.length
              ? "No flash sales match your filters."
              : "No flash sales yet. Add one to start."
          }
        />
      ) : (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {filtered.map((sale) => {
            const scopeDetail =
              sale.scope === "PRODUCT"
                ? productTitleById.get(sale.productId ?? "") ?? "Product"
                : sale.scope === "DURATION"
                  ? durationLabelById.get(sale.durationId ?? "") ?? "Duration"
                  : flashScopeLabel(sale.scope);
            return (
              <li key={sale.id}>
                <button
                  type="button"
                  onClick={() => openEdit(sale)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Flame className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">
                        {sale.title}
                      </p>
                      <Badge variant={sale.active ? "secondary" : "outline"}>
                        {sale.active ? "Active" : "Off"}
                      </Badge>
                      {sale.active && sale.showBanner !== false ? (
                        <Badge variant="outline">Banner</Badge>
                      ) : null}
                      <Badge variant="outline">
                        {flashScopeLabel(sale.scope)}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {sale.discountPercent}% off ·{" "}
                      {flashAudienceLabel(sale.targetRole)} · {scopeDetail}
                      {sale.expiresAt
                        ? ` · ends ${flashDateTimeLabel(sale.expiresAt)}`
                        : ""}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AdminFlashSaleDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditing(null);
            setForm(emptyFlashSaleForm);
          }
        }}
        mode={editing ? "edit" : "create"}
        form={form}
        onFormChange={setForm}
        products={products}
        pending={pending}
        onSubmit={() => void save()}
        onDelete={editing ? () => void remove() : undefined}
      />
    </main>
  );
}
