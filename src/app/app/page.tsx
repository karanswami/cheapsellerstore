import {
  BannerSlotSuspended,
  CatalogSlotSuspended,
} from "@/components/catalog/store-catalog-slots";
import { AppHomeShell } from "@/components/app/app-home-shell";
import { getCurrentUser } from "@/lib/auth/customer";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function AppHomePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app");

  const { category } = await searchParams;

  return (
    <AppHomeShell>
      <BannerSlotSuspended />
      <CatalogSlotSuspended
        categorySlug={category}
        basePath="/app"
        role={user.role}
        userId={user.id}
      />
    </AppHomeShell>
  );
}
