"use client";

import { newIdempotencyKey } from "@/lib/idempotency-client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Dialog as D } from "radix-ui";
import { ArrowRight, Check, KeyRound, Loader2, Minus, Plus, Sparkles, Tag, Wallet, X } from "lucide-react";
import { PromoField, usePromo } from "@/components/promo-field";
import { formatMoney, type Currency } from "@/lib/currencies";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatDurationLabel, type DurationOption } from "@/types/product";

type Props = {
  productId: string;
  title: string;
  imageUrl: string | null;
  currency: Currency;
  duration: DurationOption;
  balance: number;
  onClose: () => void;
  /** Called once the order is paid so the card/grid can update stock + wallet instantly. */
  onPaid: (info: { qty: number; spent: number }) => void;
};

const STEPS = ["Preparing your order", "Securing your wallet", "Verifying payment", "Finalizing & delivering key"];
const STEP_MS = 750;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Done = { orderId: string; token: string; qty: number; paid: number; saved: number };

const COLORS = ["bg-primary", "bg-warning", "bg-success", "bg-rose-500", "bg-sky-400", "bg-violet-500"];
// Deterministic pseudo-random burst so server/client markup never diverges.
const CONFETTI = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2 + (i % 3) * 0.12;
  const d = 85 + ((i * 37) % 70);
  return {
    x: Math.round(Math.cos(a) * d),
    y: Math.round(Math.sin(a) * d) - 12,
    r: (i % 2 ? 1 : -1) * (160 + i * 23),
    c: COLORS[i % COLORS.length],
    w: 4 + (i % 3) * 2,
    h: 7 + (i % 4) * 2,
    round: i % 4 === 0,
    delay: 0.35 + (i % 6) * 0.04,
  };
});
const SPARKS = [
  { x: -78, y: -62, s: 14, d: 0.7 },
  { x: 82, y: -48, s: 10, d: 0.95 },
  { x: -92, y: 28, s: 9, d: 1.15 },
  { x: 74, y: 58, s: 13, d: 0.85 },
];

