import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Hash,
  KeyRound,
  LifeBuoy,
  Mail,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { IconTile, Surface } from "@/components/app-kit";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/currencies";
import { getOrderForViewer } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { CopyChip, OrderKeys } from "./order-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order details" };

type Status = "PENDING" | "PAID" | "FULFILLED" | "FAILED" | "REFUNDED";

/** Hero tint + pill per status; `glow` feeds the radial light on the receipt card. */
const STATUS: Record<Status, { label: string; icon: LucideIcon; pill: string; glow: string }> = {
  FULFILLED: { label: "Delivered", icon: Check, pill: "bg-emerald-400/15 text-emerald-300 ring-emerald-300/25", glow: "#10b981" },
  PAID: { label: "Paid · delivering", icon: CalendarClock, pill: "bg-amber-400/15 text-amber-300 ring-amber-300/25", glow: "#f59e0b" },
  PENDING: { label: "Pending", icon: CalendarClock, pill: "bg-amber-400/15 text-amber-300 ring-amber-300/25", glow: "#f59e0b" },
  FAILED: { label: "Failed", icon: CircleAlert, pill: "bg-rose-400/15 text-rose-300 ring-rose-300/25", glow: "#f43f5e" },
  REFUNDED: { label: "Refunded", icon: RotateCcw, pill: "bg-sky-400/15 text-sky-300 ring-sky-300/25", glow: "#0ea5e9" },
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
  const status = (order.status in STATUS ? order.status : "PENDING") as Status;
  const s = STATUS[status];
  const keyCount = order.items.filter((i) => i.key?.code).length;
  const subtotal = order.items.reduce((sum, i) => sum + i.unitPrice, 0);
  const discount = Math.max(0, subtotal - order.total);
  const productId = order.items[0]?.duration?.productId;

  // Placed → Paid → Delivered; a failed/refunded order ends on its own last step.
  const reached = status === "FULFILLED" ? 3 : status === "PAID" ? 2 : status === "PENDING" ? 1 : 2;
  const steps = [
    { label: "Placed", done: true },
    { label: status === "FAILED" ? "Failed" : "Paid", done: reached >= 2, bad: status === "FAILED" },
    { label: status === "REFUNDED" ? "Refunded" : "Delivered", done: reached >= 3 || status === "REFUNDED", bad: false },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/app/history"
        className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
      >
        <ArrowLeft className="size-4" /> Back to history
      </Link>

      {/* Receipt hero */}
      <section
        aria-label="Order summary"
        className="hero-card anim-fade-up"
        style={{ "--glow": s.glow, "--hero-a": s.glow } as React.CSSProperties}
      >

        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset", s.pill)}>
            <s.icon className="size-3.5" strokeWidth={2.75} /> {s.label}
          </span>
          <CopyChip
            value={ref}
            msg="Order number copied"
            label={`#${ref}`}
            className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/85"
          />
        </div>

        <div className="px-5 pb-6 pt-7 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
            {status === "REFUNDED" ? "Refunded" : "Total paid"}
          </p>
          <p className="mt-1.5 font-display text-[2.6rem] font-bold leading-none tracking-tight tabular-nums drop-shadow-[0_2px_12px_rgb(0_0_0/0.35)]">
            {formatMoney(order.total, order.currency)}
          </p>
          <p className="mt-3 text-xs text-white/60">
            {fmtDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? "item" : "items"}
          </p>
        </div>

        {/* perforation */}
        <div aria-hidden className="relative border-t border-dashed border-white/15">
          <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full bg-background" />
          <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full bg-background" />
        </div>

        <ol className="grid grid-cols-3 px-3 pb-5 pt-4">
          {steps.map((st, i) => (
            <li key={st.label} className="relative flex flex-col items-center gap-1.5 text-center">
              {i > 0 ? (
                <span
                  aria-hidden
                  className={cn("absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2", st.done ? "bg-white/70" : "bg-white/15")}
                />
              ) : null}
              <span
                className={cn(
                  "relative grid size-6 place-items-center rounded-full text-[11px] font-bold",
                  st.bad ? "bg-rose-400 text-[#0b1020]" : st.done ? "bg-white text-[#0b1020]" : "border border-white/25 bg-[#0b1020] text-white/50",
                )}
              >
                {st.bad ? "!" : st.done ? <Check className="size-3.5" strokeWidth={3.5} /> : i + 1}
              </span>
              <span className={cn("text-[11px] font-semibold", st.done || st.bad ? "text-white/90" : "text-white/45")}>{st.label}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Keys */}
      <OrderKeys
        orderRef={ref}
        items={order.items.map((i) => ({
          id: i.id,
          productTitle: i.productTitle,
          durationLabel: i.durationLabel,
          price: formatMoney(i.unitPrice, order.currency),
          code: i.key?.code ?? null,
          image: i.duration?.product?.imageUrl ?? null,
          androidId: i.androidId,
          deviceLabel: i.duration?.deviceIdName || "device",
        }))}
      />

      {/* Details */}
      <Surface className="anim-fade-up px-4 [--d:180ms]">
        <h2 className="flex items-center gap-2 pb-1 pt-4 font-display text-base font-bold">
          <ReceiptText className="size-4 text-primary" /> Receipt
        </h2>
        <dl className="divide-y divide-white/[0.05] text-sm">
          <Row icon={Hash} k="Order ID">
            <CopyChip value={order.id} msg="Order ID copied" label={order.id} className="max-w-[11rem] text-xs text-foreground/85" />
          </Row>
          <Row icon={CalendarClock} k="Placed">{fmtDate(order.createdAt)}</Row>
          <Row icon={Mail} k="Email">
            <span className="block max-w-[12rem] truncate">{order.buyerEmail}</span>
          </Row>
          <Row icon={ShoppingBag} k={`Subtotal · ${order.items.length}`}>{formatMoney(subtotal, order.currency)}</Row>
          {order.promoCode || discount > 0 ? (
            <Row icon={Tag} k={order.promoCode ? "Promo" : "Discount"}>
              <span className="inline-flex items-center gap-2">
                {order.promoCode ? (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold uppercase text-success">{order.promoCode.code}</span>
                ) : null}
                {discount > 0 ? <span className="font-semibold text-success">−{formatMoney(discount, order.currency)}</span> : null}
              </span>
            </Row>
          ) : null}
        </dl>
        <div className="flex items-end justify-between border-t border-dashed border-white/10 py-4">
          <span className="text-sm text-muted-foreground">Total paid</span>
          <span className="font-display text-2xl font-bold leading-none tabular-nums">{formatMoney(order.total, order.currency)}</span>
        </div>
      </Surface>

      {/* Next steps */}
      <Surface className="anim-fade-up divide-y divide-white/[0.05] [--d:240ms]">
        <NavRow href="/app/keys" icon={KeyRound} tone="amber" title="Open key vault" sub={keyCount ? "All your keys in one place" : "Keys land here once delivered"} />
        {productId ? (
          <NavRow href={`/product/${productId}`} icon={RotateCcw} tone="primary" title="Buy again" sub={order.items[0].productTitle} />
        ) : null}
        <NavRow href="/app/reports" icon={LifeBuoy} tone="rose" title="Problem with this order?" sub="Open a ticket — we reply fast" />
      </Surface>

      <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
        Keep your keys private — anyone with a key can use it.
      </p>
    </div>
  );
}

function Row({ icon: Icon, k, children }: { icon: LucideIcon; k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {k}
      </dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

function NavRow({
  href,
  icon,
  tone,
  title,
  sub,
}: {
  href: string;
  icon: LucideIcon;
  tone: "amber" | "primary" | "rose";
  title: string;
  sub: string;
}) {
  return (
    <Link href={href} className="tap flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03]">
      <IconTile icon={icon} tone={tone} className="size-10 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
