"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, KeyRound, Loader2, Lock, Smartphone, Sparkles, Ticket } from "lucide-react";
import { formatDate } from "@/components/app-ui";
import { useConfetti } from "@/components/confetti";
import { CopyKey } from "@/components/copy-key";
import { Letters } from "@/components/spin-wheel";
import { cn } from "@/lib/utils";

type PrizeKey = { id: string; product: string; duration: string; code: string | null; androidId: string | null };

const STARS = [
  [6, 18, 0],
  [18, 70, 600],
  [30, 12, 1100],
  [70, 16, 300],
  [84, 64, 900],
  [94, 22, 1300],
];

export function WinReveal({ prize, wonAt, keys }: { prize: string; wonAt: string; keys: PrizeKey[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { burst, layer } = useConfetti();
  const heroRef = useRef<HTMLDivElement>(null);
  const sealed = keys.filter((k) => k.code && !open[k.id]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const b = heroRef.current?.getBoundingClientRect();
      if (b) burst({ x: b.left + b.width / 2, y: b.top + b.height * 0.45, count: 120, power: 12 });
    }, 350);
    return () => window.clearTimeout(t);
    // fire once on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reveal(id: string, el?: HTMLElement | null) {
    if (open[id]) return;
    setOpen((o) => ({ ...o, [id]: true }));
    try {
      navigator.vibrate?.(30);
    } catch {}
    const b = el?.getBoundingClientRect();
    if (b) {
      burst({ x: b.left + 24, y: b.top + b.height / 2, count: 45, angle: -60, spread: 70, power: 12 });
      burst({ x: b.right - 24, y: b.top + b.height / 2, count: 45, angle: -120, spread: 70, power: 12 });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/app/referral"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to spin
      </Link>

      {/* hero */}
      <section
        ref={heroRef}
        className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(120%_90%_at_50%_0%,#3b1d6e_0%,#1b1038_50%,#0b0718_100%)] px-5 pb-10 pt-9 text-center text-white"
      >
        <div
          aria-hidden
          className="sw-rays pointer-events-none absolute left-1/2 top-1/2 -z-10 -ml-[22rem] -mt-[22rem] size-[44rem] rounded-full [background:repeating-conic-gradient(rgb(251_191_36/0.16)_0deg_7deg,transparent_7deg_16deg)] [mask-image:radial-gradient(circle,black_10%,transparent_60%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(40%_55%_at_50%_0%,rgb(255_255_255/0.14),transparent)]" />
        {STARS.map(([x, y, d], i) => (
          <span
            key={i}
            aria-hidden
            className="anim-twinkle pointer-events-none absolute size-1.5 rotate-45 bg-amber-100"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}ms` }}
          />
        ))}

        <span className="anim-fade-up inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-200">
          <Ticket className="size-3.5" /> Referral spin reward
        </span>
        <h1 className="mt-5 font-display text-5xl font-black leading-none tracking-tight text-[#fde68a] [text-shadow:0_4px_0_#b45309,0_10px_30px_rgb(0_0_0/0.55)] sm:text-6xl">
          <Letters text="YOU WON!" delay={200} />
        </h1>
        <p className="anim-fade-up mt-4 text-xl font-extrabold sm:text-2xl" style={{ ["--d" as string]: "650ms" } as CSSProperties}>
          {keys.length > 1 ? `${keys.length}× ` : ""}
          {prize}
        </p>
        <p className="anim-fade-up mt-1 text-sm text-white/55" style={{ ["--d" as string]: "750ms" } as CSSProperties}>
          Won {formatDate(wonAt, true)}
        </p>
      </section>

      {/* tickets */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">{keys.length > 1 ? "Your keys" : "Your key"}</h2>
            <p className="text-sm text-muted-foreground">Tap the golden ticket to unseal it.</p>
          </div>
          {sealed.length > 1 ? (
            <button
              type="button"
              onClick={() => setOpen(Object.fromEntries(keys.map((k) => [k.id, true])))}
              className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              Reveal all
            </button>
          ) : null}
        </div>

        {keys.map((k, i) => (
          <TicketCard key={k.id} k={k} index={i} open={!!open[k.id]} onReveal={(el) => reveal(k.id, el)} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/app/referral" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-card font-semibold transition-colors hover:bg-muted">
          <Sparkles className="size-4" /> Spin again
        </Link>
        <Link href="/app/keys" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground">
          <KeyRound className="size-4" /> Key vault
        </Link>
      </div>
      {layer}
    </div>
  );
}

function TicketCard({ k, index, open, onReveal }: { k: PrizeKey; index: number; open: boolean; onReveal: (el: HTMLElement | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const face = "[grid-area:1/1] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]";
  return (
    <div
      ref={ref}
      className="anim-fade-up [perspective:1200px]"
      style={{ ["--d" as string]: `${900 + index * 120}ms` } as CSSProperties}
    >
      <div
        className="grid transition-transform duration-700 [transform-style:preserve-3d] [transition-timing-function:cubic-bezier(0.34,1.4,0.5,1)]"
        style={{ transform: open ? "rotateX(180deg)" : "none" }}
      >
        {/* sealed front */}
        <button
          type="button"
          disabled={!k.code || open}
          onClick={() => onReveal(ref.current)}
          aria-label={`Reveal key for ${k.product}`}
          className={cn(
            face,
            "group relative flex min-h-28 w-full items-stretch overflow-hidden rounded-2xl border-2 border-[#1a0b04] text-left text-[#1a0b04]",
            "bg-[linear-gradient(135deg,#fde68a,#f59e0b_45%,#fcd34d_70%,#d97706)] shadow-[0_8px_0_#78350f,0_14px_30px_-10px_rgb(180_83_9/0.6)]",
            k.code && "anim-sheen-loop cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_3px_0_#78350f]",
          )}
        >
          <Notches />
          <span className="flex w-20 shrink-0 flex-col items-center justify-center gap-1 border-r-2 border-dashed border-[#1a0b04]/40">
            <KeyRound className="size-6" strokeWidth={2.4} />
            <span className="font-display text-xs font-black">#{index + 1}</span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3">
            <span className="truncate font-display text-lg font-black leading-tight">{k.product}</span>
            <span className="text-xs font-semibold opacity-75">{k.duration}</span>
            <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest">
              {k.code ? (
                <>
                  <Lock className="size-3.5 transition-transform group-hover:-rotate-12" /> Tap to reveal
                </>
              ) : (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Preparing…
                </>
              )}
            </span>
          </span>
        </button>

        {/* revealed back */}
        <div
          className={cn(
            face,
            "relative flex min-h-28 flex-col justify-center gap-2 overflow-hidden rounded-2xl border-2 border-[#1a0b04] bg-neutral-950 p-4 text-white shadow-[0_8px_0_#78350f]",
          )}
          style={{ transform: "rotateX(180deg)" }}
          aria-hidden={!open}
        >
          <Notches />
          <div className="flex items-center justify-between gap-2 px-2">
            <p className="min-w-0 truncate text-xs font-semibold text-white/60">
              {k.product} · {k.duration}
            </p>
            <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-amber-300">#{index + 1}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-300/25 bg-white/5 p-2 pl-4">
            <code className="min-w-0 flex-1 select-all break-all py-1.5 font-mono text-sm tracking-wide text-amber-100">{open ? k.code : ""}</code>
            {open && k.code ? <CopyKey value={k.code} /> : null}
          </div>
          {k.androidId ? (
            <p className="inline-flex items-center gap-1.5 px-2 text-xs text-white/55">
              <Smartphone className="size-3.5" /> Locked to <code className="font-mono text-white/80">{k.androidId}</code>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Ticket punch holes on both sides. */
function Notches() {
  const c = "absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-[#1a0b04] bg-background";
  return (
    <>
      <span aria-hidden className={cn(c, "-left-3")} />
      <span aria-hidden className={cn(c, "-right-3")} />
    </>
  );
}
