"use client";

/*
  Notification center: one shared unread store, the app-bar bell (badge + desktop
  popover), and the row used by both the popover and /app/notifications.
  New notifications are picked up by polling and instantly from the service worker
  when a web push lands; either way a toast pops if the count went up.
*/
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Bell,
  BellRing,
  CheckCheck,
  Gift,
  KeyRound,
  LifeBuoy,
  Megaphone,
  ShieldCheck,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { IconTile, type Tone } from "@/components/app-kit";
import { LIVE_EVENT } from "@/components/live-sync";
import { formatDate } from "@/components/app-ui";
import { feedbackImpact, feedbackTap } from "@/lib/feedback";
import {
  CATEGORY_LABEL,
  type NotificationCategory,
  type NotificationPage,
  type NotificationView,
} from "@/lib/notification-kinds";
import { syncPushSubscription } from "@/lib/push-client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/* ---------- shared store ---------- */

type Snapshot = { unread: number | null; rev: number };
let snapshot: Snapshot = { unread: null, rev: 0 };
const listeners = new Set<() => void>();
const emit = (next: Partial<Snapshot>) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
};

export const notificationStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => snapshot,
  setUnread(unread: number) {
    if (unread !== snapshot.unread) emit({ unread });
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (unread > 0) void nav.setAppBadge?.(unread).catch(() => {});
    else void nav.clearAppBadge?.().catch(() => {});
  },
  /** Something new arrived: open lists should refetch. */
  bump: () => emit({ rev: snapshot.rev + 1 }),
};

const SERVER_SNAPSHOT: Snapshot = { unread: null, rev: 0 };
export function useNotificationStore(initialUnread: number) {
  const snap = useSyncExternalStore(notificationStore.subscribe, notificationStore.get, () => SERVER_SNAPSHOT);
  return { unread: snap.unread ?? initialUnread, rev: snap.rev };
}

/* ---------- api ---------- */

export async function fetchNotifications(params: { filter?: string; cursor?: string | null; limit?: number }) {
  const q = new URLSearchParams();
  if (params.filter) q.set("filter", params.filter);
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.limit) q.set("limit", String(params.limit));
  const res = await fetch(`/api/notifications?${q}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load notifications.");
  const page = (await res.json()).data as NotificationPage;
  notificationStore.setUnread(page.unread);
  return page;
}

export async function markRead(ids?: string[]) {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids ? { ids } : {}),
  });
  if (res.ok) notificationStore.setUnread((await res.json()).data.unread);
}

export async function deleteNotification(id?: string) {
  const res = await fetch(`/api/notifications${id ? `?id=${id}` : ""}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not delete.");
  notificationStore.setUnread((await res.json()).data.unread);
}

/* ---------- visuals ---------- */

export const CATEGORY_ICON: Record<NotificationCategory, { icon: LucideIcon; tone: Tone }> = {
  wallet: { icon: Wallet, tone: "emerald" },
  orders: { icon: KeyRound, tone: "primary" },
  support: { icon: LifeBuoy, tone: "sky" },
  rewards: { icon: Gift, tone: "highlight" },
  offers: { icon: Tag, tone: "rose" },
  news: { icon: Megaphone, tone: "violet" },
  account: { icon: ShieldCheck, tone: "amber" },
};

/** Bad news gets a red tile whatever its category. */
const NEGATIVE_TYPES = new Set(["deposit_rejected", "wallet_debit", "seller_rejected"]);

export function NotificationIcon({ n, className }: { n: Pick<NotificationView, "type" | "category">; className?: string }) {
  const meta = CATEGORY_ICON[n.category];
  return <IconTile icon={meta.icon} tone={NEGATIVE_TYPES.has(n.type) ? "rose" : meta.tone} className={className} />;
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return formatDate(iso);
}

const isExternal = (url: string) => /^https?:\/\//i.test(url);

/** Mark read + follow the link. Returns true when it navigated. */
export function useOpenNotification() {
  const router = useRouter();
  return (n: NotificationView) => {
    feedbackTap({ impact: "selection", silent: true });
    if (!n.read) void markRead([n.id]);
    if (!n.actionUrl) return false;
    if (isExternal(n.actionUrl)) window.open(n.actionUrl, "_blank", "noopener,noreferrer");
    else router.push(n.actionUrl);
    return true;
  };
}

export function NotificationRow({
  n,
  onOpen,
  compact,
  className,
}: {
  n: NotificationView;
  onOpen: (n: NotificationView) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        "tap group relative flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-white/[0.04]",
        !n.read && "bg-primary/[0.06]",
        className,
      )}
    >
      <NotificationIcon n={n} className={compact ? "size-10 rounded-xl" : undefined} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-sm", n.read ? "font-medium text-foreground/85" : "font-semibold")}>
            {n.title}
          </span>
          <span suppressHydrationWarning className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {timeAgo(n.createdAt)}
          </span>
        </span>
        <span className={cn("mt-0.5 block text-[13px] leading-snug text-muted-foreground", compact ? "line-clamp-2" : "line-clamp-3")}>
          {n.message}
        </span>
        {!compact ? (
          <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            {CATEGORY_LABEL[n.category]}
          </span>
        ) : null}
      </span>
      {!n.read ? (
        <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
      ) : null}
    </button>
  );
}

