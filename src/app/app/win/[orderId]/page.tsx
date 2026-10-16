import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/customer";
import { getSpinPrizeOrder } from "@/lib/spin";
import { WinReveal } from "./win-reveal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your spin reward" };

export default async function WinPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!/^[a-f0-9]{24}$/i.test(orderId)) notFound();
  const user = (await getCurrentUser())!;
  const data = await getSpinPrizeOrder(user.id, orderId);
  if (!data) notFound();

  return (
    <WinReveal
      prize={data.spin.prizeLabel ?? data.order.items[0]?.productTitle ?? "Spin reward"}
      wonAt={(data.spin.usedAt ?? data.order.createdAt).toISOString()}
      keys={data.order.items.map((i) => ({
        id: i.id,
        product: i.productTitle,
        duration: i.durationLabel,
        code: i.key?.code ?? null,
        androidId: i.androidId ?? null,
      }))}
    />
  );
}
