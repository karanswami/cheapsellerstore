"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type CSSProperties, type Ref } from "react";
import { toast } from "sonner";
import { Check, Copy, Gift, KeyRound, Lock, RotateCcw, Sparkles, Ticket, TicketPercent, Volume2, VolumeX, Wallet } from "lucide-react";
import { formatDate } from "@/components/app-ui";
import { reducedMotion, useConfetti } from "@/components/confetti";
import { formatMoney } from "@/lib/currencies";
import type { SpinOutcome, SpinState } from "@/lib/spin";
import { cn } from "@/lib/utils";

const SPIN_MS = 6400;
const WIND_MS = 480;
const SETTLE_MS = 750;
const TURNS = 7;
/** Degrees a peg drags the pointer before slipping past it. */
const PEG_W = 9;
const PTR_MAX = 28;

const WIN_COLORS = [
  ["#ff4d6d", "#9f1239"],
  ["#ffc233", "#b45309"],
  ["#34d399", "#047857"],
  ["#4f9dff", "#1d4ed8"],
  ["#c084fc", "#6b21a8"],
  ["#22d3ee", "#0e7490"],
  ["#fb923c", "#c2410c"],
  ["#a3e635", "#4d7c0f"],
];
const LOSE_COLOR = ["#64748b", "#1e293b"];
const INK = "#1a0b04";
const GOLD = "#fbbf24";
const BULBS = 24;
const R = 80;

export type WheelMode = "idle" | "spin" | "win" | "lose";

const mod = (a: number, n: number) => ((a % n) + n) % n;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
/** Random offset inside the landed wedge so the pointer never stops dead-centre. */
const landingJitter = (step: number) => (Math.random() - 0.5) * step * 0.6;
const stepOf = (n: number) => 360 / Math.max(1, n);

/** Wedge base colour, shared with the admin slot list. */
export function slotColor(index: number, kind: string) {
  return kind === "NONE" ? LOSE_COLOR[0] : WIN_COLORS[index % WIN_COLORS.length][0];
}

function pt(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)] as const;
}

