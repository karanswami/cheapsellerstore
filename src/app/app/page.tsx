import Link from "next/link";
import { ChevronRight, Flame, Gift, History, KeyRound, Megaphone, ReceiptText, Sparkles, Wallet } from "lucide-react";
import { ActivityRow, QuickActions, SectionHeader, Surface, WalletCard } from "@/components/app-kit";
import { BannerCarousel } from "@/components/app-kit-client";
import { ProductGrid } from "@/components/product-grid";
import { getCurrentUser } from "@/lib/auth/customer";
import { getActiveBanners } from "@/lib/banners";
import { listActiveBroadcastsForRole } from "@/lib/broadcasts";
import { listActiveFlashSales, pickFlashSale } from "@/lib/flash-sales";
import { getUserActivityHistoryPage } from "@/lib/history";
import { getLikeStates } from "@/lib/likes";
import { getProductsPage } from "@/lib/products";
import { roleLabel } from "@/lib/roles";
import { getCustomerSidebarStats } from "@/lib/sidebar-stats";
import { countAvailableSpins, isSpinEnabled } from "@/lib/spin";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/types/history";
import type { ProductCardData } from "@/types/product";

export const dynamic = "force-dynamic";

// A failing widget must never take the whole home page down.
async function safe<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`APP_HOME_${label}_FAILED`, error);
    return fallback;
  }
}

