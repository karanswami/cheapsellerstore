"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Dialog as D } from "radix-ui";
import { ArrowRight, KeyRound, Loader2, Minus, Plus, Tag, Wallet, X } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/currencies";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatDurationLabel, type DurationOption } from "@/types/product";

type Props = {
  title: string;
  imageUrl: string | null;
  currency: Currency;
  duration: DurationOption;
  balance: number;
  onClose: () => void;
  /** Called once the order is paid so the card/grid can update stock + wallet instantly. */
  onPaid: (info: { qty: number; spent: number }) => void;
};

type Done = { orderId: string; token: string; qty: number; paid: number };

const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  const d = 70 + (i % 3) * 22;
  return {
    x: Math.round(Math.cos(a) * d),
    y: Math.round(Math.sin(a) * d),
    r: (i % 2 ? 1 : -1) * (120 + i * 20),
    c: ["bg-primary", "bg-warning", "bg-success", "bg-rose-500", "bg-sky-400"][i % 5],
  };
});

export function QuickBuy({ title, imageUrl, currency, duration: d, balance, onClose, onPaid }: Props) {
  const [qty, setQty] = useState(1);
  const [androidId, setAndroidId] = useState("");
  const [promo, setPromo] = useState("");
  const [showPromo, setShowPromo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const lock = useRef(false);

  const unit = d.price ?? 0;
  const total = unit * qty;
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
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoCode: promo.trim() || undefined,
          items: [
            { durationId: d.id, quantity: qty, androidId: d.requiresAndroidId ? androidId.trim() : undefined },
          ],
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) {
        toast.error(json?.error?.message ?? "Payment failed. Please try again.");
        return;
      }
      setDone({ orderId: json.data.orderId, token: json.data.accessToken, qty, paid: total });
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
          {done ? (
            <div className="relative px-1 pb-1 pt-4 text-center">
              <D.Title className="sr-only">Order placed</D.Title>
              <div className="relative mx-auto grid size-24 place-items-center">
                {CONFETTI.map((c, i) => (
                  <span
                    key={i}
                    className={cn("confetti-bit absolute left-1/2 top-1/2 h-2 w-1.5 rounded-sm", c.c)}
                    style={{ "--x": `${c.x}px`, "--y": `${c.y}px`, "--r": `${c.r}deg` } as React.CSSProperties}
                  />
                ))}
                <svg viewBox="0 0 72 72" className="anim-success-pop size-24" fill="none" aria-hidden>
                  <circle cx="36" cy="36" r="30" className="fill-success/15" />
                  <circle cx="36" cy="36" r="30" strokeWidth="4" strokeLinecap="round" className="draw-ring stroke-success" />
                  <path d="M23 37l9 9 17-19" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="draw-check stroke-success" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold">Payment successful</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {done.qty} × {title} · {formatDurationLabel(d)}
              </p>
              <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border text-left">
                <div className="bg-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Paid</p>
                  <p className="font-display text-lg font-bold tabular-nums">{formatMoney(done.paid, currency)}</p>
                </div>
                <div className="bg-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Wallet left</p>
                  <p className="font-display text-lg font-bold tabular-nums">{formatMoney(Math.max(0, after), currency)}</p>
                </div>
              </div>
              <Link
                href={`/order/${done.orderId}?token=${encodeURIComponent(done.token)}`}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                <KeyRound className="size-4" /> View your {done.qty > 1 ? "keys" : "key"} <ArrowRight className="size-4" />
              </Link>
              <button onClick={onClose} className="mt-2 h-10 w-full rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground">
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

              {showPromo ? (
                <input
                  autoFocus
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  maxLength={64}
                  placeholder="Promo code"
                  className="mt-3 h-11 w-full rounded-xl border bg-background px-3.5 text-sm uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                <button onClick={() => setShowPromo(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Tag className="size-3.5" /> Have a promo code?
                </button>
              )}

              <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="inline-flex items-center gap-1.5 text-muted-foreground"><Wallet className="size-4" /> Wallet balance</dt>
                  <dd className="font-semibold tabular-nums">{formatMoney(balance, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-display text-xl font-bold tabular-nums">{formatMoney(total, currency)}</dd>
                </div>
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
