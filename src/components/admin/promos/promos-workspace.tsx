"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import {
  AdminPromoDialog,
  emptyPromoForm,
  type PromoFormState,
  type PromoProductOption,
} from "@/components/admin/promos/admin-promo-dialog";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  microcentsToUsd,
} from "@/lib/currencies";
import {
  flashDateTimeInput,
  flashDateTimeLabel,
  localDateTimeToIso,
} from "@/lib/flash-sale-format";
import { promoAudienceLabel, promoDiscountSummary } from "@/lib/promo-calc";
import { cn } from "@/lib/utils";
import { ChevronRight, Plus, Search, TicketPercent } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Promo = {
  id: string;
  code: string;
  description: string | null;
  discountPercent: number;
  discountAmount: number;
  scope: "GLOBAL" | "PRODUCT" | "DURATION";
  targetRole: "ALL" | "USER" | "SELLER";
  productId: string | null;
  durationId: string | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  active: boolean;
  showBanner: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  _count: { redemptions: number };
};

type AdminProduct = {
  id: string;
  title: string;
  durations: { id: string; label: string }[];
};

type StatusFilter = "all" | "active" | "off";

function promoToForm(promo: Promo): PromoFormState {
  const isFlat = promo.discountAmount > 0 && !(promo.discountPercent > 0);
  return {
    code: promo.code,
    startsAt: flashDateTimeInput(promo.startsAt),
    expiresAt: flashDateTimeInput(promo.expiresAt),
    targetRole: promo.targetRole,
    perUserLimit: String(promo.perUserLimit || 1),
    discountKind: isFlat ? "flat" : "percent",
    discountValue: isFlat
      ? String(microcentsToUsd(promo.discountAmount))
      : String(promo.discountPercent || 0),
    scope: promo.scope,
    productId: promo.productId ?? "",
    durationId: promo.durationId ?? "",
    maxRedemptions:
      promo.maxRedemptions != null ? String(promo.maxRedemptions) : "",
    active: promo.active,
    showBanner: promo.showBanner === true,
    description: promo.description ?? "",
    sendNotification: false,
  };
}

function validateForm(form: PromoFormState): string | null {
  if (!form.code.trim()) return "Promo code is required.";
  const perUser = Number.parseInt(form.perUserLimit, 10);
  if (!Number.isFinite(perUser) || perUser < 1) {
    return "Per user uses must be at least 1.";
  }
  const value = Number(form.discountValue);
  if (!Number.isFinite(value) || value <= 0) {
    return form.discountKind === "percent"
      ? "Enter a percent off greater than 0."
      : "Enter a flat USD amount greater than 0.";
  }
  if (form.discountKind === "percent" && value > 100) {
    return "Percent off cannot exceed 100.";
  }
  if (form.scope === "PRODUCT" && !form.productId) {
    return "Select a product.";
  }
  if (form.scope === "DURATION" && !form.durationId) {
    return "Select a duration.";
  }
  if (form.maxRedemptions.trim()) {
    const total = Number.parseInt(form.maxRedemptions, 10);
    if (!Number.isFinite(total) || total < 1) {
      return "Total uses must be blank or at least 1.";
    }
  }
  if (form.startsAt && form.expiresAt && form.startsAt > form.expiresAt) {
    return "Start must be before end.";
  }
  return null;
}

function formPayload(form: PromoFormState) {
  const perUserLimit = Number.parseInt(form.perUserLimit, 10) || 1;
  const discountValue = Number(form.discountValue) || 0;
  const maxRedemptions = form.maxRedemptions.trim()
    ? Number.parseInt(form.maxRedemptions, 10)
    : null;

  return {
    code: form.code.trim(),
    description: form.description.trim() || null,
    discountPercent: form.discountKind === "percent" ? discountValue : 0,
    discountAmount: form.discountKind === "flat" ? discountValue : 0,
    scope: form.scope,
    targetRole: form.targetRole,
    productId: form.scope === "PRODUCT" ? form.productId || null : null,
    durationId: form.scope === "DURATION" ? form.durationId || null : null,
    maxRedemptions:
      maxRedemptions != null && Number.isFinite(maxRedemptions)
        ? maxRedemptions
        : null,
    perUserLimit,
    active: form.active,
    showBanner: form.showBanner,
    startsAt: localDateTimeToIso(form.startsAt),
    expiresAt: localDateTimeToIso(form.expiresAt),
    sendNotification: form.sendNotification,
  };
}

export function PromosWorkspace() {
  const { data, loading, reload } = useAdminFetch<{ promos: Promo[] }>(
    "/api/admin/promos",
  );
  const { data: productsData } = useAdminFetch<AdminProduct[]>(
    "/api/admin/products",
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);
  const [form, setForm] = useState<PromoFormState>(emptyPromoForm);
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const products: PromoProductOption[] = useMemo(
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

  const promos = data?.promos ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return promos.filter((p) => {
      if (statusFilter === "active" && !p.active) return false;
      if (statusFilter === "off" && p.active) return false;
      if (!q) return true;
      return (
        p.code.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [promos, query, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyPromoForm);
    setOpen(true);
  }

  function openEdit(promo: Promo) {
    setEditing(promo);
    setForm(promoToForm(promo));
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
      ? await adminMutate(`/api/admin/promos/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await adminMutate("/api/admin/promos", {
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
          ? `Promo updated · notified ${notified}`
          : "Promo updated"
        : notified > 0
          ? `Promo created · notified ${notified}`
          : "Promo created",
    );
    setOpen(false);
    setEditing(null);
    setForm(emptyPromoForm);
    void reload();
  }

  async function remove() {
    if (!editing) return;
    if (!window.confirm(`Delete promo “${editing.code}”?`)) return;
    setPending(true);
    const result = await adminMutate(`/api/admin/promos/${editing.id}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Promo deleted");
    setOpen(false);
    setEditing(null);
    setForm(emptyPromoForm);
    void reload();
  }

  return (
    <main className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          title="Promos"
          description="Discount codes for checkout"
        />
        <Button size="sm" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Add promo
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search codes…"
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
            promos.length
              ? "No promos match your filters."
              : "No promo codes yet. Add one to start."
          }
        />
      ) : (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {filtered.map((promo) => {
            const scopeLabel =
              promo.scope === "PRODUCT"
                ? productTitleById.get(promo.productId ?? "") ?? "Product"
                : promo.scope === "DURATION"
                  ? durationLabelById.get(promo.durationId ?? "") ?? "Duration"
                  : "Global";
            return (
              <li key={promo.id}>
                <button
                  type="button"
                  onClick={() => openEdit(promo)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <TicketPercent className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold tracking-wide">
                        {promo.code}
                      </p>
                      <Badge variant={promo.active ? "secondary" : "outline"}>
                        {promo.active ? "Active" : "Off"}
                      </Badge>
                      {promo.active && promo.showBanner ? (
                        <Badge variant="outline">Banner</Badge>
                      ) : null}
                      <Badge variant="outline">{promo.scope}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {promoDiscountSummary(promo)} ·{" "}
                      {promoAudienceLabel(promo.targetRole)} · {scopeLabel} ·{" "}
                      {promo._count.redemptions}
                      {promo.maxRedemptions != null
                        ? `/${promo.maxRedemptions}`
                        : ""}{" "}
                      uses
                      {promo.expiresAt
                        ? ` · ends ${flashDateTimeLabel(promo.expiresAt)}`
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

      <AdminPromoDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditing(null);
            setForm(emptyPromoForm);
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
