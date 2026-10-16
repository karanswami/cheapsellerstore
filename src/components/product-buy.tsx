"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Loader2, Minus, Plus, ShoppingBag, Wallet } from "lucide-react";
import { FlashStrip } from "@/components/flash-strip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PromoField, TotalBreakdown, usePromo } from "@/components/promo-field";
import { formatMoney, type Currency } from "@/lib/currencies";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { listProductVersions, type DurationOption } from "@/types/product";

type Props = {
  product: { id: string; title: string; currency: Currency; isMaintenance: boolean; durations: DurationOption[] };
  loggedIn: boolean;
  balance: number | null;
};

export function ProductBuy({ product, loggedIn, balance }: Props) {
  const router = useRouter();
  const versions = useMemo(() => listProductVersions(product.durations), [product.durations]);
  const [version, setVersion] = useState(versions[0] ?? "");
  const options = product.durations.filter((d) => d.version.trim() === version);
  const firstAvailable = options.find((d) => d.stock > 0 && d.price != null) ?? options[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.id ?? "");
  const [qty, setQty] = useState(1);
  const [androidId, setAndroidId] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = product.durations.find((d) => d.id === selectedId) ?? firstAvailable;
  const unit = selected?.price ?? 0;
  const subtotal = unit * qty;
  const promo = usePromo({ productId: product.id, durationId: selected?.id ?? "", unitPrice: unit, quantity: qty });
  const discount = Math.min(subtotal, promo.applied?.discount ?? 0);
  const total = Math.max(0, subtotal - discount);
  const maxQty = Math.max(1, Math.min(20, selected?.stock ?? 1));
  const canBuy = !product.isMaintenance && selected && selected.price != null && selected.stock > 0;
  const short = balance != null && canBuy && balance < total;
  const next = encodeURIComponent(`/product/${product.id}`);

  function pickVersion(v: string) {
    setVersion(v);
    const first = product.durations.filter((d) => d.version.trim() === v);
    setSelectedId((first.find((d) => d.stock > 0 && d.price != null) ?? first[0])?.id ?? "");
    setQty(1);
  }

  async function buy() {
    if (!selected || !canBuy) return;
    if (selected.requiresAndroidId && !androidId.trim()) {
      toast.error(`${selected.deviceIdName || "Android ID"} is required.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoCode: promo.applied?.code,
          items: [
            {
              durationId: selected.id,
              quantity: qty,
              androidId: selected.requiresAndroidId ? androidId.trim() : undefined,
            },
          ],
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) {
        toast.error(json?.error?.message ?? "Checkout failed. Please try again.");
        return;
      }
      toast.success("Order placed!");
      router.push(`/order/${json.data.orderId}?token=${encodeURIComponent(json.data.accessToken)}&fresh=1`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const list = selected?.listPrice ?? null;
  const onSale = selected?.price != null && list != null && list > selected.price;

  const saleInfo = selected?.flashSale ?? null;

  return (
    <div className="space-y-5 overflow-hidden rounded-3xl border bg-card p-5 shadow-xl shadow-black/5 sm:p-6">
      {onSale && saleInfo ? (
        <FlashStrip
          title={saleInfo.title}
          percent={saleInfo.discountPercent}
          endsAt={saleInfo.expiresAt}
          className="-mx-5 -mt-5 sm:-mx-6 sm:-mt-6"
        />
      ) : null}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Price</p>
          <p className="font-display text-3xl font-bold leading-none tabular-nums">
            {selected?.price != null ? formatMoney(selected.price, product.currency) : "—"}
          </p>
          {onSale ? <p className="mt-1 text-sm text-muted-foreground line-through">{formatMoney(list!, product.currency)}</p> : null}
        </div>
        {selected && selected.stock > 0 ? (
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", selected.stock <= 5 ? "bg-warning text-black" : "bg-success/15 text-success")}>
            {selected.stock <= 5 ? `Only ${selected.stock} left` : "In stock"}
          </span>
        ) : null}
      </div>

      {versions.length > 1 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Version</p>
          <div className="flex flex-wrap gap-2">
            {versions.map((v) => (
              <button
                key={v}
                onClick={() => pickVersion(v)}
                className={cn(
                  "h-9 rounded-full border px-4 text-[13px] font-semibold transition-colors",
                  v === version ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:border-primary/50",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Choose duration</p>
        <div role="radiogroup" className="grid gap-2">
          {options.map((d) => {
            const out = d.stock <= 0 || d.price == null;
            const active = d.id === selected?.id;
            const sale = d.listPrice != null && d.price != null && d.listPrice > d.price;
            return (
              <button
                key={d.id}
                role="radio"
                aria-checked={active}
                disabled={out}
                onClick={() => {
                  setSelectedId(d.id);
                  setQty(1);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors",
                  active ? "border-primary bg-primary/10 ring-2 ring-primary/25" : "hover:border-primary/40",
                  out && "cursor-not-allowed opacity-50",
                )}
              >
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                  {active ? <Check className="size-3" strokeWidth={3.5} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{d.label}</span>
                  <span className={cn("block text-xs", out ? "text-destructive" : "text-muted-foreground")}>
                    {out ? "Sold out" : d.stock <= 5 ? `Only ${d.stock} left` : "In stock"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-base font-bold leading-none tabular-nums">
                    {d.price != null ? formatMoney(d.price, d.currency) : "—"}
                  </span>
                  {sale ? <span className="mt-1 block text-xs text-muted-foreground line-through">{formatMoney(d.listPrice!, d.currency)}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected?.requiresAndroidId ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {selected.deviceIdName || "Android ID"}
          </p>
          <Input value={androidId} onChange={(e) => setAndroidId(e.target.value)} maxLength={128} className="h-11" />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="flex h-11 items-center rounded-xl border bg-background">
          <button aria-label="Decrease" disabled={qty <= 1} onClick={() => setQty(qty - 1)} className="grid size-11 place-items-center hover:text-primary disabled:opacity-40">
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center font-semibold tabular-nums">{qty}</span>
          <button aria-label="Increase" disabled={qty >= maxQty} onClick={() => setQty(qty + 1)} className="grid size-11 place-items-center hover:text-primary disabled:opacity-40">
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <PromoField promo={promo} currency={product.currency} disabled={busy} />

      {canBuy ? (
        <TotalBreakdown subtotal={subtotal} discount={discount} total={total} code={promo.applied?.code} currency={product.currency} qty={qty} />
      ) : null}

      {product.isMaintenance ? (
        <Button size="lg" className="w-full" disabled>Under maintenance</Button>
      ) : !loggedIn ? (
        <Button asChild size="lg" className="w-full">
          <Link href={`/login?next=${next}`}>Sign in to buy</Link>
        </Button>
      ) : short ? (
        <div className="space-y-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/app/deposit"><Wallet /> Add {formatMoney(total - balance!, product.currency)} to wallet</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">Wallet balance {formatMoney(balance!, product.currency)}</p>
        </div>
      ) : (
        <Button size="lg" className="w-full" disabled={!canBuy || busy} onClick={buy}>
          {busy ? <Loader2 className="animate-spin" /> : <ShoppingBag />}
          {busy ? "Processing…" : canBuy ? "Buy now" : "Sold out"}
        </Button>
      )}
      {loggedIn && !short && balance != null ? (
        <p className="text-center text-xs text-muted-foreground">Paid from wallet · balance {formatMoney(balance, product.currency)}</p>
      ) : null}
    </div>
  );
}
