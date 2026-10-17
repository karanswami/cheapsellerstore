"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  Code2,
  Flag,
  Gamepad2,
  Gift,
  History,
  House,
  KeyRound,
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
import { TONES, type Tone } from "@/components/app-kit";
import {
  DesktopNotificationBell,
  MobileNotificationBell,
  useNotificationFeed,
  useNotificationStore,
} from "@/components/notification-center";
import { Badge } from "@/components/ui/badge";
import { useLiveSync } from "@/components/live-sync";
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
type ShellBadges = { spins: number; pendingDeposits: number; activeReports: number; unreadNotifications: number };

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
  /** Icon tint in the mobile "More" sheet. */
  tone?: Tone;
};
type NavGroup = { label: string; items: NavItem[] };

const wholesale = (u: ShellUser) => u.role === "SELLER" || u.role === "RESELLER" || u.role === "ADMIN";

// Add new customer pages here; desktop sidebar and the mobile "More" sheet both read this list.
const NAV: NavGroup[] = [
  { label: "Shop", items: [{ href: "/app", label: "Store", icon: Store, exact: true, tone: "primary" }] },
  {
    label: "Wallet",
    items: [
      { href: "/app/deposit", label: "Deposit", icon: Wallet, badge: "pendingDeposits", tone: "emerald" },
      { href: "/app/history", label: "History", icon: History, tone: "sky" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/notifications", label: "Notifications", icon: Bell, badge: "unreadNotifications", tone: "amber" },
      { href: "/app/keys", label: "Key vault", icon: KeyRound, tone: "amber" },
      { href: "/app/reports", label: "Reports", icon: Flag, badge: "activeReports", tone: "rose" },
      { href: "/app/referral", label: "Invite & Spin", icon: Gift, badge: "spins", tone: "highlight" },
      { href: "/app/leaderboard", label: "Leaderboard", icon: Trophy, tone: "amber" },
      { href: "/app/broadcast", label: "Broadcast", icon: Megaphone, tone: "violet" },
      { href: "/app/profile", label: "Profile", icon: User, tone: "sky" },
    ],
  },
  {
    label: "Admin",
    items: [{ href: "/admin", label: "Admin panel", icon: ShieldCheck, show: (u) => u.role === "ADMIN", tone: "rose" }],
  },
  {
    label: "Business",
    items: [
      { href: "/app/become-seller", label: "Become a Seller", icon: Store, show: (u) => u.role === "USER", tone: "emerald" },
      { href: "/app/development", label: "Platform API", icon: Code2, show: wholesale, tone: "violet" },
      { href: "/app/seller", label: "Seller panel", icon: UsersRound, exact: true, show: (u) => u.hasSellerPanel, tone: "primary" },
      { href: "/app/seller/leaderboard", label: "Seller board", icon: Trophy, show: wholesale, tone: "highlight" },
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

/** Titles for sub pages that are not in NAV. */
const EXTRA_TITLES = [
  { prefix: "/app/order/", title: "Order", section: "Account" },
  { prefix: "/app/win/", title: "Your prize", section: "Invite & Spin" },
];

/** Desktop account dropdown shortcuts. */
const MENU_LINKS = [
  { href: "/app/profile", label: "Profile", icon: User },
  { href: "/app/keys", label: "Key vault", icon: KeyRound },
  { href: "/app/history", label: "History", icon: History },
];

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
  const initialUnread = badges?.unreadNotifications ?? 0;
  useNotificationFeed(initialUnread);
  useLiveSync();
  // Live count, so the nav badge clears as soon as notifications are read.
  const { unread } = useNotificationStore(initialUnread);
  const liveBadges = badges ? { ...badges, unreadNotifications: unread } : badges;

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
  const bestItem = ALL_ITEMS.filter(isActive).sort((x, y) => y.href.length - x.href.length)[0];
  const extra = EXTRA_TITLES.find((t) => pathname.startsWith(t.prefix));
  const current = bestItem?.label ?? extra?.title ?? siteName;
  const section = bestItem ? NAV.find((g) => g.items.includes(bestItem))?.label : extra?.section;
  const isRoot = ROOTS.has(pathname);
  const firstName = user.name.split(" ")[0];
  const moreActive = !TABS.some(isActive);
  // Badges of pages that live only in the More sheet, so the More tab can hint at them.
  const moreCount = [...new Set(ALL_ITEMS.filter((it) => it.badge && (!it.show || it.show(user)) && !TABS.some((t) => t.href === it.href)).map((it) => it.badge!))]
    .reduce((n, k) => n + (liveBadges?.[k] ?? 0), 0);

  return (
    // overflow-x-clip (not hidden): stops decorative blobs/bleeds from side-scrolling the page without breaking sticky bars.
    <div className="min-h-dvh overflow-x-clip lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-card/50 p-3 lg:flex">
        <SidebarContent siteName={siteName} user={user} badges={liveBadges} isActive={isActive} onSignOut={signOut} />
      </aside>

      <div className="min-w-0">
        {/* Mobile app bar: transparent at the top of the page, frosted glass once content slides under it */}
        <header
          data-scrolled={scrolled || undefined}
          className="app-chrome group/bar sticky top-0 z-50 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-300 data-[scrolled]:bg-background/85 data-[scrolled]:shadow-[0_14px_34px_-22px_rgb(0_0_0/0.95)] data-[scrolled]:backdrop-blur-xl lg:hidden"
        >
          <div className="flex h-16 items-center gap-3 px-4">
            {isRoot ? (
              <Link href="/app/profile" onClick={tap} className="tap flex min-w-0 items-center gap-3">
                <span className="relative shrink-0 rounded-full bg-[conic-gradient(from_210deg,var(--primary),var(--highlight),var(--primary))] p-[2px] shadow-[0_6px_18px_-8px_var(--primary)]">
                  <UserAvatar src={user.avatarUrl} seed={user.username} className="size-10 rounded-full border-[2.5px] border-background" />
                  <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-success" />
                </span>
                <span className="min-w-0">
                  {/* greeting folds away once scrolled, leaving just the name */}
                  <span className="grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-300 group-data-[scrolled]/bar:grid-rows-[0fr] group-data-[scrolled]/bar:opacity-0">
                    <span suppressHydrationWarning className="block overflow-hidden text-xs font-medium text-muted-foreground">
                      {greeting()}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-display text-[17px] font-bold leading-tight tracking-tight">{firstName}</span>
                    {user.role !== "USER" ? (
                      <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-primary">
                        {user.roleLabel}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            ) : (
              <>
                <button
                  onClick={goBack}
                  aria-label="Back"
                  className="tap -ml-1 grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-foreground ring-1 ring-inset ring-white/10"
                >
                  <ChevronLeft className="size-5 -translate-x-px" strokeWidth={2.4} />
                </button>
                <div key={pathname} className="anim-title-in min-w-0">
                  {section ? (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{section}</p>
                  ) : null}
                  <h1 className="truncate font-display text-[17px] font-bold leading-tight tracking-tight">{current}</h1>
                </div>
              </>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {isRoot ? <MobileNotificationBell initialUnread={initialUnread} /> : null}
              <Link
                href="/app/deposit"
                onClick={tap}
                aria-label={`Wallet balance ${user.balance}, add money`}
                className="tap flex items-center gap-2.5 rounded-full bg-card/90 py-1 pl-3.5 pr-1 shadow-[0_8px_24px_-14px_var(--primary)] ring-1 ring-inset ring-white/10"
              >
                <span className="text-right leading-none">
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Balance</span>
                  <span className="mt-0.5 block font-display text-sm font-bold tabular-nums">{user.balance}</span>
                </span>
                <span className="bg-brand-gradient grid size-8 place-items-center rounded-full text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]">
                  <Plus className="size-4" strokeWidth={3} />
                </span>
              </Link>
            </div>
          </div>
          {/* hairline that fades in with the glass */}
          <div className="h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--primary)_45%,transparent),color-mix(in_oklab,var(--highlight)_35%,transparent),transparent)] opacity-0 transition-opacity duration-300 group-data-[scrolled]/bar:opacity-100" />
        </header>

        {/* Desktop header */}
        <header className="sticky top-0 z-40 hidden h-16 items-center gap-4 border-b border-white/[0.06] bg-background/75 px-8 backdrop-blur-xl lg:flex">
          <div key={pathname} className="anim-title-in min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">{section ?? siteName}</p>
            <h2 className="truncate font-display text-lg font-bold leading-tight tracking-tight">{current}</h2>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            {badges?.spins ? (
              <Link
                href="/app/referral"
                className="flex items-center gap-1.5 rounded-full bg-highlight/10 px-3 py-2 text-xs font-semibold text-highlight ring-1 ring-inset ring-highlight/30 transition-colors hover:bg-highlight/20"
              >
                <Gift className="size-3.5" /> {badges.spins} free spin{badges.spins === 1 ? "" : "s"}
              </Link>
            ) : null}
            <DesktopNotificationBell initialUnread={initialUnread} />
            <div className="flex items-center gap-3 rounded-full bg-card/80 py-1 pl-4 pr-1 ring-1 ring-inset ring-white/10">
              <span className="flex items-center gap-2 text-sm">
                <Wallet className="size-4 text-highlight" />
                <span className="font-display font-bold tabular-nums">{user.balance}</span>
              </span>
              <Link
                href="/app/deposit"
                className="bg-brand-gradient flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] transition-opacity hover:opacity-90"
              >
                <Plus className="size-3.5" strokeWidth={3} /> Add money
              </Link>
            </div>
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenu(!menu)}
                aria-label="Account menu"
                aria-expanded={menu}
                className={cn(
                  "flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 outline-none ring-1 ring-inset transition-colors focus-visible:ring-ring/60",
                  menu ? "bg-white/[0.08] ring-white/15" : "ring-transparent hover:bg-white/[0.05]",
                )}
              >
                <UserAvatar src={user.avatarUrl} seed={user.username} className="size-8 rounded-full" />
                <span className="max-w-32 truncate text-sm font-semibold">{firstName}</span>
                <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", menu && "rotate-180")} />
              </button>
              {menu ? (
                <div className="anim-pop-in absolute right-0 top-12 w-72 overflow-hidden rounded-2xl border border-white/10 bg-popover shadow-2xl">
                  <div className="flex items-center gap-3 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklab,var(--primary)_26%,transparent),transparent_60%),radial-gradient(100%_120%_at_100%_100%,color-mix(in_oklab,var(--highlight)_20%,transparent),transparent_60%)] p-4">
                    <UserAvatar src={user.avatarUrl} seed={user.username} className="size-11 rounded-full ring-2 ring-white/20" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    <Badge variant="muted">{user.roleLabel}</Badge>
                  </div>
                  <div className="p-1.5">
                    {MENU_LINKS.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <l.icon className="size-4" /> {l.label}
                      </Link>
                    ))}
                    <div className="my-1 h-px bg-border" />
                    <button
                      onClick={signOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
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

      <BottomBar
        isActive={isActive}
        moreActive={moreActive}
        moreOpen={sheet}
        moreCount={moreCount}
        badges={liveBadges}
        onMore={() => {
          tap();
          setSheet(!sheet);
        }}
        onNavigate={() => setSheet(false)}
      />
      <MoreSheet
        open={sheet}
        onClose={() => setSheet(false)}
        user={user}
        badges={liveBadges}
        isActive={isActive}
        onSignOut={signOut}
      />
    </div>
  );
}

function BottomBar({
  isActive,
  moreActive,
  moreOpen,
  moreCount,
  badges,
  onMore,
  onNavigate,
}: {
  isActive: (it: { href: string; exact?: boolean }) => boolean;
  moreActive: boolean;
  moreOpen: boolean;
  moreCount: number;
  badges?: ShellBadges;
  onMore: () => void;
  onNavigate: () => void;
}) {
  const [home, keys, deposit, spin] = TABS;
  const depositActive = isActive(deposit);
  // Slot of the sliding highlight (0..4); the raised Deposit slot has its own state, so no pill there.
  const slot = moreActive || moreOpen ? 4 : isActive(home) ? 0 : isActive(keys) ? 1 : isActive(spin) ? 3 : -1;
  return (
    // While the More sheet is open the dock rises above it, so the More tab doubles as its close button.
    <nav aria-label="Main" className={cn("app-chrome fixed inset-x-0 bottom-0 lg:hidden", moreOpen ? "z-[60]" : "z-50")}>
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

            <TabLink tab={home} active={isActive(home)} onNavigate={onNavigate} />
            <TabLink tab={keys} active={isActive(keys)} onNavigate={onNavigate} />
            <Link
              href={deposit.href}
              onClick={() => {
                tap();
                onNavigate();
              }}
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
            <TabLink tab={spin} active={isActive(spin)} count={badges?.spins} onNavigate={onNavigate} />
            <MoreButton open={moreOpen} active={moreActive} count={moreCount} onClick={onMore} />
          </div>
        </div>
      </div>
    </nav>
  );
}

function TabLink({
  tab,
  active,
  count,
  onNavigate,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  count?: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={tab.href}
      onClick={() => {
        tap();
        onNavigate();
      }}
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

/** Four tiles; tiles 0-3 sit at these corners and fold into the arms of an X when the sheet opens. */
const GLYPH = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;
const SPRING = "ease-[cubic-bezier(0.34,1.56,0.64,1)]";

function MoreButton({ open, active, count, onClick }: { open: boolean; active: boolean; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close menu" : count ? `More, ${count} new` : "More"}
      aria-expanded={open}
      aria-haspopup="dialog"
      className="tap relative flex flex-col items-center justify-center gap-1"
    >
      <span className="relative">
        <span
          aria-hidden
          className={cn(
            "relative block size-6 transition-[transform,filter] duration-500",
            SPRING,
            open ? "rotate-90" : active ? "-translate-y-px scale-110 drop-shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_60%,transparent)]" : "",
          )}
        >
          {GLYPH.map(([x, y], i) => {
            // The top-right tile is a glowing accent dot while closed: the "something extra lives here" cue.
            const accent = i === 1 && !open;
            return (
              <span
                key={i}
                className={cn(
                  "absolute left-1/2 top-1/2 transition-[width,height,transform,border-radius,background-color,box-shadow] duration-500",
                  SPRING,
                  accent
                    ? "rounded-full bg-highlight shadow-[0_0_8px_var(--highlight)]"
                    : cn("rounded-[3px]", open ? "bg-foreground" : active ? "bg-primary" : "bg-muted-foreground"),
                )}
                style={
                  open
                    ? { width: 2.5, height: 9, transform: `translate(-50%, -50%) translate(${x * 3}px, ${y * 3}px) rotate(${x * y > 0 ? -45 : 45}deg)` }
                    : { width: 7, height: 7, transform: `translate(-50%, -50%) translate(${x * 4.5}px, ${y * 4.5}px)${accent ? " scale(0.92)" : ""}` }
                }
              />
            );
          })}
        </span>
        <span
          className={cn(
            "absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-highlight px-1 text-[10px] font-bold text-highlight-foreground shadow-[0_0_10px_-2px_var(--highlight)] ring-2 ring-card transition-[transform,opacity] duration-300",
            SPRING,
            count && !open ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        >
          {count > 9 ? "9+" : count || ""}
        </span>
      </span>
      {/* label crossfades More -> Close */}
      <span className="grid text-[10.5px] font-semibold">
        {(["More", "Close"] as const).map((t) => {
          const shown = (t === "Close") === open;
          return (
            <span
              key={t}
              aria-hidden
              className={cn(
                "col-start-1 row-start-1 text-center transition-[opacity,transform] duration-300",
                shown ? "translate-y-0 opacity-100" : cn("opacity-0", t === "Close" ? "translate-y-1" : "-translate-y-1"),
                t === "Close" || active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t}
            </span>
          );
        })}
      </span>
    </button>
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

/** "More" tab: a compact floating panel that grows out of the More button, above the dock. */
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
  const items = NAV.flatMap((g) => g.items).filter((it) => (!it.show || it.show(user)) && !TABS.some((t) => t.href === it.href));
  // Longest match wins so /app/seller doesn't also light up /app/seller/leaderboard.
  const best = items.filter(isActive).sort((x, y) => y.href.length - x.href.length)[0];
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const out = () => {
    tap();
    onClose();
  };

  return (
    // Not portalled: the shell root has no transform, so fixed positioning is safe here. Closed = invisible after
    // the fade, so nothing peeks over the dock on mobile toolbar resizes.
    <div
      className={cn(
        "fixed inset-0 z-[55] transition-[visibility] lg:hidden",
        open ? "visible delay-0" : "pointer-events-none invisible delay-300",
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/55 backdrop-blur-[3px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More"
        className={cn(
          "absolute inset-x-3 bottom-[calc(5.4rem+env(safe-area-inset-bottom))] mx-auto max-w-[calc(28rem-1.5rem)] origin-[90%_100%] transition-[transform,opacity] duration-300",
          SPRING,
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-90 opacity-0",
        )}
      >
        <div className="rounded-[1.6rem] bg-[linear-gradient(160deg,rgb(255_255_255/0.14),rgb(255_255_255/0.03)_40%,color-mix(in_oklab,var(--primary)_30%,transparent))] p-px shadow-[0_24px_60px_-18px_rgb(0_0_0/0.9)]">
          <div className="relative max-h-[62dvh] overflow-y-auto overscroll-contain rounded-[calc(1.6rem-1px)] bg-card bg-[radial-gradient(90%_60%_at_0%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)] p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* account row */}
            <div className="flex items-center gap-2">
              <Link href="/app/profile" onClick={out} className="tap flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl p-1">
                <span className="relative shrink-0 rounded-full bg-[conic-gradient(from_210deg,var(--primary),var(--highlight),var(--primary))] p-[1.5px]">
                  <UserAvatar src={user.avatarUrl} seed={user.username} className="size-9 rounded-full border-2 border-card" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-bold">{user.name}</span>
                    {user.role !== "USER" ? (
                      <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wider text-primary">
                        {user.roleLabel}
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">@{user.username}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sign out"
                className="tap grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20"
              >
                <LogOut className="size-4" />
              </button>
            </div>

            <div className="my-2.5 h-px bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.09),transparent)]" />

            <div className="grid grid-cols-4 gap-x-1 gap-y-2.5">
              {items.map((it, i) => {
                const n = it.badge ? (badges?.[it.badge] ?? 0) : 0;
                const active = best?.href === it.href;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={out}
                    aria-current={active ? "page" : undefined}
                    className={cn("tap relative flex flex-col items-center gap-1 rounded-2xl py-1 text-center", open && "anim-sheet-up")}
                    style={open ? { animationDelay: `${40 + i * 22}ms` } : undefined}
                  >
                    <span
                      className={cn(
                        "relative grid size-11 place-items-center overflow-hidden rounded-[0.95rem] bg-gradient-to-b ring-1 ring-inset",
                        TONES[it.tone ?? "primary"],
                        active && "ring-2 ring-primary/70",
                      )}
                    >
                      <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgb(255_255_255/0.09),transparent)]" />
                      <it.icon className="relative size-[1.15rem]" strokeWidth={2.1} />
                    </span>
                    <span className={cn("line-clamp-2 w-full px-0.5 text-[10.5px] font-semibold leading-[1.15]", active ? "text-foreground" : "text-foreground/75")}>
                      {it.label}
                    </span>
                    {n > 0 ? (
                      <span className="absolute right-[calc(50%-1.75rem)] -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-highlight px-1 text-[9.5px] font-bold text-highlight-foreground ring-2 ring-card">
                        {n > 9 ? "9+" : n}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        {/* pointer down to the More tab */}
        <span
          aria-hidden
          className="absolute -bottom-[6px] right-[calc(10%-7px)] size-3.5 rotate-45 rounded-[3px] border-b border-r border-white/10 bg-card"
        />
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