/* ---------- live updates ---------- */

const POLL_MS = 30_000;

/** Keeps the shared unread count fresh and toasts when something new arrives. Mount once (the shell). */
export function useNotificationFeed(initialUnread: number) {
  const router = useRouter();
  const known = useRef(initialUnread);

  useEffect(() => {
    let alive = true;
    notificationStore.setUnread(initialUnread);
    void syncPushSubscription();

    const announce = (title: string, body?: string, url?: string) => {
      feedbackImpact("light");
      toast.message(title, {
        description: body,
        icon: <BellRing className="size-4 text-primary" />,
        action: { label: "View", onClick: () => router.push(url || "/app/notifications") },
      });
    };

    async function refresh(opts: { announce?: boolean } = {}) {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/notifications?count=1", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const unread = (await res.json()).data.unread as number;
        const grew = unread > known.current;
        known.current = unread;
        notificationStore.setUnread(unread);
        if (!grew) return;
        notificationStore.bump();
        if (opts.announce !== false) {
          const page = await fetchNotifications({ filter: "unread", limit: 1 });
          const latest = page.items[0];
          if (latest && alive) announce(latest.title, latest.message, latest.actionUrl ?? undefined);
        }
      } catch {
        // offline: try again next tick
      }
    }

    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener(LIVE_EVENT, onVisible);

    // A push landed while the app is open: show it in-app and refresh the badge.
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "push-notification") return;
      announce(e.data.title, e.data.body, e.data.data?.url);
      void refresh({ announce: false });
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(LIVE_EVENT, onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [initialUnread, router]);
}

/* ---------- bell ---------- */

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      key={count}
      className={cn(
        "anim-pop-in absolute grid h-[18px] min-w-[18px] place-items-center rounded-full bg-highlight px-1 text-[10px] font-bold leading-none text-highlight-foreground ring-2 ring-background",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Mobile: links to the full notifications screen. */
export function MobileNotificationBell({ initialUnread }: { initialUnread: number }) {
  const { unread } = useNotificationStore(initialUnread);
  return (
    <Link
      href="/app/notifications"
      onClick={() => feedbackTap({ impact: "selection", silent: true })}
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className="tap relative grid size-10 place-items-center rounded-full bg-white/[0.06] text-muted-foreground ring-1 ring-inset ring-white/10"
    >
      <Bell className={cn("size-[1.15rem]", unread > 0 && "anim-bell text-foreground")} />
      <CountBadge count={unread} className="-right-1 -top-1" />
    </Link>
  );
}

const PANEL_TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
] as const;

/** Desktop: popover with the latest notifications. */
export function DesktopNotificationBell({ initialUnread }: { initialUnread: number }) {
  const pathname = usePathname();
  const { unread, rev } = useNotificationStore(initialUnread);
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [data, setData] = useState<{ key: string; items: NotificationView[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openNotification = useOpenNotification();
  const key = `${tab}:${rev}`;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchNotifications({ filter: tab, limit: 8 })
      .then((page) => alive && setData({ key, items: page.items }))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [open, tab, key]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpenAt(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = data?.key === key ? data.items : null;

  async function readAll() {
    await markRead();
    setData((d) => (d ? { ...d, items: d.items.map((n) => ({ ...n, read: true })) } : d));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setOpenAt(open ? null : pathname);
        }}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className={cn(
          "relative grid size-9 place-items-center rounded-full text-muted-foreground ring-1 ring-inset transition-colors hover:text-foreground",
          open ? "bg-white/[0.1] text-foreground ring-white/15" : "bg-white/[0.04] ring-white/10 hover:bg-white/[0.08]",
        )}
      >
        <Bell className={cn("size-4", unread > 0 && "anim-bell text-foreground")} />
        <CountBadge count={unread} className="-right-1.5 -top-1.5" />
      </button>

      {open ? (
        <div className="anim-pop-in absolute right-0 top-12 z-50 flex max-h-[min(36rem,calc(100dvh-6rem))] w-[24rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-popover shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 pb-3 pt-4">
            <h3 className="font-display text-base font-bold">Notifications</h3>
            {unread > 0 ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{unread} new</span>
            ) : null}
            <button
              type="button"
              onClick={readAll}
              disabled={unread === 0}
              className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          </div>
          <div className="flex gap-1 px-3 pt-2">
            {PANEL_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  tab === t.id ? "bg-white/[0.1] text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {failed ? (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">Could not load notifications.</p>
            ) : !items ? (
              <div className="grid gap-2 p-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-16 rounded-2xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Bell className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold">{tab === "unread" ? "You're all caught up" : "No notifications yet"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Deposits, orders and replies will show up here.</p>
              </div>
            ) : (
              <div className="grid gap-1">
                {items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    compact
                    onOpen={(row) => {
                      if (openNotification(row)) setOpenAt(null);
                      else setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === row.id ? { ...x, read: true } : x)) } : d));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <Link
            href="/app/notifications"
            onClick={() => setOpenAt(null)}
            className="border-t border-white/[0.06] px-4 py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-white/[0.03]"
          >
            See all notifications
          </Link>
        </div>
      ) : null}
    </div>
  );
}
