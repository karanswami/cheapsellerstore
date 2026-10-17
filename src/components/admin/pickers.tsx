"use client";

import { Field, useAdminQuery } from "@/components/admin/kit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Scope = "GLOBAL" | "PRODUCT" | "DURATION";
export type Audience = "ALL" | "USER" | "SELLER";
type CatalogProduct = { id: string; title: string; durations: { id: string; label: string }[] };

/** Product/duration catalog for scope pickers (shared by promos, flash sales…). */
export function useCatalog() {
  return useAdminQuery<CatalogProduct[]>("/api/admin/products").data ?? [];
}

export function ScopeFields({
  scope,
  productId,
  durationId,
  onChange,
}: {
  scope: Scope;
  productId: string;
  durationId: string;
  onChange: (v: { scope: Scope; productId: string; durationId: string }) => void;
}) {
  const catalog = useCatalog();
  const product = catalog.find((p) => p.id === productId);
  const durationProduct = durationId ? catalog.find((p) => p.durations.some((d) => d.id === durationId)) : undefined;
  const pickedProductId = scope === "DURATION" ? (productId || durationProduct?.id || "") : productId;
  const pickedProduct = catalog.find((p) => p.id === pickedProductId) ?? product;

  return (
    <div className="grid gap-4">
      <Field label="Applies to">
        <Select value={scope} onValueChange={(v) => onChange({ scope: v as Scope, productId, durationId })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GLOBAL">Everything</SelectItem>
            <SelectItem value="PRODUCT">One product</SelectItem>
            <SelectItem value="DURATION">One duration</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {scope !== "GLOBAL" ? (
        <Field label="Product">
          <Select value={pickedProductId} onValueChange={(v) => onChange({ scope, productId: v, durationId: "" })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a product" />
            </SelectTrigger>
            <SelectContent>
              {catalog.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {scope === "DURATION" ? (
        <Field label="Duration">
          <Select value={durationId} onValueChange={(v) => onChange({ scope, productId: pickedProductId, durationId: v })} disabled={!pickedProduct}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a duration" />
            </SelectTrigger>
            <SelectContent>
              {(pickedProduct?.durations ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
    </div>
  );
}

export function AudienceSelect({ value, onChange }: { value: Audience; onChange: (v: Audience) => void }) {
  return (
    <Field label="Audience">
      <Select value={value} onValueChange={(v) => onChange(v as Audience)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Everyone</SelectItem>
          <SelectItem value="USER">Users only</SelectItem>
          <SelectItem value="SELLER">Sellers & resellers</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}
