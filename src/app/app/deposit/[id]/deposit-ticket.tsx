"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Ban,
  Check,
  CircleAlert,
  Clock,
  Copy,
  ExternalLink,
  Hourglass,
  ImageUp,
  LifeBuoy,
  Loader2,
  type LucideIcon,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  TimerOff,
  X,
} from "lucide-react";
import { Surface } from "@/components/app-kit";
import { BottomSheet, SuccessScreen } from "@/components/app-kit-client";
import { formatDate } from "@/components/app-ui";
import { formatMoney } from "@/lib/currencies";
import { feedbackError, feedbackTap } from "@/lib/feedback";
import { cn } from "@/lib/utils";

export type TicketDeposit = {
  id: string;
  status: string;
  method: string;
  manualMethodKey: string | null;
  gatewayKey: string | null;
  amount: number;
  payCurrency: string;
  requestedAmount: number;
  payableAmount: number;
  secretCode: string | null;
  qrImage: string | null;
  qrString: string | null;
  paymentUrl: string | null;
  payId: string | null;
  instructions: string | null;
  expiresAt: string | null;
  proofImage: string | null;
  adminAction: string | null;
  adminNote: string | null;
  failReason: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  label: string;
  hasProof: boolean;
};

type Phase = "waiting" | "confirming" | "review" | "success" | "cancelled" | "expired" | "rejected" | "failed";

const OPEN = ["PENDING", "PROCESSING"];
const LIVE: Phase[] = ["waiting", "confirming", "review"];

function phaseOf(d: TicketDeposit): Phase {
  switch (d.status) {
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    case "FAILED":
      return d.adminAction === "rejected" ? "rejected" : d.failReason === "expired" ? "expired" : "failed";
    default:
      return d.hasProof ? "review" : d.status === "PROCESSING" ? "confirming" : "waiting";
  }
}

/** Hero tint, pill and copy per phase. `glow` feeds the .hero-card light. */
const PHASE: Record<Phase, { label: string; title: string; icon: LucideIcon; glow: string; pill: string; text: string }> = {
  waiting: {
    label: "Awaiting payment",
    title: "Complete your payment",
    icon: Clock,
    glow: "#f59e0b",
    pill: "bg-amber-400/15 text-amber-300 ring-amber-300/25",
    text: "Pay the exact amount below. This page updates by itself.",
  },
  confirming: {
    label: "Confirming",
    title: "Confirming payment",
    icon: RefreshCw,
    glow: "#0ea5e9",
    pill: "bg-sky-400/15 text-sky-300 ring-sky-300/25",
    text: "We're checking with the payment provider. Hang tight, it only takes a moment.",
  },
  review: {
    label: "In review",
    title: "Payment under review",
    icon: ShieldCheck,
    glow: "#8b5cf6",
    pill: "bg-violet-400/15 text-violet-300 ring-violet-300/25",
    text: "We got your screenshot. Our team is verifying it. We'll notify you once it's done.",
  },
  success: {
    label: "Credited",
    title: "Money added",
    icon: Check,
    glow: "#10b981",
    pill: "bg-emerald-400/15 text-emerald-300 ring-emerald-300/25",
    text: "Your wallet has been topped up.",
  },
  cancelled: {
    label: "Cancelled",
    title: "Deposit cancelled",
    icon: Ban,
    glow: "#64748b",
    pill: "bg-slate-400/15 text-slate-300 ring-slate-300/25",
    text: "You cancelled this deposit. Nothing was charged to your wallet.",
  },
  expired: {
    label: "Expired",
    title: "Time ran out",
    icon: TimerOff,
    glow: "#f97316",
    pill: "bg-orange-400/15 text-orange-300 ring-orange-300/25",
    text: "This payment window closed before we received your payment.",
  },
  rejected: {
    label: "Rejected",
    title: "Payment rejected",
    icon: X,
    glow: "#f43f5e",
    pill: "bg-rose-400/15 text-rose-300 ring-rose-300/25",
    text: "Our team couldn't verify this payment.",
  },
  failed: {
    label: "Failed",
    title: "Payment failed",
    icon: CircleAlert,
    glow: "#f43f5e",
    pill: "bg-rose-400/15 text-rose-300 ring-rose-300/25",
    text: "Something went wrong with this payment.",
  },
};

