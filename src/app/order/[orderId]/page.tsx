import { OrderSuccess } from "@/components/checkout/order-success";
import type { Currency } from "@/lib/currencies";
import { getOrderByAccessToken } from "@/lib/orders";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { orderId } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  const order = await getOrderByAccessToken(orderId, token);
  if (!order) notFound();

  return (
    <OrderSuccess
      orderId={order.id}
      total={order.total}
      currency={order.currency as Currency}
      createdAt={order.createdAt.toISOString()}
      items={order.items.map((item) => ({
        id: item.id,
        productTitle: item.productTitle,
        durationLabel: item.durationLabel,
        code: item.key?.code ?? null,
        unitPrice: item.unitPrice,
        androidId: item.androidId,
      }))}
    />
  );
}