function greeting(date = new Date()) {
  const h = date.getUTCHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function activityHref(a: ActivityItem) {
  if (a.kind === "order") return `/app/order/${a.id}`;
  if (a.kind === "deposit") return `/app/deposit/${a.id}`;
  return "/app/history";
}

export default async function AppHome() {
  const user = (await getCurrentUser())!;
  const [banners, products, stats, broadcasts, sales, activity, spins, spinOn] = await Promise.all([
    safe("BANNERS", () => getActiveBanners(), []),
    safe<ProductCardData[]>(
      "PRODUCTS",
      async () => {
        const { products } = await getProductsPage({ limit: 48, role: user.role, userId: user.id });
        const likes = await getLikeStates(products.map((p) => p.id), user.id);
        return products.map((p) => ({
          ...p,
          likeCount: likes.get(p.id)?.count ?? 0,
          liked: likes.get(p.id)?.liked ?? false,
        }));
      },
      [],
    ),
    safe("STATS", () => getCustomerSidebarStats(user.id), null),
    safe("BROADCASTS", () => listActiveBroadcastsForRole(user.role), []),
    safe("SALES", () => listActiveFlashSales(), []),
    safe<ActivityItem[]>("ACTIVITY", async () => (await getUserActivityHistoryPage(user.id, { limit: 5 })).items, []),
    safe("SPINS", () => countAvailableSpins(user.id), 0),
    safe("SPIN_ON", () => isSpinEnabled(), false),
  ]);

  const globalSale = pickFlashSale(sales, { role: user.role });

  return (
    <div className="space-y-7">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        <WalletCard
          balance={user.walletBalance}
          name={user.name}
          username={user.username}
          roleLabel={roleLabel(user.role)}
          greeting={greeting()}
          stats={[
            { label: "Orders", value: stats?.orders ?? 0 },
            { label: "Keys", value: stats?.keys ?? 0 },
            { label: "Deposits", value: stats?.deposits ?? 0 },
          ]}
        />

        <div className="space-y-5">
          <QuickActions
            items={[
              { href: "/app/deposit", label: "Add money", icon: Wallet, tone: "primary", badge: stats?.customerBadges?.pendingDeposits },
              { href: "/app/keys", label: "My keys", icon: KeyRound, tone: "amber" },
              { href: "/app/history", label: "History", icon: History, tone: "emerald" },
              { href: "/app/referral", label: "Spin & win", icon: Gift, tone: "rose", badge: spins },
            ]}
          />
          {spinOn ? <SpinTeaser spins={spins} /> : null}
        </div>
      </div>

      {globalSale ? (
        <section className="relative flex items-center gap-3 overflow-hidden rounded-3xl border border-orange-400/25 bg-gradient-to-r from-orange-500/20 via-rose-500/15 to-transparent p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-lg shadow-orange-500/30">
            <Flame className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{globalSale.title}</p>
            <p className="text-xs text-muted-foreground">Applied automatically at checkout</p>
          </div>
          <span className="shrink-0 font-display text-2xl font-bold text-orange-300">
            -{globalSale.discountPercent}%
          </span>
        </section>
      ) : null}

      <BannerCarousel banners={banners} />

      <ProductGrid products={products} loggedIn balance={user.walletBalance} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader title="Recent activity" icon={ReceiptText} href="/app/history" />
          <Surface className="p-2">
            {activity.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No activity yet. Your first order will show up here.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {activity.map((a) => (
                  <ActivityRow key={`${a.kind}-${a.id}`} item={a} href={activityHref(a)} />
                ))}
              </div>
            )}
          </Surface>
        </div>

        <div>
          <SectionHeader title="Announcements" icon={Megaphone} href={broadcasts.length > 3 ? "/app/broadcast" : undefined} />
          {broadcasts.length === 0 ? (
            <Surface className="px-4 py-10 text-center text-sm text-muted-foreground">No announcements right now.</Surface>
          ) : (
            <div className="space-y-2.5">
              {broadcasts.slice(0, 3).map((b, i) => (
                <Surface key={b.id} className="flex gap-3 p-4">
                  <span
                    className={cn(
                      "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
                      i === 0 ? "bg-brand-gradient text-primary-foreground" : "bg-muted text-highlight",
                    )}
                  >
                    <Megaphone className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{b.title}</p>
                    <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">{b.message}</p>
                  </div>
                </Surface>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Golden "you have spins" card, or a quieter invite nudge when there are none. */
function SpinTeaser({ spins }: { spins: number }) {
  if (spins > 0) {
    return (
      <Link
        href="/app/referral"
        className="tap group relative isolate flex items-center gap-4 overflow-hidden rounded-3xl border border-amber-300/30 bg-[radial-gradient(120%_140%_at_0%_50%,#5b2a0a_0%,#2a1206_55%,#140904_100%)] p-4 text-white"
      >
        <div
          aria-hidden
          className="sw-rays absolute -left-24 top-1/2 -z-10 size-72 -translate-y-1/2 rounded-full [background:repeating-conic-gradient(rgb(251_191_36/0.14)_0deg_8deg,transparent_8deg_18deg)] [mask-image:radial-gradient(circle,black_15%,transparent_65%)]"
        />
        {/* mini wheel */}
        <span className="relative grid size-16 shrink-0 place-items-center">
          <span className="sw-halo absolute inset-0 rounded-full border-[3px] border-amber-300 [background:conic-gradient(#ff4d6d_0_45deg,#ffc233_0_90deg,#34d399_0_135deg,#4f9dff_0_180deg,#c084fc_0_225deg,#22d3ee_0_270deg,#fb923c_0_315deg,#a3e635_0_360deg)] shadow-[0_0_24px_rgb(251_191_36/0.5)]" />
          <span className="relative grid size-6 place-items-center rounded-full bg-amber-300 text-[#1a0b04] shadow">
            <Sparkles className="size-3.5" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/80">Free spin ready</p>
          <p className="font-display text-xl font-bold leading-tight">
            You have {spins} {spins === 1 ? "spin" : "spins"}
          </p>
          <p className="text-xs text-white/60">Win keys, wallet cash or coupons</p>
        </div>
        <span className="sw-glow-pulse grid size-10 shrink-0 place-items-center rounded-full bg-amber-300 text-[#1a0b04]">
          <ChevronRight className="size-5" />
        </span>
      </Link>
    );
  }
  return (
    <Link
      href="/app/referral"
      className="tap flex items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-card/60 p-4"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-400/30 to-rose-400/5 text-rose-300 ring-1 ring-inset ring-rose-300/25">
        <Gift className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Invite friends, earn free spins</p>
        <p className="text-xs text-muted-foreground">1 spin for every friend&rsquo;s first deposit</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
