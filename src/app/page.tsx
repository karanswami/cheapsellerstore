import { SiteHeader } from "@/components/site-header";
import { ProductGrid } from "@/components/product-grid";
import { getActiveBanners } from "@/lib/banners";
import { getProductsPage } from "@/lib/products";
import { getSiteConfig } from "@/lib/site-config";
import type { ProductCardData } from "@/types/product";

export const dynamic = "force-dynamic";

async function loadProducts(): Promise<ProductCardData[]> {
  try {
    return (await getProductsPage({ limit: 48 })).products;
  } catch (error) {
    console.error("HOME_PRODUCTS_LOAD_FAILED", error);
    return [];
  }
}

export default async function Home() {
  const [config, banners, products] = await Promise.all([
    getSiteConfig(),
    getActiveBanners(),
    loadProducts(),
  ]);

  return (
    <>
      <SiteHeader config={config} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
        <h1 className="sr-only">{config.siteName}</h1>

        {banners.length > 0 ? (
          <section
            aria-label="Banners"
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
          >
            {banners.map((b) => (
              <div
                key={b.id}
                className="aspect-[16/6] w-[88%] shrink-0 snap-center overflow-hidden rounded-2xl border bg-muted sm:w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </section>
        ) : (
          <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-12 sm:px-10 sm:py-16">
            <div className="grid-bg absolute inset-0 opacity-30 [mask-image:linear-gradient(to_right,black,transparent)]" />
            <div className="absolute -right-10 -top-10 size-64 rounded-full bg-primary/25 blur-[90px]" />
            <div className="absolute -bottom-16 right-1/4 size-56 rounded-full bg-highlight/20 blur-[90px]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight">
                {config.siteTagline}
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                <span className="text-gradient">{config.siteName}</span>
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground">{config.siteSeoDescription}</p>
            </div>
          </section>
        )}

        <div id="products" className="scroll-mt-24">
          <ProductGrid products={products} />
        </div>
      </main>
    </>
  );
}