const REASONS: Record<string, string> = {
  underpayment: "The amount we received was less than the amount required.",
  amount_mismatch: "The amount paid didn't match the exact amount on the ticket.",
  expired: "The payment window closed before the payment arrived.",
  cancelled: "The payment was cancelled at the provider.",
  cancelled_by_user: "You cancelled this deposit.",
};

function reasonOf(d: TicketDeposit) {
  const raw = d.adminNote || d.failReason;
  if (!raw) return null;
  return REASONS[raw] ?? raw;
}

function useCountdown(expiresAt: string | null, active: boolean) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt || !active) return;
    const tick = () => setLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt, active]);
  return left;
}

function mmss(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}

function copy(text: string, msg = "Copied") {
  navigator.clipboard?.writeText(text);
  feedbackTap({ impact: "light", silent: true });
  toast.success(msg);
}

export function DepositTicket({ initial }: { initial: TicketDeposit }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState<"verify" | "cancel" | "proof" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Full-screen outcome only on a live transition seen on this page, never on a revisit.
  const [outcome, setOutcome] = useState<Phase | null>(null);
  const phase = phaseOf(d);
  const open = OPEN.includes(d.status);
  const left = useCountdown(d.expiresAt, phase === "waiting");
  const shown = useRef(initial);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/deposits/${initial.id}/status`, { cache: "no-store" });
    if (!res.ok) return;
    const next: TicketDeposit = (await res.json()).data.deposit;
    const was = phaseOf(shown.current);
    const now = phaseOf(next);
    shown.current = next;
    setD(next);
    if (was === now || !LIVE.includes(was)) return;
    if (now === "success") {
      setOutcome("success");
      router.refresh();
    } else if (now === "rejected" || now === "failed" || now === "expired") {
      setOutcome(now);
    }
  }, [initial.id, router]);

  // Live update: the page re-rendered with newer server data (e.g. admin approved it).
  const seenInitial = useRef(initial);
  useEffect(() => {
    if (seenInitial.current === initial) return;
    seenInitial.current = initial;
    void refresh();
  }, [initial, refresh]);

  // Poll while open (the server soft-expires overdue tickets on read); check right away when the user comes back from their payment app.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 4000);
    const onShow = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [open, refresh]);

  async function call(kind: "verify" | "cancel", body?: object) {
    setBusy(kind);
    try {
      const res = await fetch(`/api/deposits/${d.id}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Request failed.");
      if (json.data?.message) toast.success(json.data.message);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  }

  async function sendProof(file: File) {
    setBusy("proof");
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/support/upload", { method: "POST", body: form });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error?.message ?? "Upload failed.");
      const res = await fetch(`/api/deposits/${d.id}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofImage: upJson.data.upload.url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not attach proof.");
      toast.success("Screenshot sent for review.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  const ref = d.id.slice(-8).toUpperCase();
  const payValue = d.payableAmount || d.requestedAmount;
  const payAmount = `${payValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${d.payCurrency}`;
  const methodKey = d.method === "MANUAL" ? (d.manualMethodKey ? `manual:${d.manualMethodKey}` : null) : d.gatewayKey;
  const retryHref = methodKey
    ? `/app/deposit?method=${encodeURIComponent(methodKey)}&amount=${encodeURIComponent(String(d.requestedAmount))}`
    : "/app/deposit";
  const helpHref = `/app/reports?new=deposit&target=${d.id}`;
  const reason = reasonOf(d);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SuccessScreen
        open={outcome === "success"}
        title="Payment received"
        amount={`+${formatMoney(d.amount)}`}
        subtitle="Added to your wallet. Happy shopping!"
      >
        <Link href="/app" className={PRIMARY}>
          <ShoppingBag className="size-4" /> Start shopping
        </Link>
        <button type="button" onClick={() => setOutcome(null)} className={SECONDARY}>
          View receipt
        </button>
      </SuccessScreen>

      <FailScreen
        phase={outcome === "rejected" || outcome === "failed" || outcome === "expired" ? outcome : null}
        reason={reason}
        retryHref={retryHref}
        helpHref={helpHref}
        onClose={() => setOutcome(null)}
      />

      <Hero d={d} phase={phase} left={left} payAmount={payAmount} refId={ref} />

      {phase === "waiting" ? (
        <PayPanel
          d={d}
          payAmount={payAmount}
          payValue={payValue}
          busy={busy}
          orderId={orderId}
          setOrderId={setOrderId}
          onVerify={(body) => call("verify", body)}
          onProof={sendProof}
        />
      ) : null}

      {phase === "review" || phase === "confirming" ? <NextSteps d={d} phase={phase} /> : null}

      {phase === "cancelled" || phase === "expired" || phase === "rejected" || phase === "failed" ? (
        <Surface className="space-y-4 p-5">
          {reason && phase !== "cancelled" ? (
            <div className="rounded-2xl bg-muted/50 p-4 ring-1 ring-inset ring-white/[0.06]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {phase === "rejected" ? "Note from our team" : "What happened"}
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm">{reason}</p>
            </div>
          ) : null}
          {phase !== "cancelled" ? (
            <p className="text-sm text-muted-foreground">
              Already paid and the money left your account? Open a ticket with your payment screenshot and we&rsquo;ll sort it out.
            </p>
          ) : null}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Link href={retryHref} className={PRIMARY}>
              <RotateCcw className="size-4" /> Try again
            </Link>
            {phase === "cancelled" ? (
              <Link href="/app" className={SECONDARY_LINK}>
                Back to home
              </Link>
            ) : (
              <Link href={helpHref} className={SECONDARY_LINK}>
                <LifeBuoy className="size-4" /> Get help
              </Link>
            )}
          </div>
        </Surface>
      ) : null}

      {phase === "success" ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link href="/app" className={PRIMARY}>
            <ShoppingBag className="size-4" /> Start shopping
          </Link>
          <Link href="/app/deposit" className={SECONDARY_LINK}>
            <Plus className="size-4" /> Add more money
          </Link>
        </div>
      ) : null}

      <Surface className="p-5">
        <p className="mb-3 font-display text-base font-bold">Details</p>
        <dl className="space-y-3 text-sm">
          <Row k="Method" v={d.label} />
          <Row k="You pay" v={payAmount} />
          <Row k="Wallet credit" v={<span className={cn("tabular-nums", phase === "success" && "text-success")}>{formatMoney(d.amount)}</span>} />
          <Row
            k="Ticket ID"
            v={
              <button type="button" onClick={() => copy(d.id, "Ticket ID copied")} className="tap inline-flex items-center gap-1.5 font-mono text-xs">
                {d.id.slice(0, 6)}…{d.id.slice(-6)} <Copy className="size-3.5 text-primary" />
              </button>
            }
          />
          <Row k="Created" v={formatDate(d.createdAt, true)} />
          {d.completedAt ? <Row k="Credited" v={formatDate(d.completedAt, true)} /> : null}
          {!d.completedAt && d.cancelledAt && !open ? <Row k="Closed" v={formatDate(d.cancelledAt, true)} /> : null}
        </dl>
        {phase === "waiting" ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setConfirmCancel(true)}
            className="tap mt-4 w-full rounded-2xl py-3 text-sm font-semibold text-destructive ring-1 ring-inset ring-destructive/25 disabled:opacity-50"
          >
            Cancel this deposit
          </button>
        ) : null}
      </Surface>

      <BottomSheet
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this deposit?"
        subtitle={`${payAmount} · ${d.label}`}
      >
        <p className="text-sm text-muted-foreground">
          Don&rsquo;t cancel if you&rsquo;ve already paid: the payment won&rsquo;t be matched to your wallet. Use <b>I&rsquo;ve paid</b> instead.
        </p>
        <div className="mt-5 grid gap-2.5">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => call("cancel")}
            className="tap flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-destructive font-bold text-white disabled:opacity-50"
          >
            {busy === "cancel" ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />} Yes, cancel it
          </button>
          <button type="button" onClick={() => setConfirmCancel(false)} className={SECONDARY}>
            Keep it open
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

const PRIMARY =
  "tap bg-brand-gradient flex h-13 w-full items-center justify-center gap-2 rounded-2xl font-bold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50";
const SECONDARY = "tap h-12 w-full rounded-2xl bg-muted/70 text-sm font-semibold";
const SECONDARY_LINK = "tap flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-muted/70 text-sm font-semibold";

/** Status-tinted receipt hero: emblem, amount, Created → Paid → Credited track. */
function Hero({ d, phase, left, payAmount, refId }: { d: TicketDeposit; phase: Phase; left: number | null; payAmount: string; refId: string }) {
  const p = PHASE[phase];
  const live = LIVE.includes(phase);
  const proofFlow = d.method === "MANUAL" || d.method === "ESEWA";
  const bad = phase === "rejected" || phase === "failed";
  const closed = phase === "cancelled" || phase === "expired";

  const steps: { label: string; state: "done" | "now" | "todo" | "bad" }[] = [
    { label: "Created", state: "done" },
    {
      label: closed ? PHASE[phase].label : proofFlow ? "Proof sent" : "Paid",
      state: closed ? "bad" : phase === "waiting" ? "now" : bad && !d.hasProof && !proofFlow ? "bad" : "done",
    },
    {
      label: bad ? PHASE[phase].label : "Credited",
      state: phase === "success" ? "done" : bad ? "bad" : phase === "review" || phase === "confirming" ? "now" : "todo",
    },
  ];

  return (
    <section
      aria-label="Deposit status"
      aria-live="polite"
      className="hero-card anim-fade-up"
      style={{ "--glow": p.glow, "--hero-a": p.glow } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset", p.pill)}>
          {live ? (
            <span className="relative size-1.5">
              <span className="anim-ping absolute inset-0 rounded-full bg-current" />
              <span className="absolute inset-0 rounded-full bg-current" />
            </span>
          ) : (
            <p.icon className="size-3.5" strokeWidth={2.75} />
          )}
          {p.label}
        </span>
        <button
          type="button"
          onClick={() => copy(refId, "Deposit number copied")}
          className="tap rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/85"
        >
          #{refId}
        </button>
      </div>

      <div className="flex flex-col items-center px-5 pb-6 pt-6 text-center">
        <Emblem d={d} phase={phase} left={left} />
        <h2 key={phase} className="anim-fade-up mt-4 font-display text-2xl font-bold tracking-tight">
          {p.title}
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-white/65">{p.text}</p>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
          {phase === "success" ? "Added to wallet" : live ? "Wallet gets" : "Amount"}
        </p>
        <p
          className={cn(
            "mt-1 font-display text-[2.4rem] font-bold leading-none tracking-tight tabular-nums drop-shadow-[0_2px_12px_rgb(0_0_0/0.35)]",
            phase === "success" && "text-emerald-300",
            (bad || closed) && "text-white/45 line-through decoration-2",
          )}
        >
          {phase === "success" ? "+" : ""}
          {formatMoney(d.amount)}
        </p>
        <p className="mt-2 text-xs text-white/55">
          {payAmount} via {d.label}
        </p>
      </div>

      <div aria-hidden className="relative border-t border-dashed border-white/15">
        <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full bg-background" />
        <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full bg-background" />
      </div>

      <ol className="grid grid-cols-3 px-3 pb-5 pt-4">
        {steps.map((st, i) => (
          <li key={i} className="relative flex flex-col items-center gap-1.5 text-center">
            {i > 0 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2",
                  st.state === "done" ? "bg-white/70" : st.state === "bad" ? "bg-rose-400/60" : "bg-white/15",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative grid size-6 place-items-center rounded-full text-[11px] font-bold",
                st.state === "done" && "bg-white text-[#0b1020]",
                st.state === "bad" && "bg-rose-400 text-[#0b1020]",
                st.state === "now" && "bg-[#0b1020] text-white ring-2 ring-white/80",
                st.state === "todo" && "border border-white/25 bg-[#0b1020] text-white/50",
              )}
            >
              {st.state === "now" ? <span className="anim-ping absolute inset-0 rounded-full bg-white/30" /> : null}
              {st.state === "done" ? <Check className="size-3.5" strokeWidth={3.5} /> : st.state === "bad" ? "!" : i + 1}
            </span>
            <span className={cn("text-[11px] font-semibold", st.state === "todo" ? "text-white/45" : "text-white/90")}>{st.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Big status mark: countdown ring while waiting, orbit while checking, popped icon once settled. */
function Emblem({ d, phase, left }: { d: TicketDeposit; phase: Phase; left: number | null }) {
  const p = PHASE[phase];
  if (phase === "waiting" && d.expiresAt && left != null) {
    const total = Math.max(1, new Date(d.expiresAt).getTime() - new Date(d.createdAt).getTime());
    const frac = Math.min(1, left / total);
    const low = left < 2 * 60_000;
    const C = 2 * Math.PI * 52;
    return (
      <div className="relative grid size-32 place-items-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="7" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={low ? "#fb7185" : p.glow}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="text-center">
          <p className={cn("font-mono text-2xl font-bold tabular-nums", low && "text-rose-300")}>{mmss(left)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">left</p>
        </div>
      </div>
    );
  }
  if (phase === "waiting" || phase === "confirming" || phase === "review") {
    const Icon = phase === "review" ? Hourglass : phase === "confirming" ? RefreshCw : Clock;
    return (
      <div className="relative grid size-28 place-items-center">
        <span className="absolute inset-0 rounded-full ring-[6px] ring-inset ring-white/10" />
        <span
          className="anim-orbit absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(from 0deg, transparent 0 65%, ${p.glow})`, mask: "radial-gradient(circle, transparent 47px, #000 48px)" }}
        />
        <span className="anim-breathe grid size-20 place-items-center rounded-full" style={{ background: `color-mix(in oklab, ${p.glow} 22%, transparent)` }}>
          <Icon className="size-9" style={{ color: p.glow }} />
        </span>
      </div>
    );
  }
  return (
    <div className="relative grid size-28 place-items-center">
      <span className="anim-ring-out absolute inset-0 rounded-full border-2" style={{ borderColor: p.glow }} />
      <span
        className="anim-success-pop grid size-24 place-items-center rounded-full ring-1 ring-inset"
        style={{ background: `color-mix(in oklab, ${p.glow} 22%, transparent)`, color: p.glow, borderColor: p.glow }}
      >
        <p.icon className="size-11" strokeWidth={2.5} />
      </span>
    </div>
  );
}

