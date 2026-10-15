import { BioBuilderView } from "@/components/app/bio-builder/bio-builder-view";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { getSessionUserId, toSafeUser } from "@/lib/auth/customer";
import { getProductsByIds } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { ensureReferralCode } from "@/lib/referral-code";
import { getPremiumPriceUsd } from "@/lib/settings";
import { redirect } from "next/navigation";

export const metadata = {
  title: "VIP Access & Bio Storefront · Drip",
  description: "Unlock VIP perks, manage your personal Bento bio storefront and custom subdomain.",
};

export default async function BioBuilderPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/?auth=login&next=/app/bio");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orders: {
        where: { status: { in: ["PAID", "FULFILLED"] } },
        select: { id: true, total: true },
      },
      reviews: {
        where: { status: "APPROVED" },
        select: { rating: true },
      },
    },
  });

  if (!user || user.banned) {
    redirect("/app");
  }

  // Fetch all products for the catalog showcase picker
  const activeProducts = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      category: { select: { name: true } },
    },
    orderBy: [{ isPinned: "desc" }, { isBestSeller: "desc" }, { createdAt: "desc" }],
  });

  const featuredProductsData =
    user.featuredProducts?.length
      ? await getProductsByIds(user.featuredProducts)
      : [];

  const totalSpent = user.orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const avgRating =
    user.reviews.length > 0
      ? user.reviews.reduce((sum, r) => sum + r.rating, 0) / user.reviews.length
      : null;

  const [referralCode, premiumPriceUsd] = await Promise.all([
    ensureReferralCode(user.id),
    getPremiumPriceUsd(),
  ]);

  return (
    <HubPageShell>
      <BioBuilderView
        initialUser={toSafeUser({ ...user, referralCode })}
        catalogProducts={activeProducts}
        featuredProductsData={featuredProductsData}
        orderCount={user.orders.length}
        totalSpent={totalSpent}
        averageRating={avgRating}
        vouchCount={user.reviews.length}
        referralCode={referralCode}
        premiumPriceUsd={premiumPriceUsd}
      />
    </HubPageShell>
  );

}
