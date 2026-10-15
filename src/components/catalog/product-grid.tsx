import { ProductCard } from "@/components/catalog/product-card";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductCardData } from "@/types/product";

type ProductGridProps = {
  products: ProductCardData[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <p className="text-sm font-medium">No products here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another category or check back soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 pb-14 sm:gap-5 sm:pb-0 lg:grid-cols-3">
      {products.map((product) => (
        <div key={product.id} className="min-w-0 h-full">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
