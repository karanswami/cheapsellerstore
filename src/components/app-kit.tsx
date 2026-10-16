/*
  Premium app kit (server-safe). The look of the spin wheel / golden ticket,
  distilled into reusable surfaces: glass cards, glow tiles, tappable rows.
  Client-only pieces (count-up, sheets, success screen) live in app-kit-client.tsx.
*/
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, ShoppingBag, Wallet, type LucideIcon } from "lucide-react";
import { CountUp } from "@/components/app-kit-client";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/types/history";

/** Accent hues for icon tiles; each reads as its own "app icon" on the dark ground. */
export const TONES = {
  primary: "from-primary/30 to-primary/5 text-primary ring-primary/25 shadow-primary/20",
  highlight: "from-highlight/30 to-highlight/5 text-highlight ring-highlight/25 shadow-highlight/20",
  amber: "from-amber-400/30 to-amber-400/5 text-amber-300 ring-amber-300/25 shadow-amber-400/20",
  emerald: "from-emerald-400/30 to-emerald-400/5 text-emerald-300 ring-emerald-300/25 shadow-emerald-400/20",
  rose: "from-rose-400/30 to-rose-400/5 text-rose-300 ring-rose-300/25 shadow-rose-400/20",
  sky: "from-sky-400/30 to-sky-400/5 text-sky-300 ring-sky-300/25 shadow-sky-400/20",
  violet: "from-violet-400/30 to-violet-400/5 text-violet-300 ring-violet-300/25 shadow-violet-400/20",
} as const;
export type Tone = keyof typeof TONES;

/** Base card: soft glass, hairline top highlight, big radius. */
export function Surface({ className, children, ...rest }: React.ComponentProps<"section">) {
  return (
    <section
      {...rest}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/[0.06] bg-card/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  icon: Icon,
  href,
  action = "See all",
  className,
}: {
  title: string;
  icon?: LucideIcon;
  href?: string;
  action?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3 px-0.5", className)}>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
        {Icon ? <Icon className="size-4 text-primary" /> : null}
        {title}
      </h2>
      {href ? (
        <Link href={href} className="tap flex items-center gap-0.5 text-xs font-semibold text-primary">
          {action} <ChevronRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

/** Gradient "app icon" square. */
export function IconTile({ icon: Icon, tone = "primary", className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br shadow-lg ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}

/** Row of round shortcuts under the wallet card. */
export function QuickActions({
  items,
}: {
  items: { href: string; label: string; icon: LucideIcon; tone: Tone; badge?: number }[];
}) {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-4 gap-2">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="tap group flex flex-col items-center gap-2 rounded-2xl py-1">
          <span className="relative">
            <IconTile icon={it.icon} tone={it.tone} className="size-14 rounded-[1.15rem] transition-transform group-hover:-translate-y-0.5" />
            {it.badge ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-highlight px-1 text-[11px] font-bold text-highlight-foreground ring-2 ring-background">
                {it.badge > 9 ? "9+" : it.badge}
              </span>
            ) : null}
          </span>
          <span className="text-center text-[11.5px] font-semibold leading-tight text-foreground/90">{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * Bank-card style wallet: layered brand glow, a chip, and the balance counting
 * up to its new value whenever it changed since the user last saw it.
 */
export function WalletCard({
  balance,
  name,
  username,
  roleLabel,
  greeting,
  stats,
  actionHref = "/app/deposit",
}: {
  balance: number;
  name: string;
  username: string;
  roleLabel: string;
  greeting?: string;
  stats?: { label: string; value: number | string }[];
  actionHref?: string;
}) {
  return (
    <section
      aria-label="Wallet"
      className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b1020] p-5 text-white shadow-[0_24px_60px_-20px_color-mix(in_oklab,var(--primary)_55%,transparent)] sm:p-6"
    >
      {/* light play */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_0%_0%,color-mix(in_oklab,var(--primary)_55%,transparent),transparent_55%),radial-gradient(90%_110%_at_100%_100%,color-mix(in_oklab,var(--highlight)_45%,transparent),transparent_60%)]" />
      <div aria-hidden className="anim-blob absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07] [background-image:repeating-linear-gradient(115deg,#fff_0_1px,transparent_1px_14px)]" />
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {greeting ? <p className="text-xs font-medium text-white/70">{greeting}</p> : null}
          <p className="truncate font-display text-lg font-bold leading-tight">{name}</p>
        </div>
        {/* card chip */}
        <span aria-hidden className="relative h-8 w-11 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner">
          <span className="absolute inset-x-0 top-1/2 h-px bg-amber-900/40" />
          <span className="absolute inset-y-0 left-1/3 w-px bg-amber-900/40" />
          <span className="absolute inset-y-0 right-1/3 w-px bg-amber-900/40" />
          <span className="absolute inset-[30%] rounded-sm border border-amber-900/40" />
        </span>
      </div>

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Wallet balance</p>
      <p className="mt-1 font-display text-4xl font-bold tracking-tight drop-shadow-[0_2px_12px_rgb(0_0_0/0.35)] sm:text-5xl">
        <CountUp value={balance} storageKey="wallet-balance" money />
      </p>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {stats?.length ? (
            <div className="flex gap-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-display text-base font-bold leading-none">{s.value}</p>
                  <p className="mt-1 text-[10.5px] uppercase tracking-wider text-white/55">{s.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="truncate font-mono text-xs tracking-widest text-white/60">@{username}</p>
          )}
          <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/50">{roleLabel}</p>
        </div>
        <Link
          href={actionHref}
          className="tap flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#0b1020] shadow-lg shadow-black/30"
        >
          <Wallet className="size-4" /> Add money
        </Link>
      </div>
    </section>
  );
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

const KIND: Record<ActivityItem["kind"], { icon: LucideIcon; tone: Tone }> = {
  order: { icon: ShoppingBag, tone: "primary" },
  deposit: { icon: ArrowDownLeft, tone: "emerald" },
  wallet: { icon: Wallet, tone: "violet" },
};

/** Transaction row: icon tile, title, "subtitle · 5m ago", signed amount. Server-rendered only (relative time). */
export function ActivityRow({ item, href }: { item: ActivityItem; href?: string }) {
  const k = KIND[item.kind];
  const Icon = item.kind === "wallet" && item.amount != null && item.amount < 0 ? ArrowUpRight : k.icon;
  const body = (
    <>
      <IconTile icon={Icon} tone={k.tone} className="size-10 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.subtitle} · {timeAgo(item.createdAt)}
        </p>
      </div>
      {item.amount != null ? (
        <span className={cn("shrink-0 font-display text-sm font-bold tabular-nums", item.amount < 0 ? "text-foreground" : "text-success")}>
          {item.amount < 0 ? "−" : "+"}
          {formatMoney(Math.abs(item.amount))}
        </span>
      ) : null}
    </>
  );
  return href ? (
    <Link href={href} className="tap flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]">
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-3 px-2 py-2.5">{body}</div>
  );
}
