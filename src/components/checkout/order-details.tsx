"use client";

import { FlashSaleTicker } from "@/components/catalog/flash-sale-ticker";
import { Badge } from "@/components/ui/badge";
import { formatMoney, type Currency } from "@/lib/currencies";
import type { CartItem } from "@/types/cart";
import { Flame, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrderItemsProps = {
  items: CartItem[];
  updateAndroidId?: (durationId: string, androidId: string) => void;
};

function ItemThumb({ item }: { item: CartItem }) {
  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.imageUrl}
        alt=""
        className="size-12 rounded-lg object-cover sm:size-14"
      />
    );
  }

  const initial = item.title.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex size-12 items-center justify-center rounded-lg bg-muted sm:size-14">
      <span className="text-sm font-semibold text-muted-foreground">
        {initial}
      </span>
    </div>
  );
}

export function CheckoutOrderItems({ items, updateAndroidId }: OrderItemsProps) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const onSale =
          item.flashPercent != null &&
          item.flashPercent > 0 &&
          item.listPrice != null &&
          item.listPrice > item.unitPrice;

        return (
          <li
            key={item.durationId}
            className="overflow-hidden rounded-lg bg-muted/40 ring-1 ring-foreground/5"
          >
            {onSale && item.flashTitle ? (
              <FlashSaleTicker
                sale={{
                  id: item.durationId,
                  title: item.flashTitle,
                  discountPercent: item.flashPercent!,
                  scope: "DURATION",
                  startsAt: null,
                  expiresAt: item.flashEndsAt ?? null,
                }}
                compact
              />
            ) : null}
            <div className="flex gap-3 p-3">
              <ItemThumb item={item} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-sm font-medium leading-tight">
                      {item.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{item.durationLabel}</Badge>
                      <Badge variant="secondary">×{item.quantity}</Badge>
                      {onSale ? (
                        <Badge className="border-0 bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-orange-700 dark:text-orange-300">
                          <Flame data-icon="inline-start" className="size-3" />
                          −{item.flashPercent}%
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {onSale ? (
                      <p className="text-xs tabular-nums text-muted-foreground line-through">
                        {formatMoney(
                          item.listPrice! * item.quantity,
                          item.currency,
                        )}
                      </p>
                    ) : null}
                    <p className="text-sm font-semibold tabular-nums text-success">
                      {formatMoney(
                        item.unitPrice * item.quantity,
                        item.currency,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {item.requiresAndroidId ? (
              <div className="border-t border-amber-500/20 bg-amber-500/5 p-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                      <Smartphone className="size-3" />
                      Submitted {(item.deviceIdName || "").trim() || "Android ID"}
                    </Label>
                    {item.androidId?.trim() ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                        ✓ Provided
                      </span>
                    ) : (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        * Required
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder={`Enter ${(item.deviceIdName || "").trim() || "Android ID"}`}
                    value={item.androidId || ""}
                    onChange={(e) => updateAndroidId?.(item.durationId, e.target.value)}
                    className="h-8.5 border-amber-500/30 bg-background/90 font-mono text-xs focus-visible:ring-amber-500"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Device-bound license key will be minted to this {(item.deviceIdName || "").trim() || "Android ID"} upon purchase.
                  </p>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

type TotalsProps = {
  subtotal: number;
  discount: number;
  total: number;
  currency: Currency;
  promoCode?: string | null;
  flashSaved?: number;
};

export function CheckoutTotals({
  subtotal,
  discount,
  total,
  currency,
  promoCode,
  flashSaved = 0,
}: TotalsProps) {
  return (
    <div className="space-y-2 text-sm">
      {flashSaved > 0 ? (
        <div className="flex justify-between text-orange-600 dark:text-orange-400">
          <span className="inline-flex items-center gap-1.5">
            <Flame className="size-3.5" />
            Flash sale
          </span>
          <span className="tabular-nums">
            −{formatMoney(flashSaved, currency)}
          </span>
        </div>
      ) : null}
      <div className="flex justify-between text-muted-foreground">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-success">
          <span className="inline-flex items-center gap-1.5">
            Promo
            {promoCode ? (
              <Badge variant="outline" className="font-normal">
                {promoCode}
              </Badge>
            ) : null}
          </span>
          <span className="tabular-nums">
            −{formatMoney(discount, currency)}
          </span>
        </div>
      )}
      <div className="flex justify-between pt-1 text-base font-semibold">
        <span>Total</span>
        <span className="tabular-nums text-success">
          {formatMoney(total, currency)}
        </span>
      </div>
    </div>
  );
}
