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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bell, Megaphone, TicketPercent, X } from "lucide-react";

export type DiscountKind = "percent" | "flat";
export type PromoScope = "GLOBAL" | "PRODUCT" | "DURATION";
export type PromoAudience = "ALL" | "USER" | "SELLER";

export type PromoFormState = {
  code: string;
  startsAt: string;
  expiresAt: string;
  targetRole: PromoAudience;
  perUserLimit: string;
  discountKind: DiscountKind;
  discountValue: string;
  scope: PromoScope;
  productId: string;
  durationId: string;
  maxRedemptions: string;
  active: boolean;
  showBanner: boolean;
  description: string;
  sendNotification: boolean;
};

export type PromoProductOption = {
  id: string;
  title: string;
  durations: { id: string; label: string }[];
};

export const emptyPromoForm: PromoFormState = {
  code: "",
  startsAt: "",
  expiresAt: "",
  targetRole: "ALL",
  perUserLimit: "1",
  discountKind: "percent",
  discountValue: "10",
  scope: "GLOBAL",
  productId: "",
  durationId: "",
  maxRedemptions: "",
  active: true,
  showBanner: false,
  description: "",
  sendNotification: false,
};

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      className="grid gap-1 rounded-lg border border-border bg-muted/50 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-2 py-2 text-xs font-semibold transition-colors sm:text-sm",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function AdminPromoDialog({
  open,
  onOpenChange,
  mode,
  form,
  onFormChange,
  products,
  pending,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  form: PromoFormState;
  onFormChange: (next: PromoFormState) => void;
  products: PromoProductOption[];
  pending: boolean;
  onSubmit: () => void;
  onDelete?: () => void;
}) {
  function patch<K extends keyof PromoFormState>(key: K, value: PromoFormState[K]) {
    onFormChange({ ...form, [key]: value });
  }

  const scopedDurations =
    form.scope === "DURATION"
      ? products.flatMap((p) =>
          p.durations.map((d) => ({
            id: d.id,
            label: `${p.title} · ${d.label}`,
            productId: p.id,
          })),
        )
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <TicketPercent className="size-5" />
            </div>
            <DialogTitle className="text-lg">
              {mode === "create" ? "Add promo" : "Edit promo"}
            </DialogTitle>
            <DialogDescription>
              Use Shadcn form controls with validation before save.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="promo-code" className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Promo code
            </Label>
            <Input
              id="promo-code"
              value={form.code}
              onChange={(e) => patch("code", e.target.value.toUpperCase())}
              placeholder="FLASH20"
              className="h-10 font-medium tracking-wide"
              autoComplete="off"
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="promo-starts"
                className="text-[11px] tracking-wide text-muted-foreground uppercase"
              >
                Starts (date + time)
              </Label>
              <div className="relative">
                <Input
                  id="promo-starts"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => patch("startsAt", e.target.value)}
                  className="h-10 pr-9"
                />
                {form.startsAt ? (
                  <button
                    type="button"
                    aria-label="Clear start"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => patch("startsAt", "")}
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="promo-expires"
                className="text-[11px] tracking-wide text-muted-foreground uppercase"
              >
                Ends (date + time)
              </Label>
              <div className="relative">
                <Input
                  id="promo-expires"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => patch("expiresAt", e.target.value)}
                  className="h-10 pr-9"
                />
                {form.expiresAt ? (
                  <button
                    type="button"
                    aria-label="Clear end"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => patch("expiresAt", "")}
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Times use your local timezone. Leave blank for an open window.
            Promo applies only while active and in range.
          </p>

          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Audience
            </Label>
            <Select
              value={form.targetRole}
              onValueChange={(v) => patch("targetRole", v as PromoAudience)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All users</SelectItem>
                <SelectItem value="USER">Users only</SelectItem>
                <SelectItem value="SELLER">Sellers and resellers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="promo-per-user" className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Per user uses
            </Label>
            <Input
              id="promo-per-user"
              type="number"
              min={1}
              value={form.perUserLimit}
              onChange={(e) => patch("perUserLimit", e.target.value)}
              className="h-10 tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              How many times a user can redeem — also caps discountable units
              (e.g. 1 = discount on one item only, even if quantity is higher).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Discount type
            </Label>
            <Segmented
              value={form.discountKind}
              onChange={(kind) =>
                onFormChange({
                  ...form,
                  discountKind: kind,
                  discountValue: kind === "percent" ? "10" : "1",
                })
              }
              options={[
                { value: "percent", label: "Percent %" },
                { value: "flat", label: "Flat USD" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Checkout still validates final discount safely on backend.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="promo-discount" className="text-[11px] tracking-wide text-muted-foreground uppercase">
              {form.discountKind === "percent" ? "Percent off" : "Flat off USD"}
            </Label>
            <Input
              id="promo-discount"
              type="number"
              min={form.discountKind === "percent" ? 1 : 0.01}
              max={form.discountKind === "percent" ? 100 : undefined}
              step={form.discountKind === "percent" ? 1 : 0.01}
              value={form.discountValue}
              onChange={(e) => patch("discountValue", e.target.value)}
              className="h-10 tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Where promo works
            </Label>
            <Segmented
              value={form.scope}
              onChange={(scope) =>
                onFormChange({
                  ...form,
                  scope,
                  productId: scope === "GLOBAL" ? "" : form.productId,
                  durationId: scope === "DURATION" ? form.durationId : "",
                })
              }
              options={[
                { value: "GLOBAL", label: "Global" },
                { value: "PRODUCT", label: "Product" },
                { value: "DURATION", label: "Duration" },
              ]}
            />
          </div>

          {form.scope === "PRODUCT" ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Product
              </Label>
              <Select
                value={form.productId || undefined}
                onValueChange={(v) => patch("productId", v)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {form.scope === "DURATION" ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Duration
              </Label>
              <Select
                value={form.durationId || undefined}
                onValueChange={(v) => {
                  const match = scopedDurations.find((d) => d.id === v);
                  onFormChange({
                    ...form,
                    durationId: v,
                    productId: match?.productId ?? form.productId,
                  });
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {scopedDurations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="promo-total" className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Total uses
            </Label>
            <Input
              id="promo-total"
              type="number"
              min={1}
              value={form.maxRedemptions}
              onChange={(e) => patch("maxRedemptions", e.target.value)}
              placeholder="Blank = unlimited"
              className="h-10 tabular-nums"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Active promo
              </p>
              <p className="text-xs text-muted-foreground">Promo can be used.</p>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(checked) => patch("active", checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-3">
            <div className="flex min-w-0 gap-2.5">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Megaphone className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Storefront banner
                </p>
                <p className="text-xs text-muted-foreground">
                  Show this promo as a special-offer card on Home. Flash sales
                  with banner on take priority.
                </p>
              </div>
            </div>
            <Switch
              checked={form.showBanner}
              onCheckedChange={(checked) => patch("showBanner", checked)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="promo-desc" className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Description
            </Label>
            <Textarea
              id="promo-desc"
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              placeholder="Flash sale / reseller campaign"
              rows={3}
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3">
            <div className="flex min-w-0 gap-2.5">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Bell className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Send notification
                </p>
                <p className="text-xs text-muted-foreground">
                  Only sends when promo is active. Keep off for silent edits.
                </p>
              </div>
            </div>
            <Switch
              checked={form.sendNotification}
              onCheckedChange={(checked) => patch("sendNotification", checked)}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0">
          {mode === "edit" && onDelete ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive sm:mr-auto"
              disabled={pending}
              onClick={onDelete}
            >
              Delete
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={onSubmit}>
            {pending ? "Saving…" : "Save promo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
