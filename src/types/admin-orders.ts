import type { Currency } from "@/lib/currencies";
import type { OrderStatus, UserRole } from "@prisma/client";

export type AdminOrderAudience =
  | "all"
  | "users"
  | "resellers"
  | "admins"
  | "guests";

export type AdminOrderStatusFilter = "all" | OrderStatus;

export type AdminOrderListItem = {
  id: string;
  buyerEmail: string;
  buyerDiscord: string | null;
  status: OrderStatus;
  total: number;
  currency: Currency;
  itemCount: number;
  productSummary: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: UserRole;
  } | null;
};

export type AdminOrderDetail = AdminOrderListItem & {
  accessToken: string;
  updatedAt: string;
  promoCode: { id: string; code: string } | null;
  flashSale: { id: string; title: string } | null;
  items: {
    id: string;
    productTitle: string;
    durationLabel: string;
    unitPrice: number;
    androidId?: string | null;
    key: { id: string; code: string; status: string } | null;
  }[];
};
