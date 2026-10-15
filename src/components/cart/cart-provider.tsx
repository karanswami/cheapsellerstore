"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  calcCartPromoDiscount,
  PROMO_STORAGE_KEY,
  type AppliedPromo,
} from "@/lib/promo-calc";
import { CART_STORAGE_KEY, type CartItem } from "@/types/cart";
import { toast } from "@/lib/toast";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number;
  promo: AppliedPromo | null;
  promoError: string | null;
  /** False until localStorage cart/promo have been read (avoids empty-cart flash). */
  hydrated: boolean;
  /** Live AVAILABLE stock by durationId (null until first quote). */
  stockByDuration: Record<string, number> | null;
  stockReady: boolean;
  /** True when every line has enough live stock. */
  stockOk: boolean;
  applyPromo: (code: string) => Promise<boolean>;
  clearPromo: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (
    item: Omit<CartItem, "quantity">,
    quantity?: number,
    options?: { directCheckout?: boolean },
  ) => void;
  removeItem: (durationId: string) => void;
  updateQuantity: (durationId: string, quantity: number) => void;
  updateAndroidId: (durationId: string, androidId: string) => void;
  clearCart: () => void;
  /** Re-quote live stock; returns whether every line still has enough. */
  refreshStock: () => Promise<boolean>;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row) =>
        row &&
        typeof row.durationId === "string" &&
        typeof row.unitPrice === "number" &&
        typeof row.currency === "string",
    );
  } catch {
    return [];
  }
}

