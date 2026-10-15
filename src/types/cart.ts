import type { Currency } from "@/lib/currencies";

export type CartItem = {
  productId: string;
  durationId: string;
  title: string;
  durationLabel: string;
  /** Pay price (flash-adjusted). */
  unitPrice: number;
  /** Catalog price before flash, when a sale applies. */
  listPrice?: number | null;
  flashTitle?: string | null;
  flashPercent?: number | null;
  flashEndsAt?: string | null;
  currency: Currency;
  quantity: number;
  imageUrl: string | null;
  requiresAndroidId?: boolean;
  deviceIdName?: string;
  androidId?: string;
};

export const CART_STORAGE_KEY = "drip-cart-v2";
