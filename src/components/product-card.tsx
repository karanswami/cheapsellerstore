import { Flame, Gamepad2, Sparkles, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/currencies";
import type { ProductCardData } from "@/types/product";

export function ProductCard({ product: p }: { product: ProductCardData }) {
  const onSale =
    p.startingPrice != null && p.startingListPrice != null && p.startingListPrice > p.startingPrice;

  return (
    <article className="group overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:glow-primary">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={p.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-primary/30 to-card">
            <Gamepad2 className="size-12 text-foreground/70" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {p.isMaintenance ? (
            <Badge variant="muted"><Wrench /> Maintenance</Badge>
          ) : p.isBestSeller ? (
            <Badge variant="solid"><Flame /> Best seller</Badge>
          ) : p.isNew ? (
            <Badge variant="highlight"><Sparkles /> New</Badge>
          ) : null}
          {onSale && p.flashSale ? (
            <Badge variant="warning">-{p.flashSale.discountPercent}%</Badge>
          ) : null}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          {p.category ? <p className="text-xs text-muted-foreground">{p.category.name}</p> : null}
          <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug">{p.title}</h3>
        </div>
        {p.startingPrice != null ? (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">From</p>
            <p className="font-display text-2xl font-bold leading-none">
              {formatMoney(p.startingPrice, p.currency)}
              {onSale ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground line-through">
                  {formatMoney(p.startingListPrice!, p.currency)}
                </span>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
