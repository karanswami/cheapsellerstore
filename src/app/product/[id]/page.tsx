import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flame, Gamepad2, KeyRound, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";
import { ProductBuy } from "@/components/product-buy";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/currencies";
import { getProductsByIds } from "@/lib/products";
import { roleLabel } from "@/lib/roles";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product] = await getProductsByIds([id]).catch(() => []);
  return { title: product?.title ?? "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();

  const [config, user] = await Promise.all([getSiteConfig(), getCurrentUser()]);
  const [p] = await getProductsByIds([id], "USD", user?.role ?? "USER", user?.id).catch(() => []);
  if (!p) notFound();

  const tag = p.isMaintenance
    ? { label: "Maintenance", icon: Wrench }
    : p.isBestSeller
      ? { label: "Best seller", icon: Flame }
      : p.isNew
        ? { label: "New", icon: Sparkles }
        : null;

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
        <Link
          href="/#products"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All products
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-x-12 lg:gap-y-10">
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border bg-muted shadow-xl shadow-black/5 lg:col-start-1 lg:row-start-1">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.title} className={`h-full w-full object-cover ${p.isMaintenance ? "grayscale" : ""}`} />
            ) : (
              <div className="grid h-full place-items-center bg-gradient-to-br from-primary/25 via-muted to-card">
                <Gamepad2 className="size-20 text-foreground/40" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
            {tag ? (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white [&_svg]:size-3.5">
                <tag.icon /> {tag.label}
              </span>
            ) : null}
          </div>

          <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
            <div className="mb-4 lg:hidden">
              {p.category ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{p.category.name}</p>
              ) : null}
              <h1 className="mt-1 font-display text-2xl font-bold leading-tight tracking-tight">{p.title}</h1>
            </div>
            <ProductBuy
              product={{
                id: p.id,
                title: p.title,
                currency: p.currency,
                isMaintenance: p.isMaintenance,
                durations: p.durations,
              }}
              loggedIn={Boolean(user)}
              balance={user ? user.walletBalance : null}
            />
          </aside>

          <div className="space-y-8 lg:col-start-1 lg:row-start-2">
            <div className="hidden lg:block">
              {p.category ? (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{p.category.name}</p>
              ) : null}
              <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight">{p.title}</h1>
            </div>

            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border bg-border text-center text-[11px] font-semibold sm:text-xs">
              {[
                { icon: Zap, t: "Instant delivery" },
                { icon: ShieldCheck, t: "Secure checkout" },
                { icon: KeyRound, t: "Key in your account" },
              ].map(({ icon: I, t }) => (
                <div key={t} className="flex flex-col items-center gap-1.5 bg-card px-2 py-4">
                  <I className="size-5 text-primary" /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
