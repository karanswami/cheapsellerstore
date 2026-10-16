import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CalendarClock, KeyRound, Loader2, Mail, ShieldCheck, ShoppingBag, Smartphone, Tag } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CopyKey } from "@/components/copy-key";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/currencies";
import { getOrderForViewer } from "@/lib/orders";
import { sellerHasSellerPanel } from "@/lib/resellers";
import { roleLabel } from "@/lib/roles";
import { getSiteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order" };

const COLORS = ["bg-primary", "bg-warning", "bg-success", "bg-rose-500", "bg-sky-400", "bg-violet-500"];
const CONFETTI = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2;
  const d = 90 + ((i * 41) % 80);
  return {
    x: Math.round(Math.cos(a) * d),
    y: Math.round(Math.sin(a) * d) - 10,
    r: (i % 2 ? 1 : -1) * (160 + i * 23),
    c: COLORS[i % COLORS.length],
    w: 4 + (i % 3) * 2,
    h: 7 + (i % 4) * 2,
    round: i % 4 === 0,
    delay: 0.3 + (i % 6) * 0.04,
  };
});

const STATUS_TONE: Record<string, string> = {
  FULFILLED: "bg-success/15 text-success",
  PENDING: "bg-warning/20 text-warning",
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string; fresh?: string }>;
}) {
  const [{ orderId }, { token, fresh }] = await Promise.all([params, searchParams]);
  if (!/^[a-f0-9]{24}$/i.test(orderId)) notFound();
  const [config, user] = await Promise.all([getSiteConfig(), getCurrentUser()]);
  const order = await getOrderForViewer(orderId, token, user?.id);
  if (!order) notFound();
  // Celebration only right after paying; opening it later from history is a calm receipt.
  const celebrate = fresh === "1";
  // Owners revisiting get the plain details page inside the app, not the success screen.
  if (!celebrate && user && order.userId === user.id) redirect(`/app/order/${order.id}`);

  const ref = order.id.slice(-8).toUpperCase();
  const fulfilled = order.status === "FULFILLED";
  const keyCount = order.items.filter((i) => i.key?.code).length;

  // Signed-in buyers stay inside the app shell; guests with a link get the public header.
  const inShell = Boolean(user);

  const body = (
    <div className={cn("pb-8", !celebrate && "calm")}>
        {/* Hero */}
        <section className={cn("relative overflow-hidden bg-neutral-950 text-white", inShell && "rounded-3xl")}>
          <div className="grid-bg absolute inset-0 opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
          <div className="anim-glow pointer-events-none absolute left-1/2 top-1/2 -ml-72 -mt-52 size-[36rem] rounded-full bg-success/25 blur-[110px]" />
          <div className={cn("relative mx-auto flex w-full max-w-2xl flex-col items-center px-4 text-center", celebrate ? "pb-24 pt-12 sm:pb-28 sm:pt-16" : "pb-20 pt-9 sm:pb-24 sm:pt-11")}>
            <div className="relative grid size-28 place-items-center">
              {celebrate ? (
                <>
                  <span className="anim-ring-out absolute size-24 rounded-full border-2 border-success/60" />
                  <span className="anim-ring-out absolute size-24 rounded-full border-2 border-success/40 [animation-delay:0.25s]" />
                </>
              ) : null}
              {(celebrate ? CONFETTI : []).map((c, i) => (
                <span
                  key={i}
                  className={cn("confetti-bit absolute left-1/2 top-1/2", c.round ? "rounded-full" : "rounded-[2px]", c.c)}
                  style={{ width: c.w, height: c.round ? c.w : c.h, "--x": `${c.x}px`, "--y": `${c.y}px`, "--r": `${c.r}deg`, "--cd": `${c.delay}s` } as React.CSSProperties}
                />
              ))}
              <svg viewBox="0 0 72 72" className="anim-success-pop relative size-24 drop-shadow-[0_6px_22px_rgb(34_197_94/0.55)]" fill="none" aria-hidden>
                <circle cx="36" cy="36" r="30" className="fill-success/20" />
                <circle cx="36" cy="36" r="30" strokeWidth="4" strokeLinecap="round" className="draw-ring stroke-success" />
                <path d="M23 37l9 9 17-19" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="draw-check stroke-success" />
              </svg>
            </div>
            <p className="anim-fade-up mt-6 text-[11px] font-bold uppercase tracking-[0.3em] text-success [--d:450ms]">
              {celebrate ? (fulfilled ? "Order confirmed" : `Order ${order.status.toLowerCase()}`) : `Order #${ref}`}
            </p>
            <h1 className="anim-fade-up mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl [--d:530ms]">
              {!celebrate
                ? "Order details"
                : keyCount > 1
                  ? "Your keys are ready"
                  : fulfilled
                    ? "Your key is ready"
                    : "Thank you!"}
            </h1>
            <p className="anim-fade-up mt-3 max-w-sm text-sm text-white/60 [--d:610ms]">
              {celebrate
                ? `Copy ${keyCount > 1 ? "them" : "it"} below. A copy always lives in your account under My keys.`
                : `Placed ${fmtDate(order.createdAt)}. Your ${keyCount > 1 ? "keys stay" : "key stays"} available here anytime.`}
            </p>
            <div className="anim-fade-up mt-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-5 py-2 backdrop-blur [--d:690ms]">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Total paid</span>
              <span className="font-display text-xl font-bold tabular-nums">{formatMoney(order.total, order.currency)}</span>
            </div>
          </div>
        </section>

        <div className="mx-auto -mt-14 w-full max-w-2xl space-y-5 px-4 sm:-mt-16">
          {/* Keys */}
          <ul className="space-y-4">
            {order.items.map((item, idx) => (
              <li
                key={item.id}
                style={{ "--d": `${780 + idx * 110}ms` } as React.CSSProperties}
                className="anim-fade-up overflow-hidden rounded-3xl border bg-card shadow-xl shadow-black/10"
              >
                <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <KeyRound className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-bold leading-tight">{item.productTitle}</p>
                      <p className="mt-0.5 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                        {item.durationLabel}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 font-display text-lg font-bold tabular-nums">{formatMoney(item.unitPrice, order.currency)}</p>
                </div>

                <div className="relative border-t border-dashed">
                  <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full border bg-background" />
                  <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full border bg-background" />
                </div>

                <div className="p-4 sm:p-5">
                  {item.key?.code ? (
                    <>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">License key</p>
                      <div className="flex items-center gap-2 rounded-2xl bg-neutral-950 p-2 pl-4 text-white">
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

          {/* Summary */}
          <section
            style={{ "--d": `${780 + order.items.length * 110}ms` } as React.CSSProperties}
            className="anim-fade-up rounded-3xl border bg-card p-5 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Order summary</h2>
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", STATUS_TONE[order.status] ?? "bg-muted text-muted-foreground")}>
                {order.status.toLowerCase()}
              </span>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="inline-flex items-center gap-2 text-muted-foreground"><ShoppingBag className="size-4" /> Order</dt>
                <dd className="font-mono font-semibold">#{ref}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="inline-flex items-center gap-2 text-muted-foreground"><CalendarClock className="size-4" /> Placed</dt>
                <dd className="text-right font-medium">{fmtDate(order.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="inline-flex items-center gap-2 text-muted-foreground"><Mail className="size-4" /> Email</dt>
                <dd className="min-w-0 truncate font-medium">{order.buyerEmail}</dd>
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

          <p className="anim-fade-up flex items-start gap-2 rounded-2xl bg-muted/60 p-4 text-xs text-muted-foreground [--d:1100ms]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            Keep your keys private — anyone with a key can use it. This page is only reachable through your personal link.
          </p>

          <div className="anim-fade-up grid grid-cols-2 gap-3 [--d:1180ms]">
            <Link href={inShell ? "/app" : "/#products"} className="inline-flex h-12 items-center justify-center rounded-xl border bg-card font-semibold transition-colors hover:bg-muted">
              Keep shopping
            </Link>
            <Link href="/app/keys" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]">
              My keys <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
    </div>
  );

  if (user) {
    return (
      <AppShell
        siteName={config.siteName}
        user={{
          name: user.name,
          username: user.username,
          role: user.role,
          roleLabel: roleLabel(user.role),
          balance: formatMoney(user.walletBalance, user.currency),
          hasSellerPanel: sellerHasSellerPanel(user),
        }}
      >
        {body}
      </AppShell>
    );
  }

  return (
    <>
      <SiteHeader config={config} />
      <main className="pb-16">{body}</main>
    </>
  );
}