function PayPanel({
  d,
  payAmount,
  payValue,
  busy,
  orderId,
  setOrderId,
  onVerify,
  onProof,
}: {
  d: TicketDeposit;
  payAmount: string;
  payValue: number;
  busy: string | null;
  orderId: string;
  setOrderId: (v: string) => void;
  onVerify: (body?: object) => void;
  onProof: (f: File) => void;
}) {
  const needsProof = (d.method === "ESEWA" || d.method === "MANUAL") && !d.hasProof;
  const isBinance = d.method === "BINANCE";
  return (
    <Surface className="space-y-4 p-5">
      <p className="font-display text-base font-bold">Pay with {d.label}</p>

      <button
        type="button"
        onClick={() => copy(String(payValue), "Amount copied")}
        className="tap block w-full rounded-2xl bg-muted/50 p-4 text-center ring-1 ring-inset ring-white/[0.06]"
      >
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pay exactly · tap to copy</span>
        <span className="mt-1 flex items-center justify-center gap-2 font-display text-3xl font-bold tabular-nums">
          {payAmount} <Copy className="size-4 text-primary" />
        </span>
        {d.payableAmount && d.payableAmount !== d.requestedAmount ? (
          <span className="mt-1 block text-xs text-warning">Include the extra digits: they match the payment to you.</span>
        ) : null}
      </button>

      {d.qrImage ? (
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.qrImage} alt="Payment QR" className="mx-auto size-60 rounded-2xl bg-white object-contain p-2.5 shadow-xl shadow-black/30" />
          <p className="mt-2 text-xs text-muted-foreground">Scan with any supported app, or screenshot it and open in your app.</p>
        </div>
      ) : null}

      {d.payId ? <CopyRow label="Binance Pay ID" value={d.payId} /> : null}
      {d.secretCode ? <CopyRow label="Note / reference (add it to the payment)" value={d.secretCode} /> : null}

      {d.paymentUrl ? (
        <a href={d.paymentUrl} target="_blank" rel="noreferrer" className={PRIMARY}>
          Open payment page <ExternalLink className="size-4" />
        </a>
      ) : null}

      {d.instructions ? <p className="whitespace-pre-line text-sm text-muted-foreground">{d.instructions}</p> : null}

      {needsProof ? (
        <label className="tap flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-white/10 px-4 py-4 hover:border-primary/50">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            {busy === "proof" ? <Loader2 className="size-5 animate-spin" /> : <ImageUp className="size-5" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{busy === "proof" ? "Uploading…" : "Upload payment screenshot"}</span>
            <span className="block text-xs text-muted-foreground">After paying, send the screenshot for review</span>
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => e.target.files?.[0] && onProof(e.target.files[0])}
          />
        </label>
      ) : null}

      {isBinance ? (
        <div className="space-y-2.5">
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Binance order ID (optional)"
            inputMode="numeric"
            className="h-12 w-full rounded-2xl border border-white/[0.06] bg-muted/50 px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
          <VerifyButton busy={busy === "verify"} disabled={busy !== null} onClick={() => onVerify({ orderId: orderId.trim() || undefined })} />
        </div>
      ) : !needsProof ? (
        <VerifyButton busy={busy === "verify"} disabled={busy !== null} onClick={() => onVerify()} />
      ) : null}
    </Surface>
  );
}

