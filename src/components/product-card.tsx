"use client";

import Link from "next/link";
import { memo, useCallback, useMemo, useState } from "react";
import { Flame, Gamepad2, Heart, ShoppingBag, Sparkles, Wrench } from "lucide-react";
import { DurationSelect } from "@/components/duration-select";
import { FlashStrip } from "@/components/flash-strip";
import { LikeButton, useLike } from "@/components/like-button";
import { QuickBuy } from "@/components/quick-buy";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/types/product";

type Props = {
  product: ProductCardData;
  loggedIn: boolean;
  balance: number | null;
  onPaid: (spent: number) => void;
};

function ProductCardImpl({ product: p, loggedIn, balance, onPaid }: Props) {
  const [sold, setSold] = useState<Record<string, number>>({});
  const durations = useMemo(
    () => p.durations.map((d) => ({ ...d, stock: Math.max(0, d.stock - (sold[d.id] ?? 0)) })),
    [p.durations, sold],
  );
  const firstBuyable = durations.find((d) => d.stock > 0 && d.price != null);
  const [pickedId, setPickedId] = useState(firstBuyable?.id ?? durations[0]?.id ?? "");
  const selected = durations.find((d) => d.id === pickedId) ?? firstBuyable ?? durations[0];
  const [menuOpen, setMenuOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [burst, setBurst] = useState(0);

  const like = useLike(p.id, p.liked ?? false, p.likeCount ?? 0, loggedIn);

  const totalStock = durations.reduce((s, d) => s + d.stock, 0);
  const soldOut = !p.isMaintenance && totalStock === 0;
  const canBuy = !p.isMaintenance && !!selected && selected.stock > 0 && selected.price != null;
  const price = selected?.price ?? p.startingPrice;
  const list = selected?.listPrice ?? null;
  const onSale = price != null && list != null && list > price;
  const saleInfo = selected?.flashSale ?? p.flashSale;

  const tags = [
    p.isBestSeller ? { label: "Best seller", icon: Flame } : null,
    p.isNew ? { label: "New", icon: Sparkles } : null,
  ].filter((t): t is { label: string; icon: typeof Flame } => t !== null);

  const stockInfo = p.isMaintenance
    ? { text: "Under maintenance", cls: "bg-zinc-800 text-white" }
    : !selected || selected.stock <= 0
      ? { text: "Out of stock", cls: "bg-destructive text-white" }
      : selected.stock <= 5
        ? { text: `Only ${selected.stock} left`, cls: "bg-warning text-black" }
        : { text: "In stock", cls: "bg-success text-white" };

  function doubleTapLike() {
    setBurst((n) => n + 1);
    void like.toggle(true);
  }

  const handlePaid = useCallback(
    ({ qty, spent }: { qty: number; spent: number }) => {
      if (selected) setSold((s) => ({ ...s, [selected.id]: (s[selected.id] ?? 0) + qty }));
      onPaid(spent);
    },
    [selected, onPaid],
  );

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card shadow-sm transition-shadow duration-200 hover:shadow-lg",
        p.isMaintenance && "border-dashed border-foreground/30",
        !menuOpen && "cv-auto",
        menuOpen && "z-30",
      )}
    >
      <div
        className="relative aspect-[16/11] select-none overflow-hidden rounded-t-2xl bg-muted"
        onDoubleClick={p.isMaintenance ? undefined : doubleTapLike}
      >
        <Link href={`/product/${p.id}`} aria-label={p.title} className="absolute inset-0">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className={cn("h-full w-full object-cover", (soldOut || p.isMaintenance) && "grayscale")}
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-primary/20 via-muted to-card">
              <Gamepad2 className="size-12 text-foreground/40" />
            </div>
          )}
        </Link>

        {p.isMaintenance ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-1.5 px-4 text-center text-white">
              <span className="grid size-11 place-items-center rounded-full bg-white/15 ring-1 ring-white/30">
                <Wrench className="size-5" />
              </span>
              <p className="text-sm font-bold">Under maintenance</p>
              <p className="text-[11px] text-white/75">Purchases are paused. Back soon.</p>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white [&_svg]:size-3"
              >
                <t.icon /> {t.label}
              </span>
            ))}
          </div>
          {onSale && p.flashSale && !p.isMaintenance ? (
            <span className="shrink-0 rounded-full bg-warning px-2.5 py-1 text-[11px] font-bold text-black">
              -{selected?.flashSale?.discountPercent ?? p.flashSale.discountPercent}%
            </span>
          ) : null}
        </div>

        <span
          className={cn(
            "pointer-events-none absolute bottom-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm",
            stockInfo.cls,
          )}
        >
          {!soldOut && !p.isMaintenance && selected && selected.stock > 0 ? (
            <span className="relative grid size-2 place-items-center">
              <span className="anim-ping absolute size-2 rounded-full bg-current opacity-60" />
              <span className="size-1.5 rounded-full bg-current" />
            </span>
          ) : null}
          {stockInfo.text}
        </span>

        {burst > 0 ? (
          <Heart
            key={burst}
            aria-hidden
            className="anim-heart-burst pointer-events-none absolute left-1/2 top-1/2 -ml-10 -mt-10 size-20 fill-white text-white drop-shadow-lg"
          />
        ) : null}
      </div>

      {onSale && saleInfo && !p.isMaintenance ? (
        <FlashStrip title={saleInfo.title} percent={saleInfo.discountPercent} endsAt={saleInfo.expiresAt} />
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {p.category?.name ?? "Product"}
            </p>
            <LikeButton liked={like.liked} count={like.count} pop={like.pop} onToggle={() => void like.toggle()} className="-mr-2 -my-1" />
          </div>
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.75rem] font-display text-lg font-bold leading-snug">
            <Link href={`/product/${p.id}`} className="hover:text-primary">{p.title}</Link>
          </h3>
        </div>

        <div className="mt-auto space-y-3">
          <DurationSelect
            options={durations}
            value={selected?.id ?? ""}
            onChange={setPickedId}
            disabled={p.isMaintenance || soldOut}
            onOpenChange={setMenuOpen}
          />

          <div className="flex items-center justify-between gap-3">
            <div className={cn("min-w-0", p.isMaintenance && "opacity-60")}>
              <p className="font-display text-2xl font-bold leading-none tabular-nums">
                {price != null ? formatMoney(price, p.currency) : "—"}
              </p>
              {onSale ? (
                <p className="mt-1 text-xs text-muted-foreground line-through">{formatMoney(list!, p.currency)}</p>
              ) : null}
            </div>

            {!canBuy ? (
              <button
                disabled
                aria-disabled
                className="inline-flex h-11 shrink-0 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-xl bg-muted px-4 text-sm font-semibold text-muted-foreground"
              >
                {p.isMaintenance ? <Wrench className="size-4" /> : null}
                {p.isMaintenance ? "Unavailable" : "Out of stock"}
              </button>
            ) : !loggedIn ? (
              <Link
                href="/login?next=%2F"
                className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
              >
                Sign in to buy
              </Link>
            ) : (
              <button
                onClick={() => setBuying(true)}
                className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform hover:brightness-110 active:scale-95"
              >
                <ShoppingBag className="size-4" /> Buy now
              </button>
            )}
          </div>
        </div>
      </div>

      {buying && selected && canBuy ? (
        <QuickBuy
          title={p.title}
          imageUrl={p.imageUrl}
          currency={p.currency}
          duration={selected}
          balance={balance ?? 0}
          onClose={() => setBuying(false)}
          onPaid={handlePaid}
        />
      ) : null}
    </article>
  );
}

export const ProductCard = memo(ProductCardImpl);
