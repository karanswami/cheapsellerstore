"use client";

/* Client half of the premium app kit: count-up numbers, bottom sheet, success screen. */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { reducedMotion, useConfetti } from "@/components/confetti";
import { formatMoney } from "@/lib/currencies";
import { feedbackSuccess } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * Renders the final value (SSR-safe), then rolls up to it from the value last
 * seen under `storageKey` (session-scoped), so it only animates when it changed.
 * Without a key it counts up from zero on every mount.
 */
export function CountUp({
  value,
  money,
  storageKey,
  duration = 1100,
  className,
}: {
  value: number;
  money?: boolean;
  storageKey?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => (money ? formatMoney(Math.round(n)) : Math.round(n).toLocaleString("en-US"));

  useEffect(() => {
    // Write to React's own text node so later renders still own it.
    const el = ref.current?.firstChild;
    if (!el) return;
    let from = 0;
    if (storageKey) {
      try {
        const seen = sessionStorage.getItem(`countup:${storageKey}`);
        sessionStorage.setItem(`countup:${storageKey}`, String(value));
        from = seen == null ? 0 : Number(seen);
      } catch {
        from = value;
      }
    }
    if (from === value || reducedMotion()) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      el.nodeValue = fmt(from + (value - from) * easeOutExpo(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.nodeValue = fmt(value);
    };
    // fmt is derived from `money` only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, storageKey, duration, money]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {fmt(value)}
    </span>
  );
}

/**
 * Bottom sheet on phones, centred dialog from `sm` up. Drag the handle down,
 * tap the backdrop or press Escape to close. Portalled to <body> so no
 * transformed ancestor can trap it inside the page.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  icon,
  label,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Leading visual in the header (icon tile, product image…). */
  icon?: React.ReactNode;
  /** Accessible name when there is no plain-text title. */
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
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

  const endDrag = () => {
    if (drag > 90) onClose();
    start.current = null;
    setDrag(0);
  };

  if (!mounted) return null;
  return createPortal(
    // Closed sheets park off-screen; hide them once the slide-out ends, or their top edge + shadow peek above
    // the tab bar when the mobile browser toolbar resizes the viewport mid-scroll.
    <div
      className={cn("fixed inset-0 z-[55] transition-[visibility] duration-0", open ? "visible" : "pointer-events-none invisible delay-300")}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label ?? (typeof title === "string" ? title : undefined)}
        style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[2rem] border-t border-white/10 bg-card shadow-[0_-24px_70px_-10px_rgb(0_0_0/0.7)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85dvh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:rounded-[2rem] sm:border",
          open ? "translate-y-0 sm:-translate-y-1/2 sm:opacity-100" : "translate-y-full sm:-translate-y-[45%] sm:opacity-0",
          className,
        )}
      >
        {/* soft brand glow behind the header */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(70%_100%_at_50%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)]" />
        <div
          className="relative flex touch-none justify-center pb-1 pt-3 sm:hidden"
          onPointerDown={(e) => {
            start.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => start.current != null && setDrag(Math.max(0, e.clientY - start.current))}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/40" />
        </div>
        {title ? (
          <div className="relative flex items-center gap-3 px-5 pb-4 pt-2 sm:pt-5">
            {icon ? <span className="shrink-0">{icon}</span> : null}
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-lg font-bold leading-tight">{title}</h2>
              {subtitle ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap grid size-9 shrink-0 place-items-center rounded-full bg-muted/80 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-5 sm:pb-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Full-screen celebration: drawn check, confetti, haptic + chime.
 * Use for the big moments only (payment confirmed, purchase done).
 */
export function SuccessScreen({
  open,
  title,
  subtitle,
  amount,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: React.ReactNode;
  amount?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { burst, layer } = useConfetti();
  const fired = useRef(false);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!open || fired.current) return;
    fired.current = true;
    feedbackSuccess();
    const t = window.setTimeout(() => {
      const x = window.innerWidth / 2;
      const y = window.innerHeight * 0.36;
      burst({ x, y, count: 110, power: 12 });
    }, 450);
    return () => window.clearTimeout(t);
    // fire once per open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !mounted) return null;
  return createPortal(
    <div role="alertdialog" aria-modal="true" aria-label={title} className="anim-page-in fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-background/95 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      {layer}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[30%] -z-0 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-success/15 blur-[100px]" />
      <div className="relative w-full max-w-sm text-center">
        <div className="relative mx-auto grid size-28 place-items-center">
          <span className="anim-ring-out absolute inset-0 rounded-full border-2 border-success/60" />
          <svg viewBox="0 0 64 64" className="anim-success-pop size-28 text-success" fill="none">
            <circle cx="32" cy="32" r="30" className="fill-success/15" />
            <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="3" className="draw-ring" />
            <path d="M20 33l8 8 16-17" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="draw-check" />
          </svg>
        </div>
        <h2 className="anim-fade-up mt-6 font-display text-3xl font-bold tracking-tight [--d:200ms]">{title}</h2>
        {amount ? (
          <p className="anim-fade-up mt-2 font-display text-4xl font-bold text-success [--d:300ms]">{amount}</p>
        ) : null}
        {subtitle ? <p className="anim-fade-up mt-3 text-sm text-muted-foreground [--d:380ms]">{subtitle}</p> : null}
        {children ? <div className="anim-fade-up mt-8 space-y-2.5 [--d:480ms]">{children}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Swipeable banner strip with auto-advance and position dots. */
export function BannerCarousel({ banners }: { banners: { id: string; imageUrl: string | null }[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (banners.length < 2 || reducedMotion()) return;
    const id = window.setInterval(() => {
      const el = track.current;
      if (!el || paused.current || document.hidden) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % banners.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 5000);
    return () => window.clearInterval(id);
  }, [banners.length]);

  if (banners.length === 0) return null;
  return (
    <section aria-label="Banners" className="relative">
      <div
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        onPointerDown={() => (paused.current = true)}
        onPointerUp={() => (paused.current = false)}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b) => (
          <div key={b.id} className="aspect-[16/7] w-full shrink-0 snap-center overflow-hidden bg-muted">
            {b.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
        ))}
      </div>
      {banners.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <span
              key={b.id}
              className={cn("h-1.5 rounded-full bg-white/90 shadow transition-all duration-300", i === index ? "w-5" : "w-1.5 opacity-50")}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