function VerifyButton({ busy, disabled, onClick }: { busy: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="tap flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-success/15 font-bold text-success ring-1 ring-inset ring-success/30 disabled:opacity-50"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={3} />}
      {busy ? "Checking…" : "I've paid, check now"}
    </button>
  );
}

function NextSteps({ d, phase }: { d: TicketDeposit; phase: "review" | "confirming" }) {
  return (
    <Surface className="space-y-4 p-5">
      <p className="font-display text-base font-bold">What happens now</p>
      <ul className="space-y-3 text-sm">
        <Tick done>{phase === "review" ? "Screenshot received" : "Payment details sent to the provider"}</Tick>
        <Tick>{phase === "review" ? "Our team checks it against the payment (usually a few minutes)" : "We confirm the payment arrived"}</Tick>
        <Tick>Your wallet is credited and you get a notification</Tick>
      </ul>
      {d.proofImage ? (
        <a href={d.proofImage} target="_blank" rel="noreferrer" className="tap flex items-center gap-3 rounded-2xl bg-muted/50 p-2.5 ring-1 ring-inset ring-white/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.proofImage} alt="Your payment screenshot" className="size-14 rounded-xl object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Your screenshot</span>
            <span className="block text-xs text-muted-foreground">Tap to view</span>
          </span>
          <ExternalLink className="mr-1 size-4 text-muted-foreground" />
        </a>
      ) : null}
      <p className="text-xs text-muted-foreground">You can leave this page. It keeps updating, and we&rsquo;ll notify you when it&rsquo;s done.</p>
    </Surface>
  );
}

