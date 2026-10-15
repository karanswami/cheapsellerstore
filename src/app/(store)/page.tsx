import {
  BannerSlotSuspended,
  CatalogSlotSuspended,
} from "@/components/catalog/store-catalog-slots";
import { Bolt, LifeBuoy, ShieldCheck } from "lucide-react";

type HomeProps = {
  searchParams: Promise<{ category?: string }>;
};

const PERKS = [
  { icon: Bolt, title: "Keys in seconds", text: "Pay from your wallet and the key shows up right away." },
  { icon: ShieldCheck, title: "Replacement cover", text: "Report a bad key and we sort it out." },
  { icon: LifeBuoy, title: "Help when stuck", text: "Open the chat button for step-by-step support." },
];

export default async function Home({ searchParams }: HomeProps) {
  const { category } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 pb-10 pt-8 sm:pt-12">
      {category ? null : (
        <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div className="space-y-4">
            <h1 className="font-heading text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
              Game keys and digital tools,
              <br />
              <span className="text-muted-foreground">priced to be cheap.</span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              Pick a product, choose a duration, pay from your wallet. Your key is ready before you leave the page.
            </p>
            <a
              href="#store"
              className="inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm font-bold text-background"
            >
              Browse the store
            </a>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border">
            {PERKS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3 bg-card p-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-heading text-sm font-bold">{title}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <BannerSlotSuspended />
      <CatalogSlotSuspended categorySlug={category} basePath="/" />
    </main>
  );
}