export function QuickBuy({ productId, title, imageUrl, currency, duration: d, balance, onClose, onPaid }: Props) {
  const [qty, setQty] = useState(1);
  const [androidId, setAndroidId] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [step, setStep] = useState(0);
  const lock = useRef(false);

  const unit = d.price ?? 0;
  const subtotal = unit * qty;
  const promo = usePromo({ productId, durationId: d.id, unitPrice: unit, quantity: qty });
  const discount = Math.min(subtotal, promo.applied?.discount ?? 0);
  const total = Math.max(0, subtotal - discount);
  const maxQty = Math.max(1, Math.min(20, d.stock));
  const short = balance < total;
  const after = balance - total;

  async function pay() {
    if (lock.current || short) return;
    if (d.requiresAndroidId && !androidId.trim()) {
      toast.error(`${d.deviceIdName || "Android ID"} is required.`);
      return;
    }
    lock.current = true;
    setStep(0);
    setBusy(true);
    try {
      const request = fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": newIdempotencyKey() },
        body: JSON.stringify({
          promoCode: promo.applied?.code,
          items: [
            { durationId: d.id, quantity: qty, androidId: d.requiresAndroidId ? androidId.trim() : undefined },
          ],
        }),
      }).then(async (r) => ({ ok: r.ok, json: await r.json().catch(() => null) }));
      // Show the progress steps while the (instant) charge runs, so the payment feels deliberate.
      let result: Awaited<typeof request> | null = null;
      void request.then((r) => (result = r), () => {});
      for (let i = 0; i < STEPS.length; i++) {
        setStep(i);
        await sleep(STEP_MS);
        if (result && !(result as { ok: boolean }).ok) break;
      }
      const { ok, json } = await request;
      if (!ok || !json?.data) {
        toast.error(json?.error?.message ?? "Payment failed. Please try again.");
        return;
      }
      setDone({ orderId: json.data.orderId, token: json.data.accessToken, qty, paid: total, saved: discount });
      onPaid({ qty, spent: total });
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <D.Root open onOpenChange={(o) => !o && !busy && onClose()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <D.Content
          onInteractOutside={(e) => busy && e.preventDefault()}
          onEscapeKeyDown={(e) => busy && e.preventDefault()}
          className="anim-sheet-up fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl border bg-popover p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl outline-none sm:inset-x-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
          {busy && !done ? (
            <div className="px-1 py-6 text-center">
              <D.Title className="sr-only">Processing payment</D.Title>
              <D.Description className="sr-only">Please wait while we complete your payment.</D.Description>
              <div className="relative mx-auto grid size-20 place-items-center">
                <span className="anim-ring-out absolute size-20 rounded-full border-2 border-primary/50" />
                <span className="absolute size-20 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                <Wallet className="size-7 text-primary" />
              </div>
              <p className="mt-5 font-display text-xl font-bold">{formatMoney(total, currency)}</p>
              <p className="text-sm text-muted-foreground">Please don’t close this window</p>
              <ol className="mx-auto mt-6 max-w-xs space-y-3 text-left">
                {STEPS.map((label, i) => (
                  <li key={label} className={cn("flex items-center gap-3 text-sm transition-opacity duration-300", i > step ? "opacity-35" : "opacity-100")}>
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", i < step ? "border-success bg-success text-white" : i === step ? "border-primary text-primary" : "border-border")}>
                      {i < step ? <Check className="size-3.5" /> : i === step ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    </span>
                    <span className={cn(i === step && "font-semibold")}>{label}{i === step ? "…" : ""}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : done ? (
            <div className="relative overflow-hidden px-1 pb-1 pt-6 text-center">
              <D.Title className="sr-only">Order placed</D.Title>
              <div className="anim-glow pointer-events-none absolute left-1/2 top-0 -ml-40 size-80 rounded-full bg-success/25 blur-3xl" />
              <div className="relative mx-auto grid size-28 place-items-center">
                <span className="anim-ring-out absolute size-24 rounded-full border-2 border-success/60" />
                <span className="anim-ring-out absolute size-24 rounded-full border-2 border-success/40 [animation-delay:0.25s]" />
                {SPARKS.map((k, i) => (
                  <Sparkles
                    key={i}
                    className="anim-twinkle absolute left-1/2 top-1/2 text-warning"
                    style={{ marginLeft: k.x, marginTop: k.y, width: k.s, height: k.s, animationDelay: `${k.d}s` }}
                  />
                ))}
                {CONFETTI.map((c, i) => (
                  <span
                    key={i}
                    className={cn("confetti-bit absolute left-1/2 top-1/2", c.round ? "rounded-full" : "rounded-[2px]", c.c)}
                    style={{ width: c.w, height: c.round ? c.w : c.h, "--x": `${c.x}px`, "--y": `${c.y}px`, "--r": `${c.r}deg`, "--cd": `${c.delay}s` } as React.CSSProperties}
                  />
                ))}
                <svg viewBox="0 0 72 72" className="anim-success-pop relative size-24 drop-shadow-[0_6px_18px_rgb(34_197_94/0.45)]" fill="none" aria-hidden>
                  <circle cx="36" cy="36" r="30" className="fill-success/15" />
                  <circle cx="36" cy="36" r="30" strokeWidth="4" strokeLinecap="round" className="draw-ring stroke-success" />
                  <path d="M23 37l9 9 17-19" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="draw-check stroke-success" />
                </svg>
              </div>
              <p className="anim-fade-up mt-5 text-[11px] font-bold uppercase tracking-[0.25em] text-success [--d:500ms]">Order confirmed</p>
              <h3 className="anim-fade-up mt-1 font-display text-3xl font-bold [--d:580ms]">Payment successful</h3>
              <p className="anim-fade-up mt-1 text-sm text-muted-foreground [--d:660ms]">
                {done.qty} × {title} · {formatDurationLabel(d)}
              </p>

              <div className="anim-fade-up relative mx-auto mt-6 max-w-xs rounded-2xl border bg-card text-left shadow-lg shadow-black/5 [--d:740ms]">
                <span className="absolute -left-2 top-[58%] size-4 rounded-full border bg-popover [clip-path:inset(0_0_0_50%)]" />
                <span className="absolute -right-2 top-[58%] size-4 rounded-full border bg-popover [clip-path:inset(0_50%_0_0)]" />
                <div className="p-4 pb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Amount paid</p>
                  <p className="font-display text-4xl font-bold leading-tight tabular-nums">{formatMoney(done.paid, currency)}</p>
                  {done.saved > 0 ? (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                      <Tag className="size-3" /> Saved {formatMoney(done.saved, currency)}
                    </p>
                  ) : null}
                </div>
                <div className="border-t border-dashed" />
                <div className="flex items-center justify-between p-4 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Wallet className="size-4" /> Wallet left</span>
                  <span className="font-display text-lg font-bold tabular-nums">{formatMoney(Math.max(0, after), currency)}</span>
                </div>
              </div>

              <Link
                href={`/order/${done.orderId}?token=${encodeURIComponent(done.token)}&fresh=1`}
                className="anim-fade-up anim-sheen-loop relative mt-6 flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-[0.98] [--d:840ms]"
              >
                <KeyRound className="size-4" /> View your {done.qty > 1 ? "keys" : "key"} <ArrowRight className="size-4" />
              </Link>
              <button onClick={onClose} className="anim-fade-up mt-2 h-10 w-full rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground [--d:920ms]">
                Keep shopping
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-xl border bg-muted">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <D.Title className="truncate font-display text-lg font-bold leading-tight">{title}</D.Title>
                  <D.Description className="mt-0.5 text-sm text-muted-foreground">{formatDurationLabel(d)}</D.Description>
                </div>
                <D.Close disabled={busy} aria-label="Close" className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-40">
                  <X className="size-4" />
                </D.Close>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl border bg-card p-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Amount</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(unit, currency)} each · {d.stock} in stock
                  </p>
                </div>
                <div className="flex h-11 items-center rounded-xl border bg-background">
                  <button aria-label="Decrease" disabled={qty <= 1 || busy} onClick={() => setQty(qty - 1)} className="grid size-11 place-items-center transition-colors hover:text-primary disabled:opacity-35">
                    <Minus className="size-4" />
                  </button>
                  <span className="w-9 text-center font-display text-lg font-bold tabular-nums">{qty}</span>
                  <button aria-label="Increase" disabled={qty >= maxQty || busy} onClick={() => setQty(qty + 1)} className="grid size-11 place-items-center transition-colors hover:text-primary disabled:opacity-35">
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              {d.requiresAndroidId ? (
                <input
                  value={androidId}
                  onChange={(e) => setAndroidId(e.target.value)}
                  maxLength={128}
                  placeholder={d.deviceIdName || "Android ID"}
                  className="mt-3 h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              ) : null}

              <PromoField promo={promo} currency={currency} disabled={busy} className="mt-3" />

              <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="inline-flex items-center gap-1.5 text-muted-foreground"><Wallet className="size-4" /> Wallet balance</dt>
                  <dd className="font-semibold tabular-nums">{formatMoney(balance, currency)}</dd>
                </div>
                {discount > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Subtotal</dt>
                      <dd className="tabular-nums text-muted-foreground line-through decoration-destructive/70 decoration-2">{formatMoney(subtotal, currency)}</dd>
                    </div>
                    <div className="flex justify-between font-semibold text-success">
                      <dt className="inline-flex items-center gap-1.5"><Tag className="size-3.5" /> Promo {promo.applied?.code}</dt>
                      <dd className="tabular-nums">−{formatMoney(discount, currency)}</dd>
                    </div>
                  </>
                ) : null}
                <div className="flex items-end justify-between">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd key={total} className="anim-pop-in font-display text-2xl font-bold leading-none tabular-nums">{formatMoney(total, currency)}</dd>
                </div>
                {discount > 0 ? (
                  <p className="text-right text-xs font-medium text-success">You saved {formatMoney(discount, currency)} 🎉</p>
                ) : null}
                {!short ? (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <dt>Balance after payment</dt>
                    <dd className="tabular-nums">{formatMoney(after, currency)}</dd>
                  </div>
                ) : null}
              </dl>

              {short ? (
                <Link
                  href="/app/deposit"
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-warning font-semibold text-black transition-transform active:scale-[0.98]"
                >
                  <Wallet className="size-4" /> Add {formatMoney(total - balance, currency)} to wallet
                </Link>
              ) : (
                <button
                  onClick={pay}
                  disabled={busy}
                  className="relative mt-4 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-90"
                >
                  {busy ? (
                    <>
                      <span className="anim-pay-sweep absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                      <Loader2 className="size-4 animate-spin" /> Processing…
                    </>
                  ) : (
                    <>Pay {formatMoney(total, currency)} from wallet</>
                  )}
                </button>
              )}
            </>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
