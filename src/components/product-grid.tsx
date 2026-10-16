"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/types/product";

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category?.name).filter((n): n is string => !!n)))],
    [products],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (category === "All" || p.category?.name === category) &&
        (!q || p.title.toLowerCase().includes(q)),
    );
  }, [products, category, query]);

  return (
    <section aria-label="Products" className="mt-10">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl font-bold">All products</h2>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="pl-9"
          />
        </div>
      </div>

      {categories.length > 2 ? (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-all hover:border-primary/50 hover:text-foreground",
                category === c
                  ? "border-transparent bg-brand-gradient text-primary-foreground glow-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          {products.length === 0 ? "No products available right now." : "Nothing matches your search."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
