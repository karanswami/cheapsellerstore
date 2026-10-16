import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, KeyRound } from "lucide-react";
import { CopyKey } from "@/components/copy-key";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currencies";
import { getOrderByAccessToken } from "@/lib/orders";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ orderId }, { token }] = await Promise.all([params, searchParams]);
  if (!token || !/^[a-f0-9]{24}$/i.test(orderId)) notFound();
  const [config, order] = await Promise.all([getSiteConfig(), getOrderByAccessToken(orderId, token)]);
  if (!order) notFound();

  return (
    <>
      <SiteHeader config={config} />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-9" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold">Order {order.status.toLowerCase()}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Total {formatMoney(order.total, order.currency)} · {order.buyerEmail}
          </p>
        </div>

        <ul className="mt-8 space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.productTitle}</p>
                  <p className="text-xs text-muted-foreground">{item.durationLabel}</p>
                </div>
                <p className="font-display font-bold">{formatMoney(item.unitPrice, order.currency)}</p>
              </div>
              {item.key?.code ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
                  <KeyRound className="size-4 shrink-0 text-primary" />
                  <code className="min-w-0 flex-1 break-all font-mono text-sm">{item.key.code}</code>
                  <CopyKey value={item.key.code} />
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Key is being prepared…</p>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="secondary"><Link href="/#products">Keep shopping</Link></Button>
          <Button asChild><Link href="/app/keys">My keys</Link></Button>
        </div>
      </main>
    </>
  );
}
