"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Flag,
  Gamepad2,
  Gift,
  History,
  House,
  KeyRound,
  LayoutGrid,
  LogOut,
  Megaphone,
  Plus,
  ShieldCheck,
  Store,
  Trophy,
  User,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { BottomSheet } from "@/components/app-kit-client";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { feedbackTap } from "@/lib/feedback";
import { cn } from "@/lib/utils";

type ShellUser = {
  name: string;
  username: string;
  avatarUrl?: string | null;
  role: string;
  roleLabel: string;
  balance: string;
  hasSellerPanel: boolean;
};
type ShellBadges = { spins: number; pendingDeposits: number; activeReports: number };

type Props = {
  siteName: string;
  user: ShellUser;
  badges?: ShellBadges;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  show?: (u: ShellUser) => boolean;
  badge?: keyof ShellBadges;
};
type NavGroup = { label: string; items: NavItem[] };

const wholesale = (u: ShellUser) => u.role === "SELLER" || u.role === "RESELLER" || u.role === "ADMIN";

// Add new customer pages here; desktop sidebar and the mobile "More" sheet both read this list.
const NAV: NavGroup[] = [
  { label: "Shop", items: [{ href: "/app", label: "Store", icon: Store, exact: true }] },
  {
    label: "Wallet",
    items: [
      { href: "/app/deposit", label: "Deposit", icon: Wallet, badge: "pendingDeposits" },
      { href: "/app/history", label: "History", icon: History },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/keys", label: "Key vault", icon: KeyRound },
      { href: "/app/reports", label: "Reports", icon: Flag, badge: "activeReports" },
      { href: "/app/referral", label: "Invite & Spin", icon: Gift, badge: "spins" },
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

/** Mobile bottom bar. The centre slot is the raised Deposit button; "More" opens the sheet. */
const TABS: { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: keyof ShellBadges }[] = [
  { href: "/app", label: "Home", icon: House, exact: true },
  { href: "/app/keys", label: "Keys", icon: KeyRound },
  { href: "/app/deposit", label: "Add money", icon: Plus, badge: "pendingDeposits" },
  { href: "/app/referral", label: "Spin", icon: Gift, badge: "spins" },
];
/** Pages that are tab roots: the app bar shows the greeting instead of a back button. */
const ROOTS = new Set(TABS.map((t) => t.href));

/** Time-of-day greeting for the app bar (client clock; hydration warning suppressed at the call site). */
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const tap = () => feedbackTap({ impact: "selection", silent: true });

export function AppShell({ siteName, user, badges, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  // Overlays remember the path they were opened on, so navigating closes them without an effect.
  const [sheetAt, setSheetAt] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const sheet = sheetAt === pathname;
  const menu = menuAt === pathname;
  const setSheet = (open: boolean) => setSheetAt(open ? pathname : null);
  const setMenu = (open: boolean) => setMenuAt(open ? pathname : null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  function goBack() {
    tap();
    // Deep-linked pages have no in-app history to return to.
    if (window.history.length > 1) router.back();
    else router.push("/app");
  }

  const isActive = (it: { href: string; exact?: boolean }) =>
    it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);
  const current = ALL_ITEMS.filter(isActive).sort((x, y) => y.href.length - x.href.length)[0]?.label ?? siteName;
  const isRoot = ROOTS.has(pathname);
  const firstName = user.name.split(" ")[0];
  const moreActive = !TABS.some(isActive);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-card/50 p-3 lg:flex">
        <SidebarContent siteName={siteName} user={user} badges={badges} isActive={isActive} onSignOut={signOut} />
      </aside>

      <div className="min-w-0">
        {/* Mobile app bar: transparent at the top of the page, frosted glass once content slides under it */}
        <header
          data-scrolled={scrolled || undefined}
          className="app-chrome group/bar sticky top-0 z-50 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-300 data-[scrolled]:bg-background/90 data-[scrolled]:shadow-[0_10px_30px_-18px_rgb(0_0_0/0.9)] data-[scrolled]:backdrop-blur-xl lg:hidden"
        >
          <div className="flex h-[3.75rem] items-center gap-2.5 px-4">
            {isRoot ? (
              <Link href="/app/profile" onClick={tap} className="tap flex min-w-0 items-center gap-3">
                <span className="relative shrink-0 rounded-full bg-[conic-gradient(from_200deg,var(--primary),var(--highlight),var(--primary))] p-[2px]">
                  <UserAvatar src={user.avatarUrl} seed={user.username} className="size-9 rounded-full border-2 border-background" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-success" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span suppressHydrationWarning className="block text-[11px] font-medium text-muted-foreground">
                    {greeting()} 👋
                  </span>
                  <span className="block truncate font-display text-base font-bold tracking-tight">{firstName}</span>
                </span>
              </Link>
            ) : (
              <>
                <button
                  onClick={goBack}
                  aria-label="Back"
                  className="tap -ml-1 grid size-10 shrink-0 place-items-center rounded-2xl border border-white/[0.07] bg-card/80 text-foreground shadow-sm"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <h1 key={pathname} className="anim-title-in truncate font-display text-lg font-bold tracking-tight">
                  {current}
                </h1>
              </>
            )}
            <Link
              href="/app/deposit"
              onClick={tap}
              aria-label={`Wallet balance ${user.balance}, add money`}
              className="tap relative ml-auto flex shrink-0 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_55%,transparent),color-mix(in_oklab,var(--highlight)_45%,transparent))] p-px shadow-[0_6px_20px_-10px_var(--primary)]"
            >
              <span className="flex items-center gap-2 rounded-[calc(1rem-1px)] bg-card/95 py-1.5 pl-1.5 pr-2">
                <span className="bg-brand-gradient grid size-7 place-items-center rounded-xl text-primary-foreground">
                  <Wallet className="size-3.5" />
                </span>
                <span className="leading-none">
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Wallet</span>
                  <span className="mt-0.5 block font-display text-sm font-bold">{user.balance}</span>
                </span>
                <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-primary">
                  <Plus className="size-3" strokeWidth={3} />
                </span>
              </span>
            </Link>
          </div>
          {/* hairline that fades in with the glass */}
          <div className="h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--primary)_45%,transparent),color-mix(in_oklab,var(--highlight)_35%,transparent),transparent)] opacity-0 transition-opacity duration-300 group-data-[scrolled]/bar:opacity-100" />
        </header>

        {/* Desktop header */}
        <header className="sticky top-0 z-40 hidden h-14 items-center gap-2 border-b bg-background/80 px-6 backdrop-blur-xl lg:flex">
          <h2 className="font-display text-lg font-semibold">{current}</h2>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-lg border bg-muted/60 px-3 py-1.5 text-sm font-semibold">
              <Wallet className="size-4 text-highlight" /> {user.balance}
            </span>
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenu(!menu)}
                aria-label="Account menu"
                aria-expanded={menu}
                className="grid size-9 place-items-center overflow-hidden rounded-full outline-none ring-2 ring-transparent ring-offset-2 ring-offset-background transition-shadow hover:ring-primary/40 focus-visible:ring-ring/60"
              >
                <UserAvatar src={user.avatarUrl} seed={user.username} className="size-9 rounded-full" />
              </button>
              {menu ? (
                <div className="anim-pop-in absolute right-0 top-11 w-60 overflow-hidden rounded-xl border bg-popover p-1.5 shadow-2xl">
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{user.username} · {user.roleLabel}
                    </p>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <Link
                    href="/app/profile"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <User className="size-4" /> Profile
                  </Link>
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

        <main
          key={pathname}
          className="anim-page-in mx-auto w-full max-w-6xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:pb-8 lg:pt-8"
        >
          {children}
        </main>
      </div>

      <BottomBar isActive={isActive} moreActive={moreActive || sheet} badges={badges} onMore={() => {
          tap();
          setSheet(true);
        }} />
      <MoreSheet
        open={sheet}
        onClose={() => setSheet(false)}
        user={user}
        badges={badges}
        isActive={isActive}
        onSignOut={signOut}
      />
    </div>
  );
}

function BottomBar({
  isActive,
  moreActive,
  badges,
  onMore,
}: {
  isActive: (it: { href: string; exact?: boolean }) => boolean;
  moreActive: boolean;
  badges?: ShellBadges;
  onMore: () => void;
}) {
  const [home, keys, deposit, spin] = TABS;
  const depositActive = isActive(deposit);
  // Slot of the sliding highlight (0..4); the raised Deposit slot has its own state, so no pill there.
  const slot = moreActive ? 4 : isActive(home) ? 0 : isActive(keys) ? 1 : isActive(spin) ? 3 : -1;
  return (
    <nav aria-label="Main" className="app-chrome fixed inset-x-0 bottom-0 z-50 lg:hidden">
      {/* Solid fade under the dock so fast-scrolling content never shows around or through it */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(5.5rem+env(safe-area-inset-bottom))] bg-[linear-gradient(to_top,var(--background)_55%,transparent)]"
      />
      <div className="relative mx-auto max-w-md px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="relative rounded-[1.75rem] bg-[linear-gradient(160deg,rgb(255_255_255/0.14),rgb(255_255_255/0.03)_40%,color-mix(in_oklab,var(--primary)_30%,transparent))] p-px shadow-[0_18px_40px_-14px_rgb(0_0_0/0.85),0_0_0_1px_rgb(0_0_0/0.25)]">
          <div className="relative grid h-16 grid-cols-5 items-stretch rounded-[calc(1.75rem-1px)] bg-card">
            {/* top sheen */}
            <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.22),transparent)]" />
            {/* sliding active pill */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 w-1/5 p-1.5 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]",
                slot < 0 && "opacity-0",
              )}
              style={{ transform: `translateX(${Math.max(slot, 0) * 100}%)` }}
            >
              <span className="block h-full rounded-[1.25rem] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_22%,transparent),color-mix(in_oklab,var(--primary)_6%,transparent))] ring-1 ring-inset ring-primary/20">
                <span className="mx-auto block h-[3px] w-5 rounded-b-full bg-primary shadow-[0_0_10px_var(--primary)]" />
              </span>
            </span>

            <TabLink tab={home} active={isActive(home)} />
            <TabLink tab={keys} active={isActive(keys)} />
            <Link
              href={deposit.href}
              onClick={tap}
              aria-current={depositActive ? "page" : undefined}
              aria-label={deposit.label}
              className="tap group relative flex flex-col items-center justify-end pb-2"
            >
              <span className="absolute -top-6 grid size-[3.75rem] place-items-center rounded-full bg-background p-1.5">
                <span
                  className={cn(
                    "bg-brand-gradient glow-primary relative grid size-full place-items-center overflow-hidden rounded-full text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_8px_20px_-6px_var(--primary)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    depositActive ? "scale-105" : "group-active:scale-90",
                  )}
                >
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-white/15" />
                  <Plus
                    className={cn("relative size-6 transition-transform duration-300", depositActive && "rotate-90")}
                    strokeWidth={2.75}
                  />
                </span>
              </span>
              {badges?.pendingDeposits ? <Dot className="absolute right-[calc(50%-1.9rem)] -top-5" /> : null}
              <span className={cn("text-[10.5px] font-semibold", depositActive ? "text-primary" : "text-muted-foreground")}>
                {deposit.label}
              </span>
            </Link>
            <TabLink tab={spin} active={isActive(spin)} count={badges?.spins} />
            <button onClick={onMore} aria-label="More" className="tap relative flex flex-col items-center justify-center gap-1">
              <TabIcon icon={LayoutGrid} active={moreActive} />
              <span className={cn("text-[10.5px] font-semibold transition-colors", moreActive ? "text-foreground" : "text-muted-foreground")}>
                More
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function TabLink({ tab, active, count }: { tab: (typeof TABS)[number]; active: boolean; count?: number }) {
  return (
    <Link
      href={tab.href}
      onClick={tap}
      aria-current={active ? "page" : undefined}
      className="tap relative flex flex-col items-center justify-center gap-1"
    >
      <span className="relative">
        <TabIcon icon={tab.icon} active={active} />
        {count ? (
          <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-highlight px-1 text-[10px] font-bold text-highlight-foreground shadow-[0_0_10px_-2px_var(--highlight)] ring-2 ring-card">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </span>
      <span className={cn("text-[10.5px] font-semibold transition-colors", active ? "text-foreground" : "text-muted-foreground")}>
        {tab.label}
      </span>
    </Link>
  );
}

function TabIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <span
      className={cn(
        "grid size-6 place-items-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        active ? "-translate-y-px scale-110 text-primary drop-shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_60%,transparent)]" : "text-muted-foreground",
      )}
    >
      <Icon className="size-[1.2rem]" strokeWidth={active ? 2.4 : 1.9} />
    </span>
  );
}

