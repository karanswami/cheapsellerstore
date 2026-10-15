"use client";

import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductGridSkeleton } from "@/components/app/app-page-skeleton";
import { Button } from "@/components/ui/button";
import type { ProductCardData } from "@/types/product";
import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ProductsApiData = {
  products: ProductCardData[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

type ProductGridFeedProps = {
  initialProducts: ProductCardData[];
  initialHasMore: boolean;
  initialTotal: number;
  categorySlug?: string;
  pageSize?: number;
};

export function ProductGridFeed({
  initialProducts,
  initialHasMore,
  initialTotal,
  categorySlug,
  pageSize = 12,
}: ProductGridFeedProps) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when SSR category / first page changes (navigation).
  useEffect(() => {
    setProducts(initialProducts);
    setPage(1);
    setHasMore(initialHasMore);
    setTotal(initialTotal);
  }, [initialProducts, initialHasMore, initialTotal, categorySlug]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(pageSize),
      });
      if (categorySlug) params.set("category", categorySlug);
      const res = await fetch(`/api/products?${params}`);
      const body = (await res.json()) as {
        data?: ProductsApiData;
        error?: { message?: string };
      };
      if (!res.ok || !body.data) {
        throw new Error(body.error?.message ?? "Could not load products");
      }
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const appended = body.data!.products.filter((p) => !seen.has(p.id));
        return [...prev, ...appended];
      });
      setPage(body.data.page);
      setHasMore(body.data.hasMore);
      setTotal(body.data.total);
    } catch {
      // Keep current list; user can tap Load more again.
    } finally {
      setLoadingMore(false);
    }
  }, [categorySlug, hasMore, loadingMore, page, pageSize]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, products.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <p className="hidden text-xs text-muted-foreground sm:block">
          Showing {products.length}
          {total > products.length ? ` of ${total}` : ""} item
          {total === 1 ? "" : "s"}
        </p>
      </div>
      <ProductGrid products={products} />
      {loadingMore ? <ProductGridSkeleton count={3} /> : null}
      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? (
              <LoaderCircle className="size-4 animate-spin" data-icon="inline-start" />
            ) : null}
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
