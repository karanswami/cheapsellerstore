"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Code2,
  Flag,
  Gamepad2,
  Gift,
  History,
  KeyRound,
  LogOut,
  Megaphone,
  Menu,
  ShieldCheck,
  Store,
  Trophy,
  User,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ShellUser = { name: string; username: string; role: string; roleLabel: string; balance: string; hasSellerPanel: boolean };

type Props = {
  siteName: string;
  user: ShellUser;
  children: React.ReactNode;
};

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; show?: (u: ShellUser) => boolean };
type NavGroup = { label: string; items: NavItem[] };

const wholesale = (u: ShellUser) => u.role === "SELLER" || u.role === "RESELLER" || u.role === "ADMIN";

// Add new customer pages here; sidebar (desktop) and drawer (mobile) both read this list.
const NAV: NavGroup[] = [
  { label: "Shop", items: [{ href: "/app", label: "Store", icon: Store, exact: true }] },
  {
    label: "Wallet",
    items: [
      { href: "/app/deposit", label: "Deposit", icon: Wallet },
      { href: "/app/history", label: "History", icon: History },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/keys", label: "Key vault", icon: KeyRound },
      { href: "/app/reports", label: "Reports", icon: Flag },
      { href: "/app/referral", label: "Referral", icon: Gift },
      { href: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/app/broadcast", label: "Broadcast", icon: Megaphone },
      { href: "/app/profile", label: "Profile", icon: User },
    ],
  },
  {
    label: "Admin",
    items: [{ href: "/admin", label: "Admin panel", icon: ShieldCheck, show: (u) => u.role === "ADMIN" }],
  },
  {
    label: "Business",
    items: [
      { href: "/app/become-seller", label: "Become a Seller", icon: Store, show: (u) => u.role === "USER" },
      { href: "/app/development", label: "Platform API", icon: Code2, show: wholesale },
      { href: "/app/seller", label: "Seller panel", icon: UsersRound, exact: true, show: (u) => u.hasSellerPanel },
      { href: "/app/seller/leaderboard", label: "Seller board", icon: Trophy, show: wholesale },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

export function AppShell({ siteName, user, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  // Overlays remember the path they were opened on, so navigating closes them without an effect.
  const [drawerAt, setDrawerAt] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const drawer = drawerAt === pathname;
  const menu = menuAt === pathname;
  const setDrawer = (open: boolean) => setDrawerAt(open ? pathname : null);
  const setMenu = (open: boolean) => setMenuAt(open ? pathname : null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Drawer: Escape to close + lock page scroll while open.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerAt(null);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  // Account dropdown: click outside to close.
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuAt(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const isActive = (it: NavItem) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`));
  const current =
    ALL_ITEMS.filter(isActive).sort((x, y) => y.href.length - x.href.length)[0]?.label ?? siteName;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-card/50 p-3 lg:flex">
        <SidebarContent siteName={siteName} user={user} isActive={isActive} onSignOut={signOut} />
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", drawer ? "" : "pointer-events-none")} aria-hidden={!drawer}>
        <div
          onClick={() => setDrawer(false)}
          className={cn("absolute inset-0 bg-black/60 transition-opacity duration-200", drawer ? "opacity-100" : "opacity-0")}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r bg-card p-3 shadow-2xl transition-transform duration-200",
            drawer ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            onClick={() => setDrawer(false)}
            aria-label="Close menu"
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <SidebarContent siteName={siteName} user={user} isActive={isActive} onSignOut={signOut} />
        </aside>
      </div>

      <div className="min-w-0">
        {/* Header (mobile + desktop) */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/app" className="flex min-w-0 items-center gap-2 lg:hidden">
            <Logo />
            <span className="truncate font-display text-base font-bold">{siteName}</span>
          </Link>
          <h2 className="hidden font-display text-lg font-semibold lg:block">{current}</h2>

          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-lg border bg-muted/60 px-3 py-1.5 text-sm font-semibold">
              <Wallet className="size-4 text-highlight" /> {user.balance}
            </span>
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenu(!menu)}
                aria-label="Account menu"
                aria-expanded={menu}
                className="bg-brand-gradient grid size-9 place-items-center rounded-lg text-sm font-bold text-primary-foreground outline-none ring-2 ring-transparent ring-offset-2 ring-offset-background transition-shadow hover:ring-primary/40 focus-visible:ring-ring/60"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
              {menu ? (
                <div className="absolute right-0 top-11 w-60 overflow-hidden rounded-xl border bg-popover p-1.5 shadow-2xl">
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{user.username} · {user.roleLabel}
                    </p>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <span className="bg-brand-gradient grid size-8 shrink-0 place-items-center rounded-lg text-primary-foreground">
      <Gamepad2 className="size-4" />
    </span>
  );
}

function SidebarContent({
  siteName,
  user,
  isActive,
  onSignOut,
}: {
  siteName: string;
  user: ShellUser;
  isActive: (it: NavItem) => boolean;
  onSignOut: () => void;
}) {
  return (
    <>
      <Link href="/app" className="mb-4 flex items-center gap-2.5 px-2 pt-1">
        <Logo />
        <span className="truncate font-display text-lg font-bold">{siteName}</span>
      </Link>
      <nav className="flex-1 space-y-4 overflow-y-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((g) => {
          const items = g.items.filter((it) => !it.show || it.show(user));
          if (items.length === 0) return null;
          // Longest matching href wins so /app/seller doesn't also light up /app/seller/leaderboard.
          const best = ALL_ITEMS.filter((it) => (!it.show || it.show(user)) && isActive(it)).sort((x, y) => y.href.length - x.href.length)[0];
          return (
            <div key={g.label}>
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.label}</p>
              <div className="space-y-0.5">
                {items.map((it) => {
                  const active = best?.href === it.href;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <it.icon className="size-4" /> {it.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="rounded-xl border bg-muted p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <Badge variant="muted">{user.roleLabel}</Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Wallet</p>
        <p className="font-display text-xl font-bold">{user.balance}</p>
        <button
          onClick={onSignOut}
          className="mt-2 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-3.5" /> Sign out
        </button>
      </div>
    </>
  );
}