function readStoredPromo(): AppliedPromo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppliedPromo;
    if (!parsed?.code || typeof parsed.percentOff !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function toPromoLines(items: CartItem[]) {
  return items.map((i) => ({
    productId: i.productId,
    durationId: i.durationId,
    unitPrice: i.unitPrice,
    quantity: i.quantity,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [stockByDuration, setStockByDuration] = useState<Record<
    string,
    number
  > | null>(null);
  const [stockReady, setStockReady] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setPromo(readStoredPromo());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (promo) {
      window.localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(promo));
    } else {
      window.localStorage.removeItem(PROMO_STORAGE_KEY);
    }
  }, [promo, hydrated]);

  const durationIdsKey = items.map((i) => i.durationId).sort().join(",");

  const refreshStock = useCallback(async () => {
    if (!durationIdsKey) {
      setStockByDuration({});
      setStockReady(true);
      return true;
    }
    try {
      const res = await fetch("/api/stock/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          durationIds: durationIdsKey.split(","),
        }),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as {
        data?: { lines: Array<{ durationId: string; available: number }> };
      };
      const lines = json.data?.lines;
      if (!lines) return false;
      const next: Record<string, number> = {};
      for (const line of lines) {
        next[line.durationId] = line.available;
      }
      setStockByDuration(next);
      setStockReady(true);

      let removedSoldOut = false;
      let cappedAny = false;
      let cappedTitle = "";
      let cappedAvailable = 0;
      let allOk = items.length > 0;

      for (const row of items) {
        const available = next[row.durationId] ?? 0;
        if (available <= 0) {
          removedSoldOut = true;
          allOk = false;
        } else if (row.quantity > available) {
          cappedAny = true;
          cappedTitle = row.title;
          cappedAvailable = available;
          allOk = false;
        }
      }

      if (removedSoldOut || cappedAny) {
        setItems((prev) => {
          const capped = prev
            .map((row) => {
              const available = next[row.durationId] ?? 0;
              if (available <= 0) return { ...row, quantity: 0 };
              if (row.quantity > available) {
                return { ...row, quantity: available };
              }
              return row;
            })
            .filter((row) => row.quantity > 0);
          return capped;
        });
      }

      if (removedSoldOut) {
        toast.error("Removed sold-out items from cart");
      } else if (cappedAny) {
        toast.message("Quantity updated", {
          description: `Only ${cappedAvailable} left for ${cappedTitle}.`,
        });
      }

      return allOk;
    } catch {
      return false;
    }
  }, [durationIdsKey, items]);

  /** Refresh unit prices from active flash sales (role-aware server quote). */
  useEffect(() => {
    if (!hydrated || !durationIdsKey) return;

    let cancelled = false;

    async function refreshFlash() {
      try {
        const res = await fetch("/api/flash-sales/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            items: durationIdsKey.split(",").map((durationId) => ({
              durationId,
              quantity: 1,
            })),
          }),
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          data?: {
            lines: Array<{
              durationId: string;
              found: boolean;
              unitPrice?: number | null;
              listPrice?: number | null;
              flashSale?: {
                title: string;
                discountPercent: number;
                expiresAt: string | null;
              } | null;
            }>;
          };
        };
        const lines = json.data?.lines;
        if (!lines || cancelled) return;

        setItems((prev) => {
          let changed = false;
          const next = prev.map((row) => {
            const line = lines.find((l) => l.durationId === row.durationId);
            if (!line?.found || line.unitPrice == null) return row;
            const flashTitle = line.flashSale?.title ?? null;
            const flashPercent = line.flashSale?.discountPercent ?? null;
            const flashEndsAt = line.flashSale?.expiresAt ?? null;
            const listPrice = line.flashSale ? (line.listPrice ?? null) : null;
            if (
              row.unitPrice === line.unitPrice &&
              (row.listPrice ?? null) === listPrice &&
              (row.flashPercent ?? null) === flashPercent &&
              (row.flashEndsAt ?? null) === flashEndsAt
            ) {
              return row;
            }
            changed = true;
            return {
              ...row,
              unitPrice: line.unitPrice,
              listPrice,
              flashTitle,
              flashPercent,
              flashEndsAt,
            };
          });
          return changed ? next : prev;
        });
      } catch {
        /* keep stored prices */
      }
    }

    void refreshFlash();
    return () => {
      cancelled = true;
    };
  }, [hydrated, isOpen, durationIdsKey]);

  // Live stock when cart has items / opens / tab focuses.
  useEffect(() => {
    if (!hydrated || !durationIdsKey) {
      setStockByDuration({});
      setStockReady(true);
      return;
    }

    void refreshStock();

    const onVisible = () => {
      if (!document.hidden) void refreshStock();
    };
    const id = window.setInterval(() => {
      if (!document.hidden && isOpen) void refreshStock();
    }, 5000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [hydrated, durationIdsKey, isOpen, refreshStock]);

  const addItem = useCallback(
    (
      item: Omit<CartItem, "quantity">,
      quantity = 1,
      options?: { directCheckout?: boolean },
    ) => {
      setItems((prev) => {
        if (item.requiresAndroidId) {
          // Device-bound Android ID items allow strictly 1 item per checkout
          return [
            {
              ...item,
              quantity: 1,
              androidId: item.androidId?.trim(),
            },
          ];
        }

        // Keep cart clean: filter out any leftover device-bound items
        const nonAndroid = prev.filter((r) => !r.requiresAndroidId);
        const existing = nonAndroid.find((row) => row.durationId === item.durationId);
        if (existing) {
          return nonAndroid.map((row) =>
            row.durationId === item.durationId
              ? {
                  ...row,
                  quantity: row.quantity + quantity,
                  ...(item.androidId ? { androidId: item.androidId.trim() } : {}),
                }
              : row,
          );
        }
        return [
          ...nonAndroid,
          {
            ...item,
            quantity,
            ...(item.androidId ? { androidId: item.androidId.trim() } : {}),
          },
        ];
      });
      if (options?.directCheckout) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
      setStockReady(false);
      toast.success(
        options?.directCheckout ? "Proceeding to checkout…" : "Added to cart",
        {
          description: `${item.title} · ${item.durationLabel}`,
        },
      );
    },
    [],
  );

  const removeItem = useCallback((durationId: string) => {
    setItems((prev) => {
      const removed = prev.find((row) => row.durationId === durationId);
      if (removed) {
        toast.message("Removed from cart", {
          description: removed.title,
        });
      }
      return prev.filter((row) => row.durationId !== durationId);
    });
  }, []);

  const updateQuantity = useCallback(
    (durationId: string, quantity: number) => {
      setItems((prev) =>
        prev
          .map((row) => {
            if (row.durationId !== durationId) return row;
            const stockMax =
              stockByDuration != null
                ? (stockByDuration[durationId] ?? 0)
                : Number.POSITIVE_INFINITY;
            const max = row.requiresAndroidId ? 1 : stockMax;
            const nextQty = Math.min(quantity, max);
            if (quantity > max && max >= 0) {
              toast.message("Quantity limit reached", {
                description: row.requiresAndroidId
                  ? "Device-bound items are limited to 1 per checkout."
                  : max <= 0
                    ? "This item is sold out."
                    : `Only ${max} available.`,
              });
            }
            return { ...row, quantity: nextQty };
          })
          .filter((row) => row.quantity > 0),
      );
    },
    [stockByDuration],
  );

  const updateAndroidId = useCallback(
    (durationId: string, androidId: string) => {
      setItems((prev) =>
        prev.map((row) => {
          if (row.durationId !== durationId) return row;
          return { ...row, androidId: androidId.trim() || undefined };
        })
      );
    },
    [],
  );

  const clearPromo = useCallback(() => {
    setPromo(null);
    setPromoError(null);
    toast.message("Promo removed");
  }, []);

  const clearCart = useCallback(() => {
    setItems((prev) => (prev.length === 0 ? prev : []));
    setPromo(null);
    setPromoError(null);
    setStockByDuration({});
    setStockReady(true);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const applyPromo = useCallback(async (code: string) => {
    try {
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          items: toPromoLines(items),
        }),
      });
      const json = (await res.json()) as {
        data?: {
          promo: AppliedPromo;
        };
        error?: { code: string; message: string };
      };
      if (res.ok && json.data?.promo) {
        const found = json.data.promo;
        setPromo({
          code: found.code,
          label: found.label,
          percentOff: found.percentOff,
          amountOff: found.amountOff,
          promoCodeId: found.promoCodeId,
          scope: found.scope,
          productId: found.productId,
          durationId: found.durationId,
          maxUnits: found.maxUnits,
        });
        setPromoError(null);
        toast.success("Promo applied", { description: found.label });
        return true;
      }
      const message = json.error?.message ?? "Invalid promo code";
      setPromoError(message);
      toast.error(message);
      return false;
    } catch {
      setPromoError("Could not validate promo");
      toast.error("Could not validate promo");
      return false;
    }
  }, [items]);

  /** Drop promo when cart no longer has an eligible line. */
  useEffect(() => {
    if (!hydrated || !promo) return;
    if (!promo.scope || promo.scope === "GLOBAL") return;
    const stillEligible = items.some((item) => {
      if (promo.scope === "PRODUCT") {
        return item.productId === promo.productId;
      }
      if (promo.scope === "DURATION") {
        return item.durationId === promo.durationId;
      }
      return true;
    });
    if (!stillEligible) {
      setPromo(null);
      setPromoError(null);
      toast.message("Promo removed", {
        description: "No matching product left in cart.",
      });
    }
  }, [hydrated, items, promo]);

  const itemCount = items.reduce((sum, row) => sum + row.quantity, 0);
  const subtotal = items.reduce(
    (sum, row) => sum + row.unitPrice * row.quantity,
    0,
  );
  const discount = useMemo(
    () => calcCartPromoDiscount(toPromoLines(items), promo),
    [items, promo],
  );
  const total = Math.max(0, Math.round(subtotal - discount));

  const stockOk = useMemo(() => {
    if (items.length === 0) return false;
    if (!stockReady || stockByDuration == null) return false;
    return items.every(
      (row) => (stockByDuration[row.durationId] ?? 0) >= row.quantity,
    );
  }, [items, stockByDuration, stockReady]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      discount,
      total,
      promo,
      promoError,
      hydrated,
      stockByDuration,
      stockReady,
      stockOk,
      applyPromo,
      clearPromo,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      updateAndroidId,
      clearCart,
      refreshStock,
    }),
    [
      items,
      itemCount,
      subtotal,
      discount,
      total,
      promo,
      promoError,
      hydrated,
      stockByDuration,
      stockReady,
      stockOk,
      applyPromo,
      clearPromo,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      updateAndroidId,
      clearCart,
      refreshStock,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
