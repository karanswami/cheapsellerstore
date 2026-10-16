import { Flame, Megaphone, ReceiptText, Wallet, KeyRound, Hourglass, ShoppingBag } from "lucide-react";
import { ProductGrid } from "@/components/product-grid";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/customer";
import { listActiveBroadcastsForRole } from "@/lib/broadcasts";
import { formatMoney } from "@/lib/currencies";
import { listActiveFlashSales, pickFlashSale } from "@/lib/flash-sales";
import { getUserActivityHistoryPage } from "@/lib/history";
import { getLikeStates } from "@/lib/likes";
import { getProductsPage } from "@/lib/products";
import { roleLabel } from "@/lib/roles";
import { getCustomerSidebarStats } from "@/lib/sidebar-stats";
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

export default async function AppHome() {
  const user = (await getCurrentUser())!;
  const [products, stats, broadcasts, sales, activity] = await Promise.all([
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
  ]);

  const firstName = user.name.split(" ")[0];
  const globalSale = pickFlashSale(sales, { role: user.role });
  const tiles = [
    { label: "Orders", value: stats?.orders ?? 0, icon: ShoppingBag },
    { label: "Keys owned", value: stats?.keys ?? 0, icon: KeyRound },
    { label: "Deposits", value: stats?.deposits ?? 0, icon: ReceiptText },
    { label: "Pending", value: stats?.customerBadges?.pendingDeposits ?? 0, icon: Hourglass },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-7">
        <div className="grid-bg absolute inset-0 opacity-30 [mask-image:linear-gradient(to_right,black,transparent)]" />
        <div className="absolute -right-10 -top-10 size-56 rounded-full bg-primary/25 blur-[90px]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight">Dashboard</p>
              <Badge variant="muted">{roleLabel(user.role)}</Badge>
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
              {greeting()}, <span className="text-gradient">{firstName}</span>
            </h1>
            <p className="mt-2 text-muted-foreground">Pick a product below to get started.</p>
          </div>
          <div className="flex items-center gap-4 rounded-xl border bg-background/60 px-5 py-4 backdrop-blur">
            <Wallet className="size-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Wallet balance</p>
              <p className="font-display text-3xl font-bold leading-none">
                {formatMoney(user.walletBalance, user.currency)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Your numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <t.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold leading-none">{t.value}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{t.label}</p>
            </div>
          </div>
        ))}
      </section>

      {globalSale ? (
        <section className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <Flame className="size-5 shrink-0 text-warning" />
          <p className="text-sm">
            <span className="font-semibold">{globalSale.title}</span> — {globalSale.discountPercent}% off, applied
            automatically at checkout.
          </p>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Announcements" className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Megaphone className="size-4 text-highlight" /> Announcements
          </h2>
          {broadcasts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No announcements right now.</p>
          ) : (
            <ul className="space-y-3">
              {broadcasts.slice(0, 3).map((b) => (
                <li key={b.id} className="rounded-lg bg-muted/60 p-3">
                  <p className="text-sm font-semibold">{b.title}</p>
                  <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">{b.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Recent activity" className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <ReceiptText className="size-4 text-primary" /> Recent activity
          </h2>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity yet — your first order will show up here.</p>
          ) : (
            <ul className="divide-y">
              {activity.map((a) => (
                <li key={`${a.kind}-${a.id}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.subtitle} · {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
                    </p>
                  </div>
                  {a.amount != null ? (
                    <span className={a.amount < 0 ? "text-sm font-semibold" : "text-sm font-semibold text-success"}>
                      {a.amount < 0 ? "−" : "+"}
                      {formatMoney(Math.abs(a.amount))}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ProductGrid products={products} loggedIn balance={user.walletBalance} />
    </div>
  );
}
