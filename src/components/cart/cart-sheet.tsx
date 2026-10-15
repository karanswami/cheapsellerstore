"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { formatMoney, Currency } from "@/lib/currencies";
import { FlashSaleTicker } from "@/components/catalog/flash-sale-ticker";
import { toast } from "@/lib/toast";
import {
  Check,
  Flame,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from "lucide-react";

export function CartSheet() {
  const {
    items,
    isOpen,
    closeCart,
    openCart,
    itemCount,
    subtotal,
    discount,
    total,
    promo,
    promoError,
    applyPromo,
    clearPromo,
    updateQuantity,
    removeItem,
    hydrated,
    stockByDuration,
    stockReady,
    stockOk,
    refreshStock,
  } = useCart();
  const router = useRouter();

  const [promoInput, setPromoInput] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoPending, setPromoPending] = useState(false);

  const displayCurrency = items[0]?.currency ?? Currency.USD;

  async function handleApplyPromo() {
    setPromoPending(true);
    try {
      const ok = await applyPromo(promoInput);
      if (ok) {
        setPromoInput("");
        setPromoOpen(false);
      }
    } finally {
      setPromoPending(false);
    }
  }

  async function goCheckout() {
    const ok = await refreshStock();
    if (!ok) {
      toast.error("Some items are out of stock", {
        description: "Update quantities or remove sold-out lines first.",
      });
      return;
    }
    closeCart();
    router.push("/checkout");
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openCart() : closeCart())}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-border/40 bg-card p-0 pb-[env(safe-area-inset-bottom)] sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-border/40 bg-muted/30 pr-12">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <ShoppingBag className="size-4 text-muted-foreground" />
            Cart
            {hydrated && itemCount > 0 && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {itemCount}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Review cart items, apply a promo code, and checkout.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
            {!hydrated ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <ShoppingBag className="size-5 text-muted-foreground" />
                </span>
                <p className="text-sm font-medium">Your cart is empty</p>
                <p className="text-xs text-muted-foreground">
                  Browse the store and add a license to get started.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    closeCart();
                    router.push("/app");
                  }}
                >
                  Browse store
                </Button>
              </div>
            ) : (
              items.map((item) => {
                const onSale =
                  item.flashPercent != null &&
                  item.flashPercent > 0 &&
                  item.listPrice != null &&
                  item.listPrice > item.unitPrice;
                return (
                  <div
                    key={item.durationId}
                    className="overflow-hidden rounded-xl bg-muted/30 ring-1 ring-foreground/8"
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
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium leading-tight">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.durationLabel}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
                            {onSale ? (
                              <span className="text-xs tabular-nums text-muted-foreground line-through">
                                {formatMoney(item.listPrice!, item.currency)}
                              </span>
                            ) : null}
                            <p className="text-sm font-semibold tabular-nums text-success">
                              {formatMoney(item.unitPrice, item.currency)}
                            </p>
                            {onSale ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                                <Flame className="size-2.5" />
                                −{item.flashPercent}%
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove item"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.durationId)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Decrease quantity"
                            onClick={() =>
                              updateQuantity(item.durationId, item.quantity - 1)
                            }
                          >
                            <Minus />
                          </Button>
                          <span className="min-w-7 text-center text-sm font-medium tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Increase quantity"
                            disabled={
                              Boolean(item.requiresAndroidId) ||
                              (stockReady &&
                                (stockByDuration?.[item.durationId] ?? 0) <=
                                  item.quantity)
                            }
                            onClick={() =>
                              updateQuantity(item.durationId, item.quantity + 1)
                            }
                          >
                            <Plus />
                          </Button>
                        </div>
                        {item.requiresAndroidId ? (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-md px-1.5 py-0.5">
                            Max 1 per checkout
                          </span>
                        ) : null}
                        <p className="ml-auto text-xs text-muted-foreground tabular-nums">
                          {formatMoney(
                            item.unitPrice * item.quantity,
                            item.currency,
                          )}
                        </p>
                      </div>
                      {stockReady &&
                      (stockByDuration?.[item.durationId] ?? 0) <
                        item.quantity ? (
                        <p className="mt-2 text-xs text-destructive">
                          Not enough stock
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {hydrated && items.length > 0 && (
            <div className="shrink-0 space-y-3 border-t border-border bg-card px-4 pt-4 pb-4">
              <div className="rounded-xl border border-border p-3">
                <button
                  type="button"
                  onClick={() => setPromoOpen((v) => !v)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <Tag className="size-3.5 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">
                    {promo ? "Promo applied" : "Have a promo code?"}
                  </span>
                  {promo ? (
                    <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-xs font-medium text-success">
                      {promo.code}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {promoOpen ? "Hide" : "Add"}
                    </span>
                  )}
                </button>

                {promo && (
                  <div className="mt-2.5 flex items-center justify-between gap-2 rounded-md border border-success/25 bg-success/10 px-2.5 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Check className="size-3.5 shrink-0 text-success" />
                      <p className="truncate text-xs">
                        <span className="font-semibold text-success">
                          {promo.code}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {promo.label}
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove promo"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={clearPromo}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}

                {!promo && promoOpen && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleApplyPromo();
                          }
                        }}
                        placeholder="Enter code"
                        aria-label="Promo code"
                        disabled={promoPending}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleApplyPromo()}
                        disabled={!promoInput.trim() || promoPending}
                      >
                        {promoPending ? "…" : "Apply"}
                      </Button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-destructive" role="alert">
                        {promoError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-sm">
                {(() => {
                  const flashSaved = items.reduce((sum, item) => {
                    if (
                      item.listPrice != null &&
                      item.listPrice > item.unitPrice
                    ) {
                      return (
                        sum +
                        (item.listPrice - item.unitPrice) * item.quantity
                      );
                    }
                    return sum;
                  }, 0);
                  return flashSaved > 0 ? (
                    <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="size-3.5" />
                        Flash sale
                      </span>
                      <span className="tabular-nums">
                        −{formatMoney(flashSaved, displayCurrency)}
                      </span>
                    </div>
                  ) : null;
                })()}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">
                    {formatMoney(subtotal, displayCurrency)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-success">
                    <span>
                      Discount
                      {promo?.percentOff
                        ? ` (${promo.percentOff}%)`
                        : promo?.code
                          ? ` (${promo.code})`
                          : ""}
                      {promo?.maxUnits != null && promo.maxUnits > 0
                        ? ` · ${promo.maxUnits} item${promo.maxUnits === 1 ? "" : "s"}`
                        : ""}
                    </span>
                    <span className="tabular-nums">
                      −{formatMoney(discount, displayCurrency)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums text-success">
                    {formatMoney(total, displayCurrency)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                type="button"
                disabled={!stockOk}
                onClick={() => void goCheckout()}
              >
                {!stockReady
                  ? "Checking stock…"
                  : stockOk
                    ? "Checkout"
                    : "Out of stock"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