function wedge(i: number, step: number) {
  if (step >= 360) return `M0 ${-R} A${R} ${R} 0 1 1 0 ${R} A${R} ${R} 0 1 1 0 ${-R} Z`;
  const [x1, y1] = pt(i * step, R);
  const [x2, y2] = pt((i + 1) * step, R);
  return `M0 0 L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${step > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/** Split a label into at most two balanced lines. */
function lines(label: string): string[] {
  const t = label.trim();
  const words = t.split(/\s+/);
  if (t.length <= 9 || words.length < 2) return [t.length > 20 ? `${t.slice(0, 19)}…` : t];
  let best = 1;
  let diff = Infinity;
  for (let k = 1; k < words.length; k++) {
    const d = Math.abs(words.slice(0, k).join(" ").length - words.slice(k).join(" ").length);
    if (d < diff) {
      diff = d;
      best = k;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")].map((l) => (l.length > 14 ? `${l.slice(0, 13)}…` : l));
}

function star(r: number, ri: number, n = 5) {
  return Array.from({ length: n * 2 }, (_, k) => {
    const [x, y] = pt((k * 180) / n, k % 2 ? ri : r);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

export const prizeText = (p: { kind: string; label: string; quantity: number }) =>
  p.kind === "KEY" && p.quantity > 1 ? `${p.quantity}× ${p.label}` : p.label;

/* ------------------------------------------------------------------ */
/* Sound: tiny WebAudio synth, no assets                               */
/* ------------------------------------------------------------------ */

let actx: AudioContext | null = null;
function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!actx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    actx = new C();
  }
  if (actx.state === "suspended") void actx.resume();
  return actx;
}

function note(c: AudioContext, o: { f: number; to?: number; at: number; dur: number; type?: OscillatorType; vol?: number }) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const t = c.currentTime + o.at;
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.f, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.15, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

const sfx = {
  tick() {
    const c = getAudio();
    if (c) note(c, { f: 2200, to: 900, at: 0, dur: 0.035, type: "square", vol: 0.04 });
  },
  windup() {
    const c = getAudio();
    if (c) note(c, { f: 180, to: 420, at: 0, dur: 0.45, type: "triangle", vol: 0.07 });
  },
  win() {
    const c = getAudio();
    if (!c) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(c, { f, at: i * 0.09, dur: 0.24, type: "triangle", vol: 0.16 }));
    [1046.5, 1318.5, 1568].forEach((f) => note(c, { f, at: 0.4, dur: 1, type: "sine", vol: 0.08 }));
    for (let i = 0; i < 8; i++) note(c, { f: 2200 + Math.random() * 2200, at: 0.45 + i * 0.07, dur: 0.12, vol: 0.035 });
  },
  lose() {
    const c = getAudio();
    if (!c) return;
    [
      [392, 370],
      [370, 349],
      [349, 330],
    ].forEach(([f, to], i) => note(c, { f, to, at: i * 0.32, dur: 0.3, type: "sawtooth", vol: 0.05 }));
    note(c, { f: 330, to: 196, at: 0.96, dur: 0.9, type: "sawtooth", vol: 0.06 });
  },
};

const vibrate = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {}
};

/* ------------------------------------------------------------------ */
/* Wheel graphics                                                      */
/* ------------------------------------------------------------------ */

export function WheelPointer({ pointerRef }: { pointerRef?: Ref<SVGSVGElement> }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-10 w-11 -translate-x-1/2 -translate-y-3">
      <svg
        ref={pointerRef}
        viewBox="-14 -4 28 42"
        className="w-full drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
        style={{ transformOrigin: "50% 9.5%" }}
      >
        <defs>
          <linearGradient id="sw-ptr" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f87171" />
            <stop offset="0.55" stopColor="#dc2626" />
            <stop offset="1" stopColor="#991b1b" />
          </linearGradient>
        </defs>
        <path d="M0 37 L-11 10 A12.5 12.5 0 1 1 11 10 Z" fill="url(#sw-ptr)" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M-5 9 A7 7 0 0 1 0 -1" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
        <circle cy="0" r="4.6" fill={GOLD} stroke={INK} strokeWidth="1.8" />
        <circle cx="-1.3" cy="-1.3" r="1.3" fill="#fff" fillOpacity="0.8" />
      </svg>
    </div>
  );
}

export function WheelSvg({
  prizes,
  rotation = 0,
  spinning = false,
  rotorRef,
  mode = "idle",
  highlight = null,
}: {
  prizes: { slot: number; kind: string; label: string; quantity: number }[];
  rotation?: number;
  spinning?: boolean;
  /** When given, the caller drives the rotor transform directly (per frame). */
  rotorRef?: Ref<SVGGElement>;
  mode?: WheelMode;
  highlight?: number | null;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tones = [...WIN_COLORS, LOSE_COLOR];
  const step = stepOf(prizes.length);
  const hiIndex = highlight == null ? -1 : prizes.findIndex((p) => p.slot === highlight);
  const hiWin = hiIndex >= 0 && prizes[hiIndex].kind !== "NONE";
  return (
    <svg viewBox="-100 -100 200 200" className="w-full overflow-visible" data-mode={mode}>
      <defs>
        {tones.map(([hi, lo], k) => (
          <radialGradient key={k} id={`${uid}w${k}`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={R}>
            <stop offset="0.12" stopColor={lo} />
            <stop offset="1" stopColor={hi} />
          </radialGradient>
        ))}
        <linearGradient id={`${uid}gold`} x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={`${uid}rim`} x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <radialGradient id={`${uid}gloss`} gradientUnits="userSpaceOnUse" cx="-30" cy="-50" r="120">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}vig`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={R}>
          <stop offset="0.75" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <filter id={`${uid}glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{`
        @keyframes swb-alt{0%,49%{opacity:1}50%,100%{opacity:.12}}
        @keyframes swb-alt2{0%,49%{opacity:.12}50%,100%{opacity:1}}
        @keyframes swb-chase{0%{opacity:1}30%,100%{opacity:.12}}
        @keyframes swb-flash{0%,49%{opacity:1}50%,100%{opacity:.2}}
        @keyframes swb-edge{0%,100%{stroke-opacity:1;stroke-width:3.2}50%{stroke-opacity:.45;stroke-width:5.5}}
        .sw-b{transition:opacity .3s}
        [data-mode=idle] .sw-b{animation:swb-alt 1.1s steps(1,end) infinite}
        [data-mode=idle] .sw-b.sw-odd{animation-name:swb-alt2}
        [data-mode=spin] .sw-b{animation:swb-chase .45s linear infinite;animation-delay:calc(var(--i) * -0.01875s)}
        [data-mode=win] .sw-b{animation:swb-flash .24s steps(1,end) infinite}
        [data-mode=lose] .sw-b{opacity:.1}
        .sw-labels{filter:blur(var(--blur,0px))}
        .sw-dim{transition:opacity .5s}
        .sw-edge{animation:swb-edge .8s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.sw-b,.sw-edge{animation:none!important}}
      `}</style>
      <circle r="99.5" fill="rgba(0,0,0,0.3)" cy="2.5" />
      <g
        ref={rotorRef}
        style={
          rotorRef
            ? { transformOrigin: "0 0" }
            : {
                transform: `rotate(${rotation}deg)`,
                transformOrigin: "0 0",
                transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.7, 0.1, 1)` : "none",
              }
        }
      >
        {/* rim */}
        <circle r="98.5" fill={`url(#${uid}gold)`} stroke={INK} strokeWidth="2" />
        <circle r="94.5" fill={`url(#${uid}rim)`} stroke={INK} strokeWidth="1.4" />
        <circle r="85.5" fill="#5b0f0f" stroke={INK} strokeWidth="1.4" />
        {/* bulbs */}
        {Array.from({ length: BULBS }, (_, k) => {
          const [x, y] = pt((k * 360) / BULBS, 90);
          return (
            <g key={k} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
              <circle r="3.7" fill="#451a03" stroke={INK} strokeWidth="0.8" />
              <g className={cn("sw-b", k % 2 && "sw-odd")} style={{ ["--i" as string]: k } as CSSProperties}>
                <circle r="5.6" fill="#fde047" opacity="0.45" />
                <circle r="3" fill="#fffbeb" stroke="#f59e0b" strokeWidth="0.9" />
              </g>
            </g>
          );
        })}
        {/* wedges */}
        <circle r={R + 3} fill={`url(#${uid}gold)`} stroke={INK} strokeWidth="1.2" />
        {prizes.map((p, i) => (
          <path
            key={p.slot}
            d={wedge(i, step)}
            fill={`url(#${uid}w${p.kind === "NONE" ? WIN_COLORS.length : i % WIN_COLORS.length})`}
            stroke="#fff"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        ))}
        <circle r={R} fill={`url(#${uid}vig)`} />
        <g className="sw-labels">
          {prizes.map((p, i) => {
            const ls = lines(prizeText(p));
            const longest = Math.max(...ls.map((l) => l.length));
            const cap = prizes.length > 6 ? 0.85 : 1;
            const fs = Math.max(7, Math.min((ls.length > 1 ? 11 : 12.5) * cap, 46 / (0.62 * longest)));
            const lh = fs * 1.08;
            return (
              <g key={p.slot} transform={`rotate(${i * step + step / 2})`}>
                <text
                  transform="translate(0,-71) rotate(-90)"
                  textAnchor="end"
                  fontSize={fs}
                  fontWeight="900"
                  fill="#fff"
                  stroke={INK}
                  strokeWidth={fs * 0.2}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                >
                  {ls.map((l, k) => (
                    <tspan key={k} x="0" y={(k - (ls.length - 1) / 2) * lh} dominantBaseline="central">
                      {l}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </g>
        {/* landed slot: dim the rest, outline the winner */}
        {prizes.map((p, i) => (
          <path
            key={p.slot}
            d={wedge(i, step)}
            fill="#000"
            className="sw-dim pointer-events-none"
            opacity={hiIndex >= 0 && i !== hiIndex ? 0.55 : 0}
          />
        ))}
        {hiIndex >= 0 ? (
          <path
            d={wedge(hiIndex, step)}
            fill={hiWin ? "#fff" : "none"}
            fillOpacity={hiWin ? 0.12 : 0}
            stroke={hiWin ? "#fde68a" : "#cbd5e1"}
            strokeLinejoin="round"
            strokeWidth="3.2"
            className={cn("pointer-events-none", hiWin && "sw-edge")}
            filter={hiWin ? `url(#${uid}glow)` : undefined}
          />
        ) : null}
        {/* pegs */}
        {prizes.map((p, i) => {
          const [x, y] = pt(i * step, R + 0.5);
          return (
            <g key={p.slot} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
              <circle r="2.8" fill={`url(#${uid}gold)`} stroke={INK} strokeWidth="0.9" />
            </g>
          );
        })}
        <circle r={R} fill="none" stroke={INK} strokeOpacity="0.5" strokeWidth="1" />
        {/* hub */}
        <circle r="17" fill={`url(#${uid}gold)`} stroke={INK} strokeWidth="2" />
        <circle r="12.5" fill="#dc2626" stroke={INK} strokeWidth="1.6" />
        <circle r="9.5" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1" />
        <polygon points={star(8, 3.4)} fill="#fef3c7" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
      </g>
      {/* glass reflection (does not rotate) */}
      <circle r="98" fill={`url(#${uid}gloss)`} className="pointer-events-none" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Result cards                                                        */
/* ------------------------------------------------------------------ */

function CountUp({ value }: { value: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1300);
      setV(p >= 1 ? value : value * easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{formatMoney(v)}</>;
}

export function Letters({ text, delay = 150, className }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} aria-hidden className="sw-letter" style={{ ["--d" as string]: `${delay + i * 55}ms` } as CSSProperties}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

export const GHOST_BTN =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white/85 transition hover:bg-white/10";
export const GOLD_BTN =
  "relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-[#1a0b04] bg-[linear-gradient(180deg,#fde68a,#f59e0b_55%,#d97706)] px-5 text-sm font-black uppercase tracking-wide text-[#1a0b04] shadow-[inset_0_2px_0_rgb(255_255_255/0.55),0_6px_0_#78350f] transition active:translate-y-1 active:shadow-[inset_0_2px_0_rgb(255_255_255/0.55),0_2px_0_#78350f] anim-sheen-loop";

function CouponChip({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Copy failed");
        }
      }}
      className="group mx-auto mt-3 flex items-center gap-2 rounded-xl border-2 border-dashed border-amber-300/70 bg-amber-300/10 px-4 py-2 font-mono text-lg font-black tracking-[0.2em] text-amber-100 transition hover:bg-amber-300/20"
    >
      {code}
      {done ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4 opacity-70 group-hover:opacity-100" />}
    </button>
  );
}

function WinCard({ result, canSpin, onAgain, onClose }: { result: SpinOutcome; canSpin: boolean; onAgain: () => void; onClose: () => void }) {
  const Icon = result.kind === "KEY" ? KeyRound : result.kind === "COUPON" ? TicketPercent : result.kind === "SPIN" ? RotateCcw : Wallet;
  const headline =
    result.kind === "KEY" ? (
      <>
        {result.quantity}× {result.label}
      </>
    ) : result.kind === "WALLET" ? (
      <span className="tabular-nums text-emerald-300">
        <CountUp value={result.walletAmount} />
      </span>
    ) : result.kind === "SPIN" ? (
      <span className="text-amber-200">
        +{result.quantity} free spin{result.quantity > 1 ? "s" : ""}
      </span>
    ) : (
      result.label
    );
  const sub =
    result.kind === "KEY"
      ? "Your key is sealed — open it to reveal."
      : result.kind === "WALLET"
        ? "Credit has been added to your wallet."
        : result.kind === "SPIN"
          ? "Added to your spins — go again!"
          : `One-time code · use at checkout${result.couponExpiresAt ? ` · valid till ${formatDate(result.couponExpiresAt)}` : ""}`;
  return (
    <div className="sw-drop-in relative w-full max-w-xs text-center">
      <div
        aria-hidden
        className="sw-rays pointer-events-none absolute left-1/2 top-12 -ml-[13rem] -mt-[13rem] size-[26rem] rounded-full [background:repeating-conic-gradient(rgb(251_191_36/0.3)_0deg_8deg,transparent_8deg_18deg)] [mask-image:radial-gradient(circle,black_12%,transparent_62%)]"
      />
      <div className="relative mx-auto grid size-24 place-items-center">
        <span className="anim-ping absolute inset-2 rounded-full bg-amber-300/40" />
        <span className="anim-success-pop relative grid size-24 place-items-center rounded-full border-4 border-[#1a0b04] bg-[radial-gradient(circle_at_35%_30%,#fff7c2,#fbbf24_45%,#b45309)] shadow-[0_0_50px_rgb(251_191_36/0.75)]">
          <Icon className="size-10 text-[#1a0b04]" strokeWidth={2.4} />
        </span>
        {[
          ["-left-6 top-0", "0ms"],
          ["-right-5 top-3", "400ms"],
          ["-left-3 bottom-0", "800ms"],
          ["-right-7 bottom-4", "1200ms"],
        ].map(([pos, d]) => (
          <Sparkles key={pos} className={cn("anim-twinkle absolute size-5 text-amber-200", pos)} style={{ animationDelay: d }} />
        ))}
      </div>
      <h3 className="relative mt-4 font-display text-[2.6rem] font-black leading-none tracking-tight text-[#fde68a] [text-shadow:0_3px_0_#b45309,0_8px_24px_rgb(0_0_0/0.55)]">
        <Letters text="YOU WON!" delay={250} />
      </h3>
      <p className="anim-fade-up relative mt-3 text-xl font-extrabold text-white" style={{ ["--d" as string]: "700ms" } as CSSProperties}>
        {headline}
      </p>
      {result.kind === "COUPON" && result.couponCode ? (
        <div className="anim-fade-up relative" style={{ ["--d" as string]: "780ms" } as CSSProperties}>
          <CouponChip code={result.couponCode} />
        </div>
      ) : null}
      <p className="anim-fade-up relative mt-2 text-sm text-white/60" style={{ ["--d" as string]: "850ms" } as CSSProperties}>
        {sub}
      </p>
      <div className="anim-fade-up relative mt-5 grid gap-2" style={{ ["--d" as string]: "950ms" } as CSSProperties}>
        {result.kind === "SPIN" ? (
          <button type="button" onClick={onAgain} disabled={!canSpin} className={cn(GOLD_BTN, "disabled:opacity-50")}>
            <RotateCcw className="size-4" /> Spin now
          </button>
        ) : (
          <Link
            href={
              result.kind === "KEY"
                ? result.orderId
                  ? `/app/win/${result.orderId}`
                  : "/app/keys"
                : result.kind === "COUPON"
                  ? "/"
                  : "/app/history"
            }
            className={GOLD_BTN}
          >
            <Icon className="size-4" /> {result.kind === "KEY" ? "Reveal my key" : result.kind === "COUPON" ? "Shop with coupon" : "View wallet"}
          </Link>
        )}
        <div className={cn("grid gap-2", result.kind !== "SPIN" && "grid-cols-2")}>
          <button type="button" onClick={onClose} className={GHOST_BTN}>
            Close
          </button>
          {result.kind !== "SPIN" ? (
            <button type="button" onClick={onAgain} disabled={!canSpin} className={cn(GHOST_BTN, "disabled:opacity-40")}>
              <RotateCcw className="size-4" /> Spin again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const DROPS = [12, 26, 40, 54, 68, 82, 19, 47, 75];

function LoseCard({
  result,
  nearMiss,
  canSpin,
  onAgain,
  onClose,
}: {
  result: SpinOutcome;
  nearMiss: string | null;
  canSpin: boolean;
  onAgain: () => void;
  onClose: () => void;
}) {
  return (
    <div className="sw-drop-in relative w-full max-w-xs text-center">
      <div className="relative mx-auto h-28 w-36">
        <div aria-hidden className="absolute inset-x-0 top-2 h-20 overflow-hidden">
          {DROPS.map((x, i) => (
            <span
              key={i}
              className="sw-rain absolute top-8 h-3 w-[2px] rounded-full bg-sky-300/70"
              style={{ left: `${x}%`, ["--d" as string]: `${(i * 137) % 900}ms` } as CSSProperties}
            />
          ))}
        </div>
        <span aria-hidden className="absolute left-1/2 top-0 -translate-x-1/2 text-[3.4rem] leading-none drop-shadow-lg">
          ☁️
        </span>
        <span aria-hidden className="sw-wobble absolute bottom-0 left-1/2 -ml-6 text-5xl leading-none">
          🥲
        </span>
      </div>
      <h3 className="mt-3 font-display text-4xl font-black tracking-tight text-slate-200 [text-shadow:0_3px_0_#334155,0_8px_24px_rgb(0_0_0/0.5)]">
        <Letters text="So close!" delay={200} />
      </h3>
      <p className="anim-fade-up mt-2 text-base font-semibold text-white/80" style={{ ["--d" as string]: "600ms" } as CSSProperties}>
        {result.label}
      </p>
      {nearMiss ? (
        <p
          className="anim-fade-up mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-200"
          style={{ ["--d" as string]: "750ms" } as CSSProperties}
        >
          Just missed: <b className="font-bold">{nearMiss}</b>
        </p>
      ) : null}
      <p className="anim-fade-up mt-3 text-xs text-white/50" style={{ ["--d" as string]: "850ms" } as CSSProperties}>
        Invite more friends — each first deposit earns you another spin.
      </p>
      <div className="anim-fade-up mt-5 grid grid-cols-2 gap-2" style={{ ["--d" as string]: "950ms" } as CSSProperties}>
        <button type="button" onClick={onClose} className={GHOST_BTN}>
          Close
        </button>
        {canSpin ? (
          <button type="button" onClick={onAgain} className={cn(GOLD_BTN, "h-10")}>
            <RotateCcw className="size-4" /> Try again
          </button>
        ) : (
          <Link href="/app/referral" onClick={onClose} className={GHOST_BTN}>
            <Gift className="size-4" /> Invite
          </Link>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The game                                                            */
/* ------------------------------------------------------------------ */

const STARS = [
  [8, 14, 0],
  [22, 6, 500],
  [88, 10, 300],
  [76, 22, 900],
  [5, 52, 1200],
  [94, 46, 700],
  [12, 84, 200],
  [90, 80, 1000],
  [50, 4, 1400],
];

type Tween = { from: number; to: number; t0: number; dur: number; ease: (t: number) => number; done: () => void };

export function SpinWheel({
  initial,
  onState,
  bare,
  hideHistory,
}: {
  initial: SpinState;
  onState?: (s: SpinState) => void;
  bare?: boolean;
  /** The page renders its own prize history. */
  hideHistory?: boolean;
}) {
  const [state, setStateRaw] = useState(initial);
  const setState = (v: SpinState | ((s: SpinState) => SpinState)) =>
    setStateRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      queueMicrotask(() => onState?.(next));
      return next;
    });
  const [mode, setModeState] = useState<WheelMode>("idle");
  const [result, setResult] = useState<SpinOutcome | null>(null);
  const [nearMiss, setNearMiss] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(0);
  const [muted, setMuted] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("spin-muted") === "1");

  const rotorRef = useRef<SVGGElement>(null);
  const pointerRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const rot = useRef(0);
  const tween = useRef<Tween | null>(null);
  const modeRef = useRef<WheelMode>("idle");
  const mutedRef = useRef(muted);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const { burst, layer: confettiLayer } = useConfetti();

  const prizes = [...state.prizes].sort((a, b) => a.slot - b.slot);
  const step = stepOf(prizes.length);
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  const canSpin = state.available > 0 && mode !== "spin";

  function setMode(m: WheelMode) {
    modeRef.current = m;
    setModeState(m);
  }
  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Live update: adopt fresh server state (new spins, edited prizes) unless a spin is in flight.
  const seenInitial = useRef(initial);
  useEffect(() => {
    if (seenInitial.current === initial) return;
    seenInitial.current = initial;
    if (modeRef.current !== "spin" && !busy.current) setState(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // One frame loop drives the rotor, the motion blur and the pointer's peg physics.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let prev = rot.current;
    let peg = Math.floor(rot.current / stepRef.current);
    let lastTick = 0;
    const ptr = { pos: 0, vel: 0 };
    const reduce = reducedMotion();

    const frame = (now: number) => {
      const dt = Math.min(64, now - last) || 16;
      last = now;
      const tw = tween.current;
      if (tw) {
        const p = Math.min(1, (now - tw.t0) / tw.dur);
        rot.current = tw.from + (tw.to - tw.from) * tw.ease(p);
        if (p >= 1) {
          tween.current = null;
          tw.done();
        }
      } else if (modeRef.current === "idle" && !reduce) {
        rot.current += dt * 0.0075; // slow attract drift
      }
      const r = rot.current;
      const v = (r - prev) / dt; // deg per ms
      prev = r;

      // peg passing the pointer -> tick
      const STEP = stepRef.current;
      const nextPeg = Math.floor(r / STEP);
      if (nextPeg !== peg) {
        peg = nextPeg;
        if (modeRef.current === "spin" && !mutedRef.current && now - lastTick > 28) {
          lastTick = now;
          sfx.tick();
        }
      }

      // pointer: pushed by the approaching peg, springs back after it slips past
      const m = mod(r, STEP);
      let target = 0;
      if (v >= 0 && STEP - m < PEG_W) target = -PTR_MAX * (1 - (STEP - m) / PEG_W);
      else if (v < 0 && m < PEG_W) target = PTR_MAX * (1 - m / PEG_W);
      ptr.vel += (target - ptr.pos) * 0.32;
      ptr.vel *= 0.62;
      ptr.pos += ptr.vel;
      if (target < 0) ptr.pos = Math.min(ptr.pos, target);
      if (target > 0) ptr.pos = Math.max(ptr.pos, target);

      const rotor = rotorRef.current;
      if (rotor) {
        rotor.style.transform = `rotate(${r}deg)`;
        rotor.style.setProperty("--blur", `${Math.min(2.4, Math.max(0, Math.abs(v) - 0.35) * 1.5).toFixed(2)}px`);
      }
      if (pointerRef.current) pointerRef.current.style.transform = `rotate(${ptr.pos.toFixed(2)}deg)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const animate = (to: number, dur: number, ease: (t: number) => number) =>
    new Promise<void>((done) => {
      tween.current = { from: rot.current, to, t0: performance.now(), dur, ease, done };
    });

  function toggleMute() {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    try {
      window.localStorage.setItem("spin-muted", next ? "1" : "0");
    } catch {}
  }

  function wheelCenter() {
    const b = boxRef.current?.getBoundingClientRect();
    return b ? { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width } : { x: window.innerWidth / 2, y: window.innerHeight / 2, w: 300 };
  }

  function celebrate() {
    const c = wheelCenter();
    burst({ x: c.x, y: c.y, count: 140, power: 13 });
    later(() => {
      burst({ x: c.x - c.w * 0.6, y: c.y + c.w * 0.3, count: 70, angle: -65, spread: 50, power: 17 });
      burst({ x: c.x + c.w * 0.6, y: c.y + c.w * 0.3, count: 70, angle: -115, spread: 50, power: 17 });
    }, 900);
    later(() => burst({ x: window.innerWidth / 2, y: -20, count: 120, angle: 90, spread: 160, power: 6 }), 1700);
  }

  async function spin() {
    if (busy.current || state.available < 1) return;
    busy.current = true;
    setOverlay(false);
    setResult(null);
    setHighlight(null);
    setNearMiss(null);
    setShake(false);
    setMode("spin");
    if (!mutedRef.current) getAudio(); // unlock audio inside the user gesture
    const reduce = reducedMotion();

    const req = fetch("/api/spin", { method: "POST" }).then(async (res) => {
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? "Spin failed.");
      return json.data as SpinOutcome;
    });
    req.catch(() => {});

    try {
      if (!reduce) {
        if (!mutedRef.current) sfx.windup();
        await animate(rot.current - 18, WIND_MS, easeOutCubic);
      }
      const out = await req;
      const index = Math.max(0, prizes.findIndex((p) => p.slot === out.slot));
      const center = index * step + step / 2;
      const jitter = landingJitter(step);
      const cur = rot.current;
      const target = cur + 360 * (reduce ? 2 : TURNS) + mod(-(center + jitter) - cur, 360);
      const over = reduce ? 0 : 3.5;
      await animate(target + over, reduce ? 2200 : SPIN_MS, easeOutQuart);
      if (over) await animate(target, SETTLE_MS, easeInOutSine);
      land(out, index, jitter);
    } catch (e) {
      setMode("idle");
      toast.error(e instanceof Error ? e.message : "Spin failed.");
    } finally {
      busy.current = false;
    }
  }

  function land(out: SpinOutcome, index: number, jitter: number) {
    const win = out.kind !== "NONE";
    setResult(out);
    setHighlight(out.slot);
    setState((s) => ({ ...s, available: out.remaining }));
    setMode(win ? "win" : "lose");

    if (win) {
      if (!mutedRef.current) sfx.win();
      vibrate([40, 60, 40, 60, 160]);
      setFlash((k) => k + 1);
      celebrate();
      later(() => setOverlay(true), 1100);
    } else {
      const nb = prizes[mod(index + (jitter > 0 ? 1 : -1), prizes.length)];
      setNearMiss(nb && nb.kind !== "NONE" && Math.abs(jitter) > step * 0.12 ? prizeText(nb) : null);
      if (!mutedRef.current) sfx.lose();
      vibrate(220);
      setShake(true);
      later(() => setShake(false), 750);
      later(() => setOverlay(true), 1200);
    }

    fetch("/api/spin")
      .then((r) => r.json())
      .then((j) => j?.data && setState(j.data))
      .catch(() => {});
  }

  function closeOverlay() {
    setOverlay(false);
    setHighlight(null);
    setMode("idle");
  }

  function again() {
    closeOverlay();
    void spin();
  }

  const stage = (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[1.75rem] border border-white/10 px-4 pb-6 pt-4 text-white shadow-[0_24px_60px_-24px_rgb(124_58_237/0.55)]",
        "bg-[radial-gradient(120%_85%_at_50%_0%,#3b1d6e_0%,#1b1038_48%,#0b0718_100%)]",
      )}
    >
      {/* spotlight + stars */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-3/4 bg-[radial-gradient(45%_60%_at_50%_0%,rgb(255_255_255/0.16),transparent)]" />
      {STARS.map(([x, y, d], i) => (
        <span
          key={i}
          aria-hidden
          className="anim-twinkle pointer-events-none absolute size-1.5 rotate-45 bg-amber-100"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}ms` }}
        />
      ))}

      {/* top bar */}
      <div className={cn("relative z-10 flex items-center justify-between gap-2", bare && "pr-9")}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
          <Ticket className="size-3.5" /> {state.available} spin{state.available === 1 ? "" : "s"}
        </span>
        <p className="font-display text-sm font-black uppercase tracking-[0.25em] text-white/80">
          Spin <span className="text-amber-300">&amp;</span> Win
        </p>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          className="grid size-8 place-items-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:bg-white/10"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      {/* wheel */}
      <div className="relative mx-auto mt-7 w-full max-w-[21rem]">
        <div
          aria-hidden
          className={cn(
            "sw-halo pointer-events-none absolute -inset-5 -z-10 rounded-full bg-[conic-gradient(#f43f5e,#fbbf24,#34d399,#22d3ee,#a78bfa,#f43f5e)] blur-2xl transition-opacity duration-700",
            mode === "spin" ? "opacity-80" : mode === "win" ? "opacity-100" : mode === "lose" ? "opacity-0" : "opacity-40",
          )}
        />
        <div className={cn("relative transition-[filter] duration-700", mode === "lose" && "grayscale-[0.85] brightness-[0.75]", shake && "sw-wheel-shake")}>
          <WheelPointer pointerRef={pointerRef} />
          <div ref={boxRef} className="relative">
            <WheelSvg prizes={prizes} rotorRef={rotorRef} mode={mode} highlight={highlight} />
            <button
              type="button"
              onClick={spin}
              disabled={!canSpin}
              aria-label="Spin the wheel"
              className={cn(
                "absolute left-1/2 top-1/2 z-10 grid aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#1a0b04]",
                "bg-[radial-gradient(circle_at_35%_28%,#fff7c2,#fbbf24_45%,#b45309)] font-display font-black tracking-wider text-[#1a0b04]",
                "shadow-[inset_0_-4px_0_rgb(0_0_0/0.25),inset_0_3px_0_rgb(255_255_255/0.6)] transition-[scale] duration-150 active:scale-90 disabled:cursor-not-allowed",
                canSpin && "sw-glow-pulse cursor-pointer hover:scale-105",
                mode === "idle" && !canSpin && "grayscale-[0.4]",
              )}
            >
              <span className={cn("grid place-items-center leading-none", canSpin && "sw-hub-breathe")}>
                {mode === "spin" ? (
                  <Sparkles className="size-6 animate-spin" />
                ) : state.available < 1 ? (
                  <Lock className="size-5" />
                ) : (
                  <span className="text-[clamp(0.8rem,4vw,1.15rem)]">SPIN</span>
                )}
              </span>
            </button>
          </div>
          {flash ? (
            <div
              key={flash}
              aria-hidden
              className="sw-flash pointer-events-none absolute -inset-4 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.95),rgb(253_230_138/0.5)_40%,transparent_70%)]"
            />
          ) : null}
        </div>
        {/* stand shadow */}
        <div aria-hidden className="mx-auto mt-2 h-3 w-1/2 rounded-[50%] bg-black/60 blur-md" />
      </div>

      {/* prize legend */}
      <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
        {prizes.map((p, i) => (
          <span
            key={p.slot}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/75 transition",
              highlight === p.slot && mode === "win" && "border-amber-300/60 bg-amber-300/15 text-amber-100",
            )}
          >
            <span className="size-2 rounded-full" style={{ background: p.kind === "NONE" ? LOSE_COLOR[0] : WIN_COLORS[i % 6][0] }} />
            {prizeText(p)}
          </span>
        ))}
      </div>

      {/* main CTA */}
      <div className="relative mt-5 flex justify-center">
        <button type="button" onClick={spin} disabled={!canSpin} className={cn(GOLD_BTN, "h-12 w-full max-w-xs text-base disabled:opacity-50 disabled:active:translate-y-0")}>
          <Sparkles className="size-5" />
          {mode === "spin" ? "Spinning…" : state.available < 1 ? "No spins left" : "Spin the wheel"}
        </button>
      </div>

      {/* result reveal */}
      {overlay && result ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#0b0718]/75 p-5 backdrop-blur-[3px] animate-in fade-in-0">
          {result.kind === "NONE" ? (
            <LoseCard result={result} nearMiss={nearMiss} canSpin={state.available > 0} onAgain={again} onClose={closeOverlay} />
          ) : (
            <WinCard result={result} canSpin={state.available > 0} onAgain={again} onClose={closeOverlay} />
          )}
        </div>
      ) : null}
    </div>
  );

  const muteText = bare ? "text-white/50" : "text-muted-foreground";
  const linkTone = bare ? "text-amber-300 hover:text-amber-200" : "text-primary hover:underline";
  const won = state.history.filter((h) => h.prizeKind);
  const history = won.length && !hideHistory ? (
    <div className={cn("mt-5 border-t pt-4", bare && "border-white/10 px-2 text-white/85")}>
      <p className={cn("mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide", muteText)}>
        <Gift className="size-3.5" /> Recent spins
      </p>
      <ul className={cn("divide-y text-sm", bare && "divide-white/10")}>
        {won.slice(0, 6).map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3 py-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn("size-2 shrink-0 rounded-full", h.prizeKind === "NONE" ? "bg-slate-400/60" : "bg-emerald-400")} />
              <span className="truncate">{historyText(h)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              {h.prizeKind === "KEY" && h.orderId ? (
                <Link href={`/app/win/${h.orderId}`} className={cn("inline-flex items-center gap-1 text-xs font-semibold", linkTone)}>
                  <KeyRound className="size-3.5" /> View key
                </Link>
              ) : null}
              {h.prizeKind === "COUPON" && h.couponCode ? (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(h.couponCode!);
                    toast.success("Coupon copied");
                  }}
                  className={cn("inline-flex items-center gap-1 font-mono text-xs font-semibold", linkTone)}
                >
                  <Copy className="size-3.5" /> {h.couponCode}
                </button>
              ) : null}
              <span className={cn("text-xs", muteText)}>{h.usedAt ? formatDate(h.usedAt, true) : ""}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <div>
      {stage}
      {bare ? (
        <p className="mt-4 px-2 text-center text-xs text-white/50">
          You get <b className="text-white/90">1 free spin</b> when a friend you invited makes their first deposit.
        </p>
      ) : null}
      {history}
      {confettiLayer}
    </div>
  );
}

function historyText(h: SpinState["history"][number]) {
  switch (h.prizeKind) {
    case "NONE":
      return h.prizeLabel;
    case "KEY":
      return `${h.quantity}× ${h.prizeLabel}`;
    case "WALLET":
      return `${formatMoney(h.walletAmount ?? 0)} wallet`;
    case "SPIN":
      return `+${h.quantity ?? 1} free spin${(h.quantity ?? 1) > 1 ? "s" : ""}`;
    default:
      return h.prizeLabel;
  }
}
