import { ProductGrid } from "@/components/product-grid";
import { getCurrentUser } from "@/lib/auth/customer";
import { getProductsPage } from "@/lib/products";
import type { ProductCardData } from "@/types/product";

export const dynamic = "force-dynamic";

async function loadProducts(): Promise<ProductCardData[]> {
  try {
    return (await getProductsPage({ limit: 48 })).products;
  } catch (error) {
    console.error("APP_PRODUCTS_LOAD_FAILED", error);
    return [];
  }
}

export default async function AppHome() {
  const [user, products] = await Promise.all([getCurrentUser(), loadProducts()]);
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-8 sm:px-8">
        <div className="grid-bg absolute inset-0 opacity-30 [mask-image:linear-gradient(to_right,black,transparent)]" />
        <div className="absolute -right-10 -top-10 size-56 rounded-full bg-primary/25 blur-[90px]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            Welcome back, <span className="text-gradient">{user?.name.split(" ")[0]}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Pick a product below to get started.</p>
        </div>
      </section>
      <ProductGrid products={products} />
    </>
  );
}
