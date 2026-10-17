"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, BellRing, CheckCheck, Loader2, Send, Share, Smartphone, Trash2 } from "lucide-react";
import { Surface } from "@/components/app-kit";
import { Button } from "@/components/ui/button";
import {
  deleteNotification,
  fetchNotifications,
  markRead,
  NotificationRow,
  useNotificationStore,
  useOpenNotification,
} from "@/components/notification-center";
import { feedbackImpact, feedbackTap } from "@/lib/feedback";
import { CATEGORY_LABEL, NOTIFICATION_CATEGORIES, type NotificationPage, type NotificationView } from "@/lib/notification-kinds";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push-client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  ...NOTIFICATION_CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABEL[c] })),
];

type Feed = { key: string; items: NotificationView[]; nextCursor: string | null };

function dayGroup(iso: string, now: Date) {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfToday - t) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  return "Earlier";
}

function groupItems(items: NotificationView[]) {
  const now = new Date();
  const groups: { label: string; items: NotificationView[] }[] = [];
  for (const n of items) {
    const label = dayGroup(n.createdAt, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return groups;
}

export function NotificationsClient({ initial }: { initial: NotificationPage }) {
  const { unread, rev } = useNotificationStore(initial.unread);
  const [filter, setFilter] = useState("all");
  const key = `${filter}:${rev}`;
  const [feed, setFeed] = useState<Feed>({ key: "all:0", items: initial.items, nextCursor: initial.nextCursor });
  const [failed, setFailed] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const openNotification = useOpenNotification();
  const sentinel = useRef<HTMLDivElement>(null);

  // Fetch whenever the filter changes or something new arrives.
  useEffect(() => {
    if (feed.key === key) return;
    let alive = true;
    fetchNotifications({ filter, limit: 20 })
      .then((page) => alive && setFeed({ key, items: page.items, nextCursor: page.nextCursor }))
      .catch(() => alive && setFailed(key));
    return () => {
      alive = false;
    };
  }, [key, filter, feed.key]);

  const ready = feed.key === key;
  const items = ready ? feed.items : [];

  async function loadMore() {
    if (!feed.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchNotifications({ filter, cursor: feed.nextCursor, limit: 20 });
      setFeed((f) => (f.key === key ? { ...f, items: [...f.items, ...page.items], nextCursor: page.nextCursor } : f));
    } catch {
      toast.error("Could not load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  // Infinite scroll.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMoreRef.current(), {
      rootMargin: "300px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ready, feed.nextCursor]);

  const patch = (fn: (items: NotificationView[]) => NotificationView[]) => setFeed((f) => ({ ...f, items: fn(f.items) }));

  function open(n: NotificationView) {
    if (!openNotification(n)) patch((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  }

  async function readAll() {
    feedbackImpact("light");
    await markRead();
    patch((list) => (filter === "unread" ? [] : list.map((n) => ({ ...n, read: true }))));
  }

  async function remove(n: NotificationView) {
    const before = feed.items;
    patch((list) => list.filter((x) => x.id !== n.id));
    try {
      await deleteNotification(n.id);
    } catch {
      setFeed((f) => ({ ...f, items: before }));
      toast.error("Could not delete that notification.");
    }
  }

  async function clearRead() {
    feedbackImpact("medium");
    try {
      await deleteNotification();
      patch((list) => list.filter((n) => !n.read));
      toast.success("Cleared read notifications.");
    } catch {
      toast.error("Could not clear notifications.");
    }
  }

  const groups = groupItems(items);

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <section className="hero-card p-5 [--hero-a:#6366f1] [--hero-b:#0ea5e9] sm:p-6">
        <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />
        <Bell aria-hidden className={cn("absolute -right-5 -top-5 -z-10 size-36 rotate-12 text-white/[0.07]", unread > 0 && "anim-float")} strokeWidth={1.25} />
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          <Bell className="size-3.5" /> Notifications
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            {unread > 0 ? (
              <p className="font-display text-5xl font-bold leading-none tracking-tight tabular-nums">
                {unread > 99 ? "99+" : unread}
                <span className="ml-2 text-base font-semibold text-white/55">unread</span>
              </p>
            ) : (
              <p className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">You&apos;re all caught up</p>
            )}
            <p className="mt-1.5 text-sm text-white/65">Deposits, keys, support replies and rewards.</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={clearRead}
              aria-label="Clear read notifications"
              title="Clear read"
              className="tap grid size-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/15"
            >
              <Trash2 className="size-4" />
            </button>
            {unread > 0 ? (
              <button
                type="button"
                onClick={readAll}
                className="tap flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#0b1020] shadow-lg shadow-black/30"
              >
                <CheckCheck className="size-4" strokeWidth={2.5} /> Read all
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <PushCard />

      {/* filter chips scroll sideways on phones */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 flex gap-2 overflow-x-auto bg-background/85 px-4 py-2.5 backdrop-blur-xl [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              feedbackTap({ impact: "selection", silent: true });
              setFailed(null);
              setFilter(f.id);
            }}
            className={cn(
              "tap shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors",
              filter === f.id
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-white/[0.04] text-muted-foreground ring-white/10 hover:text-foreground",
            )}
          >
            {f.label}
            {f.id === "unread" && unread > 0 ? <span className="ml-1 opacity-80">{unread > 99 ? "99+" : unread}</span> : null}
          </button>
        ))}
      </div>

      {failed === key ? (
        <Surface className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
          Could not load notifications.
          <Button size="sm" variant="glass" onClick={() => location.reload()}>
            Try again
          </Button>
        </Surface>
      ) : !ready ? (
        <div className="grid gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Surface className="flex flex-col items-center px-6 py-14 text-center">
          <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary/25 to-primary/5 text-primary ring-1 ring-inset ring-primary/25">
            <Bell className="size-7" />
          </span>
          <p className="mt-4 font-display text-lg font-bold">{filter === "unread" ? "You're all caught up" : "Nothing here yet"}</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Deposits, purchases, support replies, rewards and announcements will land here.
          </p>
        </Surface>
      ) : (
        <div className="grid gap-5">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{g.label}</h2>
              <Surface className="grid gap-0.5 p-1.5">
                {g.items.map((n) => (
                  <SwipeToDelete key={n.id} onDelete={() => remove(n)}>
                    <NotificationRow n={n} onOpen={open} />
                  </SwipeToDelete>
                ))}
              </Surface>
            </section>
          ))}
          <div ref={sentinel} className="flex justify-center py-2">
            {feed.nextCursor ? (
              <Button size="sm" variant="ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="animate-spin" /> : null} Load more
              </Button>
            ) : items.length > 6 ? (
              <p className="text-xs text-muted-foreground">That&apos;s everything.</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/** Drag a row left to delete it (touch or mouse); a trash button on hover does the same on desktop. */
function SwipeToDelete({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiping = useRef(false);
  const THRESHOLD = 96;

  function finish() {
    if (dx < -THRESHOLD) {
      feedbackImpact("medium");
      setGone(true);
      window.setTimeout(onDelete, 220);
    } else setDx(0);
    start.current = null;
    setDragging(false);
    // let the click that follows a swipe be swallowed, then reset
    window.setTimeout(() => (swiping.current = false), 0);
  }

  return (
    <div
      className={cn(
        "group/swipe relative grid overflow-hidden rounded-2xl transition-[grid-template-rows,opacity] duration-200",
        gone ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
      )}
    >
      <div className="min-h-0">
        <div className="relative">
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 flex items-center justify-end rounded-2xl bg-destructive/20 pr-5 text-destructive transition-opacity",
              dx < 0 ? "opacity-100" : "opacity-0",
            )}
          >
            <Trash2 className={cn("size-5 transition-transform", dx < -THRESHOLD && "scale-125")} />
          </div>
          <div
            style={{ transform: `translateX(${gone ? -400 : dx}px)`, transition: dragging ? "none" : undefined }}
            className="relative touch-pan-y bg-card transition-transform duration-200"
            onPointerDown={(e) => {
              start.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              const s = start.current;
              if (!s) return;
              const mx = e.clientX - s.x;
              if (!swiping.current && Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(e.clientY - s.y)) {
                swiping.current = true;
                setDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
              }
              if (swiping.current) setDx(Math.min(0, mx));
            }}
            onPointerUp={finish}
            onPointerCancel={finish}
            onClickCapture={(e) => {
              if (swiping.current) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            {children}
            <button
              type="button"
              onClick={() => {
                setGone(true);
                window.setTimeout(onDelete, 220);
              }}
              aria-label="Delete notification"
              className="absolute bottom-2 right-2 hidden size-7 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 group-hover/swipe:opacity-100 lg:grid"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Web push opt-in for this device. */
function PushCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getPushState()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  async function run(fn: () => Promise<PushState>, success?: string) {
    setBusy(true);
    try {
      const next = await fn();
      setState(next);
      if (next === "on" && success) toast.success(success);
      if (next === "denied") toast.error("Notifications are blocked for this site.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? "Test failed.");
      toast.success("Test sent. It should pop up in a moment.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!state || state === "unsupported") return null;

  if (state === "on") {
    return (
      <Surface className="flex items-center gap-3 p-3 pl-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/15 text-success">
          <BellRing className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Push is on for this device</p>
          <p className="truncate text-xs text-muted-foreground">You&apos;ll get alerts even when the app is closed.</p>
        </div>
        <Button size="sm" variant="glass" onClick={sendTest} disabled={busy}>
          <Send /> Test
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => run(disablePush)} disabled={busy} aria-label="Turn off push" title="Turn off">
          <BellOff />
        </Button>
      </Surface>
    );
  }

  const copy =
    state === "needs-install"
      ? {
          icon: Smartphone,
          title: "Get alerts on your iPhone",
          body: (
            <>
              Tap <Share className="inline size-3.5 align-[-2px]" /> Share → <b>Add to Home Screen</b>, open the app from there, then turn on notifications.
            </>
          ),
        }
      : state === "denied"
        ? {
            icon: BellOff,
            title: "Notifications are blocked",
            body: "Allow notifications for this site in your browser settings (tap the lock icon in the address bar), then reload.",
          }
        : {
            icon: BellRing,
            title: "Never miss a deposit or key",
            body: "Turn on push to get instant alerts for wallet credits, purchases, support replies and offers.",
          };

  return (
    <Surface className="overflow-hidden p-4">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-inset ring-primary/25">
          <copy.icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{copy.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{copy.body}</p>
          {state === "off" ? (
            <Button size="sm" className="mt-3" onClick={() => run(enablePush, "Push notifications are on.")} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <BellRing />} Turn on notifications
            </Button>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}
