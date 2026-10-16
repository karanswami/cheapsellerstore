import { SiteHeader } from "@/components/site-header";
import { ProductGrid } from "@/components/product-grid";
import { getCurrentUser } from "@/lib/auth/customer";
import { getActiveBanners } from "@/lib/banners";
import { formatMoney } from "@/lib/currencies";
import { getLikeStates } from "@/lib/likes";
import { roleLabel } from "@/lib/roles";
import { getProductsPage } from "@/lib/products";
import { getSiteConfig } from "@/lib/site-config";
import type { ProductCardData } from "@/types/product";

export const dynamic = "force-dynamic";

async function loadProducts(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
): Promise<ProductCardData[]> {
  try {
    const { products } = await getProductsPage({
      limit: 48,
      role: user?.role ?? "USER",
      userId: user?.id,
    });
    const likes = await getLikeStates(products.map((p) => p.id), user?.id);
    return products.map((p) => ({
      ...p,
      likeCount: likes.get(p.id)?.count ?? 0,
      liked: likes.get(p.id)?.liked ?? false,
    }));
  } catch (error) {
    console.error("HOME_PRODUCTS_LOAD_FAILED", error);
    return [];
  }
}

export default async function Home() {
  const user = await getCurrentUser();
  const [config, banners, products] = await Promise.all([
    getSiteConfig(),
    getActiveBanners(),
    loadProducts(user),
  ]);

  return (
    <>
      <SiteHeader
        config={config}
        user={
          user
            ? {
                name: user.name,
                username: user.username,
                role: user.role,
                roleLabel: roleLabel(user.role),
                balance: formatMoney(user.walletBalance, user.currency),
              }
            : null
        }
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-12">
        <h1 className="sr-only">{config.siteName}</h1>

        {banners.length > 0 ? (
          <section
            aria-label="Banners"
            className="-mx-4 mb-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
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
        ) : null}

        <div id="products" className="scroll-mt-24">
          <ProductGrid products={products} loggedIn={Boolean(user)} balance={user ? user.walletBalance : null} />
        </div>
      </main>
    </>
  );
}
