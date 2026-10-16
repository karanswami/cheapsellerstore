import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, KeyRound, Loader2, ShoppingBag, Smartphone, Tag } from "lucide-react";
import { CopyKey } from "@/components/copy-key";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/currencies";
import { getOrderForViewer } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order details" };

const STATUS_TONE: Record<string, string> = {
  FULFILLED: "bg-success/15 text-success",
  PENDING: "bg-warning/20 text-warning",
};

function fmtDate(d: Date) {
  return (
    new Date(d).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}

export default async function OrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!/^[a-f0-9]{24}$/i.test(orderId)) notFound();
  const user = (await getCurrentUser())!;
  const order = await getOrderForViewer(orderId, undefined, user.id);
  if (!order) notFound();

  const ref = order.id.slice(-8).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/app/history"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to history
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight">Order</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">#{ref}</h1>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-4" /> {fmtDate(order.createdAt)}
          </p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", STATUS_TONE[order.status] ?? "bg-muted text-muted-foreground")}>
          {order.status.toLowerCase()}
        </span>
      </header>

      <ul className="space-y-3">
        {order.items.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <KeyRound className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold leading-tight">{item.productTitle}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.durationLabel}</p>
                </div>
              </div>
              <p className="shrink-0 font-display font-bold tabular-nums">{formatMoney(item.unitPrice, order.currency)}</p>
            </div>
            <div className="border-t border-dashed p-4">
              {item.key?.code ? (
                <>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">License key</p>
                  <div className="flex items-center gap-2 rounded-xl bg-neutral-950 p-2 pl-4 text-white">
                    <code className="min-w-0 flex-1 select-all break-all py-1.5 font-mono text-sm tracking-wide">{item.key.code}</code>
                    <CopyKey value={item.key.code} />
                  </div>
                </>
              ) : (
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Your key is being prepared…
                </p>
              )}
              {item.androidId ? (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Smartphone className="size-3.5" /> Locked to <code className="font-mono text-foreground">{item.androidId}</code>
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Summary</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="inline-flex items-center gap-2 text-muted-foreground"><ShoppingBag className="size-4" /> Items</dt>
            <dd className="font-medium">{order.items.length}</dd>
          </div>
          {order.promoCode ? (
            <div className="flex justify-between gap-4">
              <dt className="inline-flex items-center gap-2 text-muted-foreground"><Tag className="size-4" /> Promo</dt>
              <dd className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold uppercase text-success">{order.promoCode.code}</dd>
            </div>
          ) : null}
          <div className="flex items-end justify-between border-t pt-4">
            <dt className="text-muted-foreground">Total paid</dt>
            <dd className="font-display text-2xl font-bold leading-none tabular-nums">{formatMoney(order.total, order.currency)}</dd>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/app" className="inline-flex h-11 items-center justify-center rounded-xl border bg-card font-semibold transition-colors hover:bg-muted">
          Keep shopping
        </Link>
        <Link href="/app/keys" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">
          My keys
        </Link>
      </div>
    </div>
  );
}