function Tick({ done, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
          done ? "bg-success text-white" : "border border-white/15 text-muted-foreground",
        )}
      >
        {done ? <Check className="size-3" strokeWidth={3.5} /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <span className={done ? "" : "text-muted-foreground"}>{children}</span>
    </li>
  );
}

const noopSubscribe = () => () => {};

/** Full-screen bad news for a live transition (rejected / failed / expired), the counterpart of SuccessScreen. */
function FailScreen({
  phase,
  reason,
  retryHref,
  helpHref,
  onClose,
}: {
  phase: "rejected" | "failed" | "expired" | null;
  reason: string | null;
  retryHref: string;
  helpHref: string;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  useEffect(() => {
    if (phase) feedbackError();
  }, [phase]);
  if (!phase || !mounted) return null;
  const p = PHASE[phase];
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={p.title}
      className="anim-page-in fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-background/95 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] backdrop-blur-xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[30%] size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        style={{ background: `color-mix(in oklab, ${p.glow} 18%, transparent)` }}
      />
      <div className="relative w-full max-w-sm text-center">
        <div className="anim-shake mx-auto grid size-28 place-items-center">
          <span
            className="anim-success-pop grid size-28 place-items-center rounded-full"
            style={{ background: `color-mix(in oklab, ${p.glow} 20%, transparent)`, color: p.glow }}
          >
            <p.icon className="size-14" strokeWidth={2.5} />
          </span>
        </div>
        <h2 className="anim-fade-up mt-6 font-display text-3xl font-bold tracking-tight [--d:200ms]">{p.title}</h2>
        <p className="anim-fade-up mt-3 text-sm text-muted-foreground [--d:300ms]">{reason ?? p.text}</p>
        <div className="anim-fade-up mt-8 space-y-2.5 [--d:400ms]">
          <Link href={retryHref} className={PRIMARY}>
            <RotateCcw className="size-4" /> Try again
          </Link>
          <Link href={helpHref} className={SECONDARY_LINK}>
            <LifeBuoy className="size-4" /> Paid already? Get help
          </Link>
          <button type="button" onClick={onClose} className="tap h-11 w-full text-sm font-semibold text-muted-foreground">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      className="tap flex w-full items-center justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3 text-left ring-1 ring-inset ring-white/[0.06]"
    >
      <span className="min-w-0">
        <span className="block text-[11px] text-muted-foreground">{label}</span>
        <span className="block truncate font-mono text-sm">{value}</span>
      </span>
      <Copy className="size-4 shrink-0 text-primary" />
    </button>
  );
}
