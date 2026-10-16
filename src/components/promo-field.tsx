"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Loader2, Tag, X } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/currencies";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export type AppliedPromo = { code: string; discount: number };

type Line = { productId: string; durationId: string; unitPrice: number; quantity: number };

async function validate(code: string, line: Line): Promise<{ ok: true; promo: AppliedPromo } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/promos/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, items: [line] }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.data) {
      return { ok: false, message: json?.error?.message ?? "Could not apply this code." };
    }
    const discount = Number(json.data.discount) || 0;
    if (discount <= 0) return { ok: false, message: "This code gives no discount on this item." };
    return { ok: true, promo: { code: json.data.promo.code, discount } };
  } catch {
    return { ok: false, message: "Network error. Please try again." };
  }
}

/** Server-validated promo for a single cart line. Re-checks itself when qty / price changes. */
export function usePromo(line: Line) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<AppliedPromo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lineRef = useRef(line);
  useEffect(() => {
    lineRef.current = line;
  });

  const apply = useCallback(async () => {
    const c = code.trim();
    if (!c || busy) return;
    setBusy(true);
    setError(null);
    const r = await validate(c, lineRef.current);
    setBusy(false);
    if (r.ok) {
      setApplied(r.promo);
      toast.success(`${r.promo.code} applied`);
    } else {
      setError(r.message);
    }
  }, [code, busy]);

  const remove = useCallback(() => {
    setApplied(null);
    setError(null);
    setCode("");
  }, []);

  // Quantity / duration changed after applying: recompute the discount against the new cart.
  const key = `${line.durationId}:${line.quantity}:${line.unitPrice}`;
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    if (!applied) return;
    let live = true;
    void validate(applied.code, lineRef.current).then((r) => {
      if (!live) return;
      if (r.ok) setApplied(r.promo);
      else {
        setApplied(null);
        setError(r.message);
      }
    });
    return () => {
      live = false;
    };
  }, [key, applied]);

  return { code, setCode, applied, busy, error, apply, remove };
}

export function PromoField({
  promo,
  currency,
  disabled,
  className,
}: {
  promo: ReturnType<typeof usePromo>;
  currency: Currency;
  disabled?: boolean;
  className?: string;
}) {
  const { code, setCode, applied, busy, error, apply, remove } = promo;
  const [open, setOpen] = useState(false);

  if (applied) {
    return (
      <div className={cn("flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 px-3.5 py-2.5", className)}>
        <BadgeCheck className="size-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold uppercase tracking-wide">{applied.code}</p>
          <p className="text-xs text-muted-foreground">You save {formatMoney(applied.discount, currency)}</p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={disabled}
          aria-label="Remove promo code"
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline sm:text-sm", className)}
      >
        <Tag className="size-3.5" /> Have a promo code?
      </button>
    );
  }

  return (
    <div className={className}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void apply();
        }}
        className="flex gap-2"
      >
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={64}
          disabled={disabled || busy}
          placeholder="Promo code"
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-xl border bg-background px-3.5 text-sm uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
          )}
        />
        <button
          type="submit"
          disabled={disabled || busy || !code.trim()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-transform active:scale-95 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Apply
        </button>
      </form>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Subtotal (struck through) → promo line → final total. */
export function TotalBreakdown({
  subtotal,
  discount,
  total,
  code,
  currency,
  qty,
}: {
  subtotal: number;
  discount: number;
  total: number;
  code?: string;
  currency: Currency;
  qty: number;
}) {
  return (
    <div className="space-y-2 border-t pt-4">
      {discount > 0 ? (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal{qty > 1 ? ` · ${qty} keys` : ""}</span>
            <span className="tabular-nums text-muted-foreground line-through decoration-destructive/70 decoration-2">
              {formatMoney(subtotal, currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-success">
            <span className="inline-flex items-center gap-1.5">
              <Tag className="size-3.5" /> Promo {code}
            </span>
            <span className="tabular-nums">−{formatMoney(discount, currency)}</span>
          </div>
        </>
      ) : null}
      <div className="flex items-end justify-between">
        <span className="text-sm text-muted-foreground">
          Total{discount <= 0 && qty > 1 ? ` · ${qty} keys` : ""}
        </span>
        <span key={total} className="anim-pop-in font-display text-2xl font-bold leading-none tabular-nums">
          {formatMoney(total, currency)}
        </span>
      </div>
      {discount > 0 ? (
        <p className="text-right text-xs font-medium text-success">You saved {formatMoney(discount, currency)} 🎉</p>
      ) : null}
    </div>
  );
}
