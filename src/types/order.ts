import type { Currency } from "@/lib/currencies";
import type { OrderStatus } from "@prisma/client";

export type OrderItemView = {
  id: string;
  productTitle: string;
  durationLabel: string;
  unitPrice: number;
  keyCode: string | null;
};

export type OrderView = {
  id: string;
  status: OrderStatus;
  total: number;
  currency: Currency;
  buyerEmail: string;
  items: OrderItemView[];
  createdAt: string;
};
