"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  Code2,
  Boxes,
  ChevronsUpDown,
  Clock,
  FileText,
  HelpCircle,
  ImageIcon,
  Flag,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ScrollText,
  Settings,
  Sparkles,
  BadgePercent,
  CreditCard,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ADMIN_LIVE_EVENT, adminFetch } from "@/components/admin/kit";
import type { AdminSidebarBadges } from "@/lib/sidebar-stats";
import { cn } from "@/lib/utils";

type Badges = AdminSidebarBadges | null;
type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: (b: AdminSidebarBadges) => number };
type NavGroup = { label: string; items: NavItem[] };

// Add new admin pages here; desktop sidebar and mobile sheet both read this list.
const NAV: NavGroup[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: (b) => b.pendingOrders },
      { href: "/admin/deposits", label: "Pending deposits", icon: Wallet, badge: (b) => b.pendingDeposits },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Boxes },
      { href: "/admin/keys", label: "Keys", icon: KeyRound },
      { href: "/admin/promos", label: "Promos & flash sales", icon: Tag },
      { href: "/admin/spin", label: "Reward spin", icon: Sparkles },
      { href: "/admin/special-prices", label: "Special prices", icon: BadgePercent },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/sellers", label: "Sellers", icon: Store, badge: (b) => b.pendingSellers },
      { href: "/admin/developer-api", label: "Developer API", icon: Code2 },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/admin/reports", label: "Reports", icon: Flag, badge: (b) => b.openReports },
      { href: "/admin/broadcast", label: "Broadcast", icon: Megaphone },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/banners", label: "Banners", icon: ImageIcon },
      { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
      { href: "/admin/pages", label: "Pages", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settlements", label: "Finance", icon: BadgeDollarSign, badge: (b) => b.pendingDevSettlements + b.pendingSpecialSettlements },
      { href: "/admin/cron", label: "Cron jobs", icon: Clock },
      { href: "/admin/logs", label: "Logs", icon: ScrollText },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ALL = NAV.flatMap((g) => g.items);

type Props = {
  siteName: string;
  user: { name: string; username: string };
  initialBadges: Badges;
  children: React.ReactNode;
};

export function AdminShell({ siteName, user, initialBadges, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [badges, setBadges] = useState<Badges>(initialBadges);
  const [open, setOpen] = useState(false);

  // Nav badges: reload on route change and on any live change.
  useEffect(() => {
    let live = true;
    const load = () =>
      adminFetch<{ adminBadges?: AdminSidebarBadges }>("/api/admin/sidebar-stats")
        .then((d) => live && d.adminBadges && setBadges(d.adminBadges))
        .catch(() => {});
    void load();
    const t = setInterval(load, 60_000);
    window.addEventListener("admin:badges-refresh", load);
    window.addEventListener(ADMIN_LIVE_EVENT, load);
    return () => {
      live = false;
      clearInterval(t);
      window.removeEventListener("admin:badges-refresh", load);
      window.removeEventListener(ADMIN_LIVE_EVENT, load);
    };
  }, [pathname]);

  // Live sync: poll a fingerprint; on change re-render server data and tell list hooks to refetch.
  useEffect(() => {
    let alive = true;
    let inFlight = false;
    let prev: string | null = null;
    async function check() {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const { stamp } = await adminFetch<{ stamp: string }>("/api/admin/live");
        if (!alive) return;
        const last = prev;
        prev = stamp;
        if (last === null || last === stamp) return;
        router.refresh();
        window.dispatchEvent(new Event(ADMIN_LIVE_EVENT));
      } catch {
        // offline: retry next tick
      } finally {
        inFlight = false;
      }
    }
    void check();
    const t = setInterval(() => void check(), 5000);
    const onShow = () => void check();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    window.addEventListener("online", onShow);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("online", onShow);
    };
  }, [router]);

  const active = ALL.filter((it) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`))).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const nav = (
    <SidebarNav siteName={siteName} badges={badges} activeHref={active?.href} onNavigate={() => setOpen(false)} />
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-card/50 lg:flex">{nav}</aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 max-w-[85vw] flex-col p-0">
          <SheetTitle className="sr-only">Admin menu</SheetTitle>
          {nav}
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-xl sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
          <h2 className="font-display text-lg font-semibold">{active?.label ?? "Admin"}</h2>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
              <Link href="/app">
                <ArrowLeft /> Back to app
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-brand-gradient text-sm font-bold text-primary-foreground">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">@{user.username} · Admin</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app">
                    <ArrowLeft /> Back to app
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({
  siteName,
  badges,
  activeHref,
  onNavigate,
}: {
  siteName: string;
  badges: Badges;
  activeHref?: string;
  onNavigate: () => void;
}) {
  return (
    <>
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2.5 px-5 pb-3 pt-4">
        <span className="bg-brand-gradient grid size-8 shrink-0 place-items-center rounded-lg text-primary-foreground">
          <ShieldCheck className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-base font-bold leading-tight">{siteName}</span>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Admin panel</span>
        </span>
      </Link>
      <ScrollArea className="min-h-0 flex-1">
        <nav className="space-y-4 px-3 pb-4 pt-2">
          {NAV.map((g) => (
            <div key={g.label}>
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map((it) => {
                  const on = activeHref === it.href;
                  const count = badges && it.badge ? it.badge(badges) : 0;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={onNavigate}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        on ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <it.icon className="size-4" />
                      <span className="flex-1">{it.label}</span>
                      {count > 0 ? (
                        <Badge variant="warning" shape="pill">
                          {count > 99 ? "99+" : count}
                        </Badge>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </>
  );
}

