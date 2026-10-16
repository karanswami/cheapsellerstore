"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type Bit = { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string; round: boolean; t: number; life: number };
const COLORS = ["#fbbf24", "#f43f5e", "#22d3ee", "#a78bfa", "#34d399", "#fb923c", "#ffffff", "#3b82f6"];

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const noopSubscribe = () => () => {};

/** Canvas confetti in a fixed full-screen layer. Render `layer` once, call `burst` from handlers. */
export function useConfetti() {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const bits = useRef<Bit[]>([]);
  const raf = useRef(0);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function frame() {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) {
      raf.current = 0;
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    bits.current = bits.current.filter((b) => b.t < b.life && b.y < h + 40);
    for (const b of bits.current) {
      b.t++;
      b.vy += 0.17;
      b.vx *= 0.986;
      b.vy *= 0.986;
      b.x += b.vx + Math.sin(b.t * 0.08 + b.w) * 0.6;
      b.y += b.vy;
      b.r += b.vr;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (b.life - b.t) / 35);
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.scale(1, Math.cos(b.t * 0.16 + b.w));
      ctx.fillStyle = b.c;
      if (b.round) {
        ctx.beginPath();
        ctx.arc(0, 0, b.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    raf.current = bits.current.length ? requestAnimationFrame(frame) : 0;
  }

  /** x/y in viewport px; angle in degrees (-90 = up). */
  function burst(o: { x: number; y: number; count: number; angle?: number; spread?: number; power?: number }) {
    if (reducedMotion()) return;
    for (let i = 0; i < o.count; i++) {
      const a = (((o.angle ?? -90) + (Math.random() - 0.5) * (o.spread ?? 360)) * Math.PI) / 180;
      const s = (o.power ?? 11) * (0.4 + Math.random() * 0.8);
      bits.current.push({
        x: o.x,
        y: o.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 5,
        c: COLORS[i % COLORS.length],
        round: Math.random() < 0.25,
        t: 0,
        life: 150 + Math.random() * 90,
      });
    }
    if (!raf.current) raf.current = requestAnimationFrame(frame);
  }

  const layer = mounted
    ? createPortal(<canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />, document.body)
    : null;

  return { burst, layer };
}
