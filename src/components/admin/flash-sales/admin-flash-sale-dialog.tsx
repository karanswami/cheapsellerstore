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
import { cn } from "@/lib/utils";
import { Bell, Flame, Megaphone, X } from "lucide-react";

export type FlashSaleScope = "GLOBAL" | "PRODUCT" | "DURATION";
export type FlashSaleAudience = "ALL" | "USER" | "SELLER";

export type FlashSaleFormState = {
  title: string;
  discountPercent: string;
  scope: FlashSaleScope;
  targetRole: FlashSaleAudience;
  productId: string;
  durationId: string;
  startsAt: string;
  expiresAt: string;
  active: boolean;
  showBanner: boolean;
  bannerDescription: string;
  displayPromoCode: string;
  sendNotification: boolean;
};

export type FlashSaleProductOption = {
  id: string;
  title: string;
  durations: { id: string; label: string }[];
};

export const emptyFlashSaleForm: FlashSaleFormState = {
  title: "",
  discountPercent: "15",
  scope: "GLOBAL",
  targetRole: "ALL",
  productId: "",
  durationId: "",
  startsAt: "",
  expiresAt: "",
  active: true,
  showBanner: true,
  bannerDescription: "",
  displayPromoCode: "",
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

export function AdminFlashSaleDialog({
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
  form: FlashSaleFormState;
  onFormChange: (next: FlashSaleFormState) => void;
  products: FlashSaleProductOption[];
  pending: boolean;
  onSubmit: () => void;
  onDelete?: () => void;
}) {
  function patch<K extends keyof FlashSaleFormState>(
    key: K,
    value: FlashSaleFormState[K],
  ) {
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
              <Flame className="size-5" />
            </div>
            <DialogTitle className="text-lg">
              {mode === "create" ? "Add flash sale" : "Edit flash sale"}
            </DialogTitle>
            <DialogDescription>
              Timed percent off for the whole store, one product, or one duration.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="fs-title"
              className="text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Title
            </Label>
            <Input
              id="fs-title"
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="Weekend flash"
              className="h-10 font-medium"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="fs-pct"
              className="text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Percent off
            </Label>
            <Input
              id="fs-pct"
              type="number"
              min={1}
              max={100}
              step={1}
              value={form.discountPercent}
              onChange={(e) => patch("discountPercent", e.target.value)}
              className="h-10 tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Audience
            </Label>
            <Select
              value={form.targetRole}
              onValueChange={(v) => patch("targetRole", v as FlashSaleAudience)}
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
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Where sale applies
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
                { value: "GLOBAL", label: "Store" },
                { value: "PRODUCT", label: "Product" },
                { value: "DURATION", label: "Duration" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Store = every product · Product = all durations of one product ·
              Duration = a single price tier.
            </p>
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

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="fs-starts"
                className="text-[11px] tracking-wide text-muted-foreground uppercase"
              >
                Starts (date + time)
              </Label>
              <div className="relative">
                <Input
                  id="fs-starts"
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
                htmlFor="fs-expires"
                className="text-[11px] tracking-wide text-muted-foreground uppercase"
              >
                Ends (date + time)
              </Label>
              <div className="relative">
                <Input
                  id="fs-expires"
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
            Set exact start and end with hours and minutes. Leave blank for an
            open window. Sale applies only while active and in range.
          </p>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Active sale
              </p>
              <p className="text-xs text-muted-foreground">
                When on, eligible carts get the discount.
              </p>
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
                  Show the special-offer card on Home while this sale is live.
                  Turn off to hide the banner without ending the discount.
                </p>
              </div>
            </div>
            <Switch
              checked={form.showBanner}
              onCheckedChange={(checked) => patch("showBanner", checked)}
            />
          </div>

          {form.showBanner ? (
            <>
              <div className="space-y-1.5">
                <Label
                  htmlFor="fs-banner-desc"
                  className="text-[11px] tracking-wide text-muted-foreground uppercase"
                >
                  Banner description
                </Label>
                <Input
                  id="fs-banner-desc"
                  value={form.bannerDescription}
                  onChange={(e) => patch("bannerDescription", e.target.value)}
                  placeholder="Grab premium products before time runs out"
                  className="h-10"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="fs-promo-code"
                  className="text-[11px] tracking-wide text-muted-foreground uppercase"
                >
                  Display promo code (optional)
                </Label>
                <Input
                  id="fs-promo-code"
                  value={form.displayPromoCode}
                  onChange={(e) =>
                    patch("displayPromoCode", e.target.value.toUpperCase())
                  }
                  placeholder="DRIP40"
                  className="h-10 font-mono tracking-wide uppercase"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Shown for copy only — create a matching Promo if shoppers
                  should redeem it at checkout.
                </p>
              </div>
            </>
          ) : null}

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
                  Only sends when the sale is active. Keep off for silent edits.
                </p>
              </div>
            </div>
            <Switch
              checked={form.sendNotification}
              onCheckedChange={(checked) =>
                patch("sendNotification", checked)
              }
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
            {pending ? "Saving…" : "Save sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