function Dot({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-3 place-items-center", className)}>
      <span className="anim-ping absolute inset-0 rounded-full bg-warning" />
      <span className="relative size-2.5 rounded-full bg-warning ring-2 ring-background" />
    </span>
  );
}

/** "More" tab: profile card + every page that is not a bottom tab. */
function MoreSheet({
  open,
  onClose,
  user,
  badges,
  isActive,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  user: ShellUser;
  badges?: ShellBadges;
  isActive: (it: NavItem) => boolean;
  onSignOut: () => void;
}) {
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((it) => (!it.show || it.show(user)) && !TABS.some((t) => t.href === it.href)) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <BottomSheet open={open} onClose={onClose} label="More">
      {/* profile card */}
      <Link
        href="/app/profile"
        onClick={tap}
        className="tap relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_60%),radial-gradient(100%_120%_at_100%_100%,color-mix(in_oklab,var(--highlight)_22%,transparent),transparent_60%)] p-4"
      >
        <UserAvatar src={user.avatarUrl} seed={user.username} className="size-12 rounded-full ring-2 ring-white/20" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
        </div>
        <div className="text-right">
          <Badge variant="muted">{user.roleLabel}</Badge>
          <p className="mt-1 font-display text-sm font-bold">{user.balance}</p>
        </div>
      </Link>

      {groups.map((g) => (
        <section key={g.label} className="mt-5">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.label}</p>
          <div className="grid grid-cols-4 gap-2">
            {g.items.map((it) => {
              const n = it.badge ? (badges?.[it.badge] ?? 0) : 0;
              const active = isActive(it);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={tap}
                  className={cn(
                    "tap relative flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center",
                    active ? "border-primary/40 bg-primary/10" : "border-white/5 bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-xl",
                      active ? "bg-brand-gradient text-primary-foreground" : "bg-background/70 text-primary",
                    )}
                  >
                    <it.icon className="size-5" />
                  </span>
                  <span className="line-clamp-2 text-[11px] font-medium leading-tight">{it.label}</span>
                  {n > 0 ? (
                    <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-highlight px-1 text-[10px] font-bold text-highlight-foreground">
                      {n}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <button
        onClick={onSignOut}
        className="tap mt-6 flex w-full items-center justify-between rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3.5 text-sm font-semibold text-destructive"
      >
        <span className="flex items-center gap-2.5">
          <LogOut className="size-4" /> Sign out
        </span>
        <ChevronRight className="size-4 opacity-60" />
      </button>
    </BottomSheet>
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
  badges,
  isActive,
  onSignOut,
}: {
  siteName: string;
  user: ShellUser;
  badges?: ShellBadges;
  isActive: (it: NavItem) => boolean;
  onSignOut: () => void;
}) {
  // Longest matching href wins so /app/seller doesn't also light up /app/seller/leaderboard.
  const best = ALL_ITEMS.filter((it) => (!it.show || it.show(user)) && isActive(it)).sort((x, y) => y.href.length - x.href.length)[0];
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
          return (
            <div key={g.label}>
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.label}</p>
              <div className="space-y-0.5">
                {items.map((it) => {
                  const active = best?.href === it.href;
                  const n = it.badge ? (badges?.[it.badge] ?? 0) : 0;
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
                      {n > 0 ? (
                        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-highlight px-1.5 text-[11px] font-bold text-highlight-foreground">
                          {n}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="rounded-xl border bg-muted p-3">
        <div className="flex items-center gap-2.5">
          <UserAvatar src={user.avatarUrl} seed={user.username} className="size-8 rounded-full" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{user.name}</p>
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
