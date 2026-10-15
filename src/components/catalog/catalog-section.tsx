"use client";

import { CategoryTabs } from "@/components/catalog/category-tabs";
import { ProductGridFeed } from "@/components/catalog/product-grid-feed";
import { ProductGridSkeleton } from "@/components/app/app-page-skeleton";
import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import type { ProductCardData } from "@/types/product";
import { Store } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type CatalogSectionProps = {
  categories: Category[];
  initialProducts: ProductCardData[];
  initialHasMore: boolean;
  initialTotal: number;
  categorySlug?: string;
  basePath?: string;
};

type CachedData = {
  products: ProductCardData[];
  page: number;
  total: number;
  hasMore: boolean;
};

export function CatalogSection({
  categories,
  initialProducts,
  initialHasMore,
  initialTotal,
  categorySlug,
  basePath = "/",
}: CatalogSectionProps) {
  const [activeSlug, setActiveSlug] = useState<string | undefined>(categorySlug);
  const [products, setProducts] = useState<ProductCardData[]>(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  // Client memory cache to store category responses
  const cacheRef = useRef<Map<string, CachedData>>(new Map());
  const activeSlugRef = useRef<string | undefined>(activeSlug);
  activeSlugRef.current = activeSlug;

  const getCacheKey = (slug?: string) => slug || "all";

  // Store initial SSR data into cache
  useEffect(() => {
    const key = getCacheKey(categorySlug);
    cacheRef.current.set(key, {
      products: initialProducts,
      page: 1,
      total: initialTotal,
      hasMore: initialHasMore,
    });
  }, [categorySlug, initialProducts, initialHasMore, initialTotal]);

  // Sync state if categorySlug or initial data changes externally
  useEffect(() => {
    setActiveSlug(categorySlug);
    setProducts(initialProducts);
    setHasMore(initialHasMore);
    setTotal(initialTotal);
  }, [categorySlug, initialProducts, initialHasMore, initialTotal]);

  const prefetchCategory = useCallback(async (slug?: string) => {
    const key = slug || "all";
    if (cacheRef.current.has(key)) return;

    try {
      const params = new URLSearchParams({ page: "1", limit: "12" });
      if (slug) params.set("category", slug);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) return;
      const body = (await res.json()) as { data?: CachedData };
      if (body.data) {
        cacheRef.current.set(key, {
          products: body.data.products,
          page: body.data.page,
          total: body.data.total,
          hasMore: body.data.hasMore,
        });
      }
    } catch {
      // ignore prefetch errors
    }
  }, []);

  const selectCategory = useCallback(
    async (slug?: string) => {
      if (slug === activeSlugRef.current && !isCategoryLoading) return;

      const key = slug || "all";
      setActiveSlug(slug);

      // Update URL search params cleanly without full page re-render delay
      try {
        const url = new URL(window.location.href);
        if (slug) {
          url.searchParams.set("category", slug);
        } else {
          url.searchParams.delete("category");
        }
        url.hash = "store";
        window.history.pushState(null, "", url.toString());
      } catch {
        // pushState safety
      }

      // Check cache first
      const cached = cacheRef.current.get(key);
      if (cached) {
        setProducts(cached.products);
        setTotal(cached.total);
        setHasMore(cached.hasMore);
        setIsCategoryLoading(false);
        setLoadingSlug(null);
        return;
      }

      // If not cached, trigger instant skeleton loading state
      setIsCategoryLoading(true);
      setLoadingSlug(slug ?? null);

      try {
        const params = new URLSearchParams({ page: "1", limit: "12" });
        if (slug) params.set("category", slug);
        const res = await fetch(`/api/products?${params}`);
        const body = (await res.json()) as { data?: CachedData };

        if (res.ok && body.data) {
          const fetchedData: CachedData = {
            products: body.data.products,
            page: body.data.page,
            total: body.data.total,
            hasMore: body.data.hasMore,
          };
          cacheRef.current.set(key, fetchedData);

          if (activeSlugRef.current === slug) {
            setProducts(fetchedData.products);
            setTotal(fetchedData.total);
            setHasMore(fetchedData.hasMore);
          }
        }
      } catch {
        // keep old products if fetch fails
      } finally {
        if (activeSlugRef.current === slug) {
          setIsCategoryLoading(false);
          setLoadingSlug(null);
        }
      }
    },
    [isCategoryLoading],
  );

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category") ?? undefined;
      if (cat !== activeSlugRef.current) {
        void selectCategory(cat);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectCategory]);

  return (
    <div className="space-y-3.5">
      <HubHeaderBar
        icon={<Store />}
        title="Store"
        description="Catalog priced in USD"
        stats={[
          {
            label: "Products",
            value: String(total),
            tone: "accent",
          },
        ]}
        statsLabel="Store summary"
      />
      <CategoryTabs
        categories={categories}
        activeSlug={activeSlug}
        basePath={basePath}
        onSelectCategory={selectCategory}
        onPrefetchCategory={prefetchCategory}
        loadingSlug={loadingSlug}
      />
      <div className="pb-2">
        {isCategoryLoading ? (
          <div className="pt-2">
            <ProductGridSkeleton count={6} />
          </div>
        ) : (
          <ProductGridFeed
            initialProducts={products}
            initialHasMore={hasMore}
            initialTotal={total}
            categorySlug={activeSlug}
            pageSize={12}
          />
        )}
      </div>
    </div>
  );
}
