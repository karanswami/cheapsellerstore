import {
  BannerSlotSuspended,
  CatalogSlotSuspended,
} from "@/components/catalog/store-catalog-slots";

type HomeProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { category } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-6">
      <BannerSlotSuspended />
      <CatalogSlotSuspended categorySlug={category} basePath="/" />
    </main>
  );
}
