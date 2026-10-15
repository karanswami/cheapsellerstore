"use client";

import {
  closedDepositTitle,
  formatDepositFailReason,
  formatPayAmount,
  getDepositMethodMeta,
  remainingSeconds,
} from "@/components/app/deposit-method-meta";
import styles from "@/components/app/deposit-ui.module.css";
import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useSiteIcons } from "@/components/theme/site-icons-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  defaultManualDepositIconKey,
  type ManualDepositCurrency,
} from "@/types/manual-deposit";
import { isSiteIconKey } from "@/types/site-icons";
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Flag,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Upload,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";

type DepositDetail = {
  id: string;
  status: string;
  method: string;
  label: string;
  amount: number;
  payCurrency: string;
  payableAmount: number;
  providerDepositId?: string | null;
  secretCode: string | null;
  qrImage: string | null;
  qrString?: string | null;
  paymentUrl: string | null;
  paymentSessionId?: string | null;
  cashfreeMode?: "sandbox" | "production" | null;
  payId?: string | null;
  instructions: string | null;
  expiresAt: string | null;
  proofImage: string | null;
  hasProof: boolean;
  adminAction?: string | null;
  adminNote?: string | null;
  failReason: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  methodIconUrl?: string | null;
  methodIconKey?: string | null;
};

/** Prefer API label for MANUAL (meta falls back to QRIS otherwise). */
function depositMethodCopy(
  deposit: DepositDetail,
  meta: ReturnType<typeof getDepositMethodMeta>,
) {
  const isManual = deposit.method === "MANUAL";
  const title =
    deposit.label?.trim() ||
    (isManual ? "Manual deposit" : meta.label);
  const subtitle = isManual
    ? `${deposit.payCurrency || "USD"} · admin review`
    : `${meta.region} · payment ticket`;
  const headerDescription = isManual
    ? `${title} · admin review`
    : `${title} · ${meta.region}`;
  return {
    title,
    subtitle,
    headerDescription,
    logoClassName: isManual ? undefined : meta.logoClassName,
  };
}

const MANUAL_HOW_TO_STEPS = [
  {
    title: "Pay exact amount",
    text: "Send the exact total shown on this ticket — wrong amounts delay approval.",
  },
  {
    title: "Save your proof",
    text: "Keep a clear screenshot of the successful payment.",
  },
  {
    title: "Wait for review",
    text: "Admin verifies the proof and credits your USD wallet.",
  },
] as const;

function copyText(value?: string | null) {
  if (!value) return false;
  void navigator.clipboard?.writeText(value);
  return true;
}

function CompactTimer({
  seconds,
  totalSeconds,
}: {
  seconds: number;
  totalSeconds: number;
}) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const pct = totalSeconds > 0 ? Math.min(1, Math.max(0, seconds / totalSeconds)) : 0;
  const offset = c * (1 - pct);
  const mm = String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, seconds) % 60).padStart(2, "0");
  const urgent = seconds > 0 && seconds <= 60;
  const critical = seconds > 0 && seconds <= 30;
  const label = seconds <= 0 ? "0:00" : `${mm}:${ss}`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2 py-1",
        critical
          ? "bg-destructive/10 ring-1 ring-destructive/35"
          : urgent
            ? "bg-amber-500/10 ring-1 ring-amber-500/35"
            : "bg-muted/50 ring-1 ring-foreground/10",
      )}
      title="Time left to pay"
    >
      <div className="relative size-8 shrink-0">
        <svg viewBox="0 0 36 36" className="-rotate-90 size-full">
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            className="stroke-muted"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            className={cn(
              "transition-[stroke-dashoffset,stroke] duration-1000 ease-linear",
              critical
                ? "stroke-destructive"
                : urgent
                  ? "stroke-amber-500"
                  : "stroke-primary",
            )}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <Clock
          className={cn(
            "absolute inset-0 m-auto size-3",
            critical
              ? "text-destructive"
              : urgent
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground",
          )}
          aria-hidden
        />
      </div>
      <span
        className={cn(
          "pr-1 text-sm font-semibold tabular-nums tracking-tight",
          critical && "text-destructive",
          urgent && !critical && "text-amber-600 dark:text-amber-400",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function TicketNotch() {
  return (
    <div className="relative h-4" aria-hidden>
      <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-border/40" />
      <div className="absolute -left-2.5 top-1/2 size-5 -translate-y-1/2 rounded-full border border-border/40 bg-background" />
      <div className="absolute -right-2.5 top-1/2 size-5 -translate-y-1/2 rounded-full border border-border/40 bg-background" />
    </div>
  );
}

function StatusPill({
  open,
  danger,
  waitingAdmin,
  status,
}: {
  open: boolean;
  danger: boolean;
  waitingAdmin: boolean;
  status: string;
}) {
  const label = waitingAdmin ? "In review" : status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset",
        waitingAdmin &&
          "bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-300",
        open &&
          !waitingAdmin &&
          "bg-primary/10 text-primary ring-primary/20",
        danger && "bg-destructive/10 text-destructive ring-destructive/25",
        !open &&
          !danger &&
          !waitingAdmin &&
          "bg-muted text-muted-foreground ring-border",
      )}
    >
      {open && !waitingAdmin ? (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
      ) : waitingAdmin ? (
        <ShieldCheck className="size-3" aria-hidden />
      ) : danger ? (
        <X className="size-3" aria-hidden />
      ) : (
        <Clock className="size-3" aria-hidden />
      )}
      {label}
    </span>
  );
}

function SuccessBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-[38%] size-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--success)_28%,transparent),transparent_68%)]" />
      <div className="absolute left-1/2 top-[38%] size-[14rem] -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-success/10 [animation-duration:2.4s]" />
      {[
        "left-[18%] top-[28%]",
        "right-[20%] top-[24%]",
        "left-[28%] top-[52%]",
        "right-[26%] top-[48%]",
        "left-[42%] top-[18%]",
        "right-[40%] top-[58%]",
      ].map((pos) => (
        <span
          key={pos}
          className={cn(
            "absolute size-1.5 rounded-full bg-success/50 animate-in fade-in zoom-in duration-700",
            pos,
          )}
        />
      ))}
    </div>
  );
}

type TerminalTone = "danger" | "warning" | "muted";

function terminalMeta(
  status: string,
  adminAction?: string | null,
  failReason?: string | null,
): {
  tone: TerminalTone;
  title: string;
  subtitle: string;
  icon: typeof XCircle;
  glow: string;
  iconClass: string;
} {
  const isRejected =
    status === "REJECTED" ||
    adminAction === "rejected" ||
    (status === "FAILED" &&
      Boolean(failReason) &&
      failReason !== "expired" &&
      failReason !== "cancelled_by_user");

  if (isRejected) {
    return {
      tone: "danger",
      title: "Deposit rejected",
      subtitle: "An admin could not verify this payment.",
      icon: ShieldAlert,
      glow: "color-mix(in oklab, var(--destructive) 24%, transparent)",
      iconClass: "bg-destructive/12 text-destructive ring-destructive/25",
    };
  }

  switch (status) {
    case "CANCELLED":
      return {
        tone: "muted",
        title: "Payment cancelled",
        subtitle: "This top-up was stopped. Nothing was charged.",
        icon: Ban,
        glow: "color-mix(in oklab, var(--muted-foreground) 22%, transparent)",
        iconClass: "bg-muted text-muted-foreground ring-muted-foreground/20",
      };
    case "EXPIRED":
      return {
        tone: "warning",
        title: "Ticket expired",
        subtitle: "Time ran out before we could confirm your payment.",
        icon: Clock,
        glow: "color-mix(in oklab, var(--warning) 24%, transparent)",
        iconClass: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
      };
    case "FAILED":
    default:
      return {
        tone: "danger",
        title: "Payment failed",
        subtitle: "The provider did not complete this checkout.",
        icon: XCircle,
        glow: "color-mix(in oklab, var(--destructive) 24%, transparent)",
        iconClass: "bg-destructive/12 text-destructive ring-destructive/25",
      };
  }
}

function TerminalOutcome({
  deposit,
  logoSrc,
  meta,
  payLabel,
}: {
  deposit: DepositDetail;
  logoSrc: string;
  meta: ReturnType<typeof getDepositMethodMeta>;
  payLabel: string;
}) {
  const isRejected =
    deposit.status === "REJECTED" ||
    deposit.adminAction === "rejected" ||
    (deposit.status === "FAILED" &&
      Boolean(deposit.failReason) &&
      deposit.failReason !== "expired" &&
      deposit.failReason !== "cancelled_by_user");

  const info = terminalMeta(deposit.status, deposit.adminAction, deposit.failReason);
  const Icon = info.icon;
  const reason = formatDepositFailReason(
    deposit.adminNote || deposit.failReason,
    deposit.status,
  );
  const methodCopy = depositMethodCopy(deposit, meta);

  return (
    <main className={styles.terminalShell}>
      <div
        className={styles.terminalGlow}
        style={{
          background: `radial-gradient(ellipse at center, ${info.glow}, transparent 68%)`,
        }}
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <span
            className="absolute -inset-4 rounded-full blur-xl opacity-60"
            style={{ background: info.glow }}
            aria-hidden
          />
          <div
            className={cn(
              styles.terminalIcon,
              "size-[5.25rem]",
              info.iconClass,
            )}
          >
            <Icon className="size-10" strokeWidth={2.25} />
          </div>
        </div>

        <div className="text-center">
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-[0.2em]",
              info.tone === "danger" && "text-destructive",
              info.tone === "warning" && "text-amber-400",
              info.tone === "muted" && "text-muted-foreground",
            )}
          >
            {closedDepositTitle(deposit.status, deposit.adminAction)}
          </p>
          <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight sm:text-3xl">
            {info.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {isRejected ? info.subtitle : reason || info.subtitle}
          </p>
        </div>

        {/* Dedicated Rejection Reason Banner */}
        {isRejected ? (
          <div className="w-full rounded-2xl border border-destructive/35 bg-destructive/10 p-4 text-left shadow-md shadow-destructive/5 ring-1 ring-destructive/25 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-destructive/20 text-destructive ring-1 ring-destructive/30">
                <ShieldAlert className="size-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-destructive">
                  Rejection Reason
                </p>
                <p className="text-sm font-semibold leading-relaxed text-foreground break-words">
                  {reason || "Payment could not be verified by admin."}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  If you have questions, submit an issue report or start a new top-up.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <article className="w-full overflow-hidden rounded-[1.35rem] bg-card/90 shadow-lg ring-1 ring-border/60 backdrop-blur-sm">
          <div className="border-b border-border/40 bg-muted/25 px-5 py-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Ticket summary
            </p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
              {payLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Wallet credit would have been {formatMoney(deposit.amount)}
            </p>
          </div>
          <div className="space-y-0 px-1 py-1">
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Method</span>
              <span className="inline-flex items-center gap-2 font-medium">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt=""
                  className={cn(
                    "size-5 rounded-md object-contain",
                    methodCopy.logoClassName,
                  )}
                />
                {methodCopy.title}
              </span>
            </div>
            {isRejected && (deposit.failReason || deposit.adminNote) ? (
              <>
                <div className="mx-4 border-t border-border/40" />
                <div className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="max-w-[65%] text-right font-semibold text-destructive break-words">
                    {reason}
                  </span>
                </div>
              </>
            ) : null}
            <div className="mx-4 border-t border-border/40" />
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Ticket</span>
              <span className="font-mono text-xs font-semibold">
                #{deposit.id.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>
        </article>

        <div className="grid w-full grid-cols-1 gap-2.5">
          <Link
            href="/app/deposit"
            className={cn(
              styles.glowBtn,
              "flex h-12 w-full items-center justify-center gap-2 text-sm",
            )}
          >
            <span className="relative z-10">New top-up</span>
          </Link>
          <Link
            href="/app/reports"
            className={cn(
              styles.glowBtnOutline,
              "flex h-12 w-full items-center justify-center gap-2 text-sm",
            )}
          >
            <Flag className="size-4" />
            Report
          </Link>
        </div>
      </div>
    </main>
  );
}

export function DepositWaitingView({ depositId }: { depositId: string }) {
  const router = useRouter();
  const { user, refresh: refreshAuth } = useAuth();
  const { getIcon } = useSiteIcons();
  const [deposit, setDeposit] = useState<DepositDetail | null>(null);
  const [acting, setActing] = useState<"cancel" | "check" | "proof" | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const completedReveal = useRef(false);
  const lastStatusRef = useRef<string | null>(null);
  const [payingCashfree, setPayingCashfree] = useState(false);
  const [binanceOrderId, setBinanceOrderId] = useState("");
  const [verifyingBinance, setVerifyingBinance] = useState(false);
  const [verifyingQris, setVerifyingQris] = useState(false);
  const refreshBusy = acting === "check";
  const cancelBusy = acting === "cancel";

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const refresh = useCallback(
    async (manual?: boolean) => {
      if (manual) {
        setActing("check");
        toast.loading("Refreshing…", { id: "dep-status" });
      }
      try {
        const res = await fetch(`/api/deposits/${depositId}/status`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json()) as {
          data?: { deposit: DepositDetail };
          error?: { message: string };
        };
        if (!res.ok) {
          if (manual) {
            toast.error(json.error?.message ?? "Could not load deposit", {
              id: "dep-status",
            });
          }
          return;
        }
        const next = json.data?.deposit;
        if (!next) return;

        const prev = lastStatusRef.current;
        const transitioningToComplete =
          next.status === "COMPLETED" &&
          prev !== null &&
          prev !== "COMPLETED" &&
          !completedReveal.current;

        const terminalFail = [
          "FAILED",
          "CANCELLED",
          "EXPIRED",
          "REJECTED",
        ].includes(next.status);
        const transitioningToFail =
          terminalFail &&
          prev !== null &&
          prev !== next.status &&
          !["FAILED", "CANCELLED", "EXPIRED", "REJECTED"].includes(prev);

        if (transitioningToComplete) {
          completedReveal.current = true;
          lastStatusRef.current = next.status;
          setConfirming(true);
          toast.dismiss("dep-status");
          void refreshAuth();
          window.setTimeout(() => {
            setDeposit(next);
            setConfirming(false);
            toast.success("Payment confirmed", { id: "dep-status" });
          }, 1600);
          return;
        }

        if (transitioningToFail) {
          lastStatusRef.current = next.status;
          setDeposit(next);
          toast.error(closedDepositTitle(next.status), { id: "dep-status" });
          return;
        }

        lastStatusRef.current = next.status;
        setDeposit(next);
        if (manual) toast.success("Up to date", { id: "dep-status" });
      } finally {
        if (manual) setActing(null);
      }
    },
    [depositId, refreshAuth],
  );

  const handleVerifyBinance = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (verifyingBinance) return;
      setVerifyingBinance(true);
      toast.loading("Verifying Binance Pay transaction…", {
        id: "binance-verify",
      });
      try {
        const res = await fetch(`/api/deposits/${depositId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            orderId: binanceOrderId.trim() || undefined,
          }),
        });
        const json = (await res.json()) as {
          data?: { message?: string };
          error?: { message?: string };
        };
        if (!res.ok) {
          toast.error(json.error?.message || "Verification failed.", {
            id: "binance-verify",
          });
          return;
        }
        toast.success(
          json.data?.message || "Payment verified! Crediting wallet…",
          { id: "binance-verify" },
        );
        void refresh(false);
        void refreshAuth();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to verify transaction.",
          { id: "binance-verify" },
        );
      } finally {
        setVerifyingBinance(false);
      }
    },
    [depositId, binanceOrderId, verifyingBinance, refresh, refreshAuth],
  );

  const handleVerifyQris = useCallback(async () => {
    if (verifyingQris) return;
    setVerifyingQris(true);
    toast.loading("Verifying QRIS payment status…", { id: "qris-verify" });
    try {
      const res = await fetch(`/api/deposits/${depositId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as {
        data?: { message?: string; completed?: boolean };
        error?: { message?: string };
      };
      if (!res.ok) {
        toast.error(
          json.error?.message ||
            "Payment not confirmed yet. Please wait a few seconds and try again.",
          { id: "qris-verify" },
        );
        return;
      }
      toast.success(
        json.data?.message || "Payment verified! Crediting wallet…",
        { id: "qris-verify" },
      );
      void refresh(false);
      void refreshAuth();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to verify transaction.",
        { id: "qris-verify" },
      );
    } finally {
      setVerifyingQris(false);
    }
  }, [depositId, verifyingQris, refresh, refreshAuth]);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => {
      if (document.hidden) return;
      void refresh();
    }, 5_000);
    return () => window.clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (deposit?.status !== "COMPLETED" || confirming) return;
    const t = window.setTimeout(() => {
      router.push("/app/deposit");
      router.refresh();
    }, 5200);
    return () => window.clearTimeout(t);
  }, [deposit?.status, confirming, router]);

  const meta = useMemo(
    () => getDepositMethodMeta(deposit?.method ?? "UPI"),
    [deposit?.method],
  );
  const logoSrc = useMemo(() => {
    if (deposit?.method === "MANUAL") {
      const custom = deposit.methodIconUrl?.trim();
      if (custom) return custom;
      if (deposit.methodIconKey && isSiteIconKey(deposit.methodIconKey)) {
        return getIcon(deposit.methodIconKey);
      }
      const pay = deposit.payCurrency as ManualDepositCurrency;
      const key =
        pay === "INR" || pay === "IDR" || pay === "NPR" || pay === "USD"
          ? defaultManualDepositIconKey(pay)
          : "deposit-manual";
      return getIcon(key);
    }
    return getIcon(meta.iconKey) || meta.logoSrc;
  }, [deposit, getIcon, meta.iconKey, meta.logoSrc]);

  const openCashfreeCheckout = useCallback(async () => {
    const sessionId = deposit?.paymentSessionId;
    if (!sessionId) {
      toast.error("Payment session missing. Create a new deposit.");
      return;
    }
    setPayingCashfree(true);
    try {
      const { load } = await import("@cashfreepayments/cashfree-js");
      const mode =
        deposit?.cashfreeMode === "production" ||
        deposit?.cashfreeMode === "sandbox"
          ? deposit.cashfreeMode
          : process.env.NEXT_PUBLIC_CASHFREE_MODE === "production"
            ? "production"
            : "sandbox";
      const cashfree = await load({ mode });
      if (!cashfree) {
        toast.error("Could not load Cashfree checkout.");
        return;
      }
      // Popup on this page — no full-page redirect so users can still cancel.
      const result = (await cashfree.checkout({
        paymentSessionId: sessionId,
        redirectTarget: "_modal",
      })) as {
        error?: { message?: string };
        paymentDetails?: unknown;
        redirect?: boolean;
      } | undefined;

      if (result?.paymentDetails) {
        toast.loading("Checking payment…", { id: "dep-status" });
      }
      // Recheck after modal closes (paid, failed, or dismissed). No toast on dismiss.
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Cashfree checkout failed",
      );
    } finally {
      setPayingCashfree(false);
    }
  }, [deposit?.cashfreeMode, deposit?.paymentSessionId, refresh]);

  async function confirmCancel() {
    if (cancelBusy) return;
    setActing("cancel");
    try {
      const res = await fetch(`/api/deposits/${depositId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Cancel failed");
        return;
      }
      setCancelOpen(false);
      // Show the same full-screen cancelled outcome as failed/expired (don't leave the ticket).
      lastStatusRef.current = "CANCELLED";
      setDeposit((prev) =>
        prev
          ? {
              ...prev,
              status: "CANCELLED",
              failReason: "cancelled_by_user",
            }
          : prev,
      );
      toast.success("Ticket cancelled");
    } catch {
      toast.error("Cancel failed");
    } finally {
      setActing(null);
    }
  }

  async function onRefreshClick() {
    if (refreshBusy || cancelBusy) return;
    await refresh(true);
  }

  async function attachProofFile(file: File) {
    setActing("proof");
    toast.loading("Uploading…", { id: "dep-proof" });
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/support/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const upJson = (await up.json()) as {
        data?: { upload?: { url?: string } };
        error?: { message: string };
      };
      if (!up.ok || !upJson.data?.upload?.url) {
        toast.error(upJson.error?.message ?? "Upload failed", {
          id: "dep-proof",
        });
        return;
      }

      const res = await fetch(`/api/deposits/${depositId}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ proofImage: upJson.data.upload.url }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Could not attach proof", {
          id: "dep-proof",
        });
        return;
      }
      toast.success("Proof sent — awaiting review", { id: "dep-proof" });
      await refresh();
    } finally {
      setActing(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function copyAndToast(label: string, value?: string | null) {
    if (copyText(value)) toast.success(`${label} copied`);
    else toast.error(`${label} unavailable`);
  }

  async function downloadQr() {
    if (!deposit?.qrImage) return;
    try {
      const res = await fetch(deposit.qrImage, { cache: "no-store" });
      if (!res.ok) {
        toast.error("Could not download QR");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `drip-${deposit.method.toLowerCase()}-qr.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Saved");
    } catch {
      toast.error("Could not download QR");
    }
  }

  if (!deposit) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-4 py-20">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_70%)]"
          aria-hidden
        />
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-card shadow-md shadow-black/5 ring-1 ring-foreground/10">
          <Spinner className="size-7 text-primary" />
        </div>
        <div className="relative text-center">
          <p className="text-sm font-semibold tracking-tight">
            Opening payment ticket…
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Fetching amount, QR, and instructions
          </p>
        </div>
      </main>
    );
  }

  const open =
    deposit.status === "PENDING" || deposit.status === "PROCESSING";
  const isManualProof =
    deposit.method === "ESEWA" || deposit.method === "MANUAL";
  const methodCopy = depositMethodCopy(deposit, meta);
  const howToSteps =
    deposit.method === "MANUAL" ? MANUAL_HOW_TO_STEPS : meta.steps;
  const waitingAdmin = isManualProof && deposit.hasProof && open;
  const secs = remainingSeconds(deposit.expiresAt, now);
  const totalSecs =
    deposit.method === "MANUAL" ? 30 * 60 : meta.expiryMinutes * 60;
  const terminal = [
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "EXPIRED",
    "REJECTED",
  ].includes(deposit.status);
  const success = deposit.status === "COMPLETED";
  const danger = !success && terminal;
  const showCashfreePay = Boolean(
    deposit.paymentSessionId && open && !waitingAdmin,
  );
  const showPrimaryPay = Boolean(
    (deposit.paymentUrl || deposit.paymentSessionId) && open && !waitingAdmin,
  );
  const showStickyBar = open;
  const payLabel = formatPayAmount(
    deposit.payableAmount,
    deposit.payCurrency,
  );

  if (confirming) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-4 py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--success)_20%,transparent),transparent_68%)]"
          aria-hidden
        />
        <div className="relative">
          <span className="absolute -inset-3 animate-ping rounded-full bg-success/15 [animation-duration:1.8s]" />
          <div className="relative flex size-[5.5rem] items-center justify-center rounded-full bg-success/12 text-success ring-4 ring-success/15">
            <Spinner className="size-9" />
          </div>
        </div>
        <div className="relative max-w-xs animate-in fade-in slide-in-from-bottom-2 text-center duration-500">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-success">
            Confirming
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Almost there
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Crediting{" "}
            <span className="font-semibold text-success">
              {formatMoney(deposit.amount)}
            </span>{" "}
            to your wallet…
          </p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className={styles.terminalShell}>
        <SuccessBurst />

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-500">
          <div className="relative">
            <span className="absolute -inset-4 rounded-full bg-success/10 blur-xl" />
            <span className="absolute -inset-1 animate-ping rounded-full bg-success/20 [animation-duration:2s]" />
            <div
              className={cn(
                styles.terminalIcon,
                "size-[5.25rem] bg-success text-white shadow-xl shadow-success/30",
              )}
            >
              <Check className="size-10 animate-in zoom-in duration-300" strokeWidth={2.75} />
            </div>
          </div>

          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-success">
              Payment confirmed
            </p>
            <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight sm:text-3xl">
              You&apos;re topped up
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Funds are ready to spend in the store
            </p>
          </div>

          <article className="w-full overflow-hidden rounded-[1.35rem] bg-card/90 shadow-lg shadow-success/10 ring-1 ring-success/20 backdrop-blur-sm">
            <div className="border-b border-success/15 bg-success/8 px-5 py-4 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Credited to wallet
              </p>
              <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-success">
                +{formatMoney(deposit.amount)}
              </p>
            </div>
            <div className="space-y-0 px-1 py-1">
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="inline-flex items-center gap-2 font-medium">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoSrc}
                    alt=""
                    className={cn(
                      "size-5 rounded-md object-contain",
                      methodCopy.logoClassName,
                    )}
                  />
                  {methodCopy.title}
                </span>
              </div>
              <div className="mx-4 border-t border-border/40" />
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium tabular-nums">{payLabel}</span>
              </div>
              {typeof user?.walletBalance === "number" ? (
                <>
                  <div className="mx-4 border-t border-border/40" />
                  <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Wallet className="size-3.5" />
                      Balance
                    </span>
                    <span className="font-semibold tabular-nums text-success">
                      {formatMoney(user.walletBalance)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </article>

          <div className="grid w-full grid-cols-1 gap-2.5">
            <Link
              href="/app"
              className={cn(
                styles.glowBtnSuccess,
                "flex h-12 w-full items-center justify-center gap-2 text-sm",
              )}
            >
              <ShoppingBag className="size-4" />
              Shop now
            </Link>
            <Link
              href="/app/deposit"
              className={cn(
                styles.glowBtnOutline,
                "flex h-12 w-full items-center justify-center gap-2 text-sm",
              )}
            >
              <CheckCircle2 className="size-4" />
              Done
            </Link>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Returning to wallet in a moment…
          </p>
        </div>
      </main>
    );
  }

  if (danger) {
    return (
      <TerminalOutcome
        deposit={deposit}
        logoSrc={logoSrc}
        meta={meta}
        payLabel={payLabel}
      />
    );
  }

  return (
    <HubPageShell
      maxWidth="sm"
      className={cn(
        "py-3 sm:py-3",
        showStickyBar
          ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
          : "pb-8",
      )}
      contentClassName="relative mx-auto w-full max-w-md animate-in fade-in duration-300"
    >
      <HubHeaderBar
        icon={<Wallet />}
        title="Payment ticket"
        description={methodCopy.headerDescription}
        stats={[
          {
            label: "Pay",
            value: payLabel,
            tone: "success",
          },
          ...(open && !waitingAdmin
            ? [
                {
                  label: "Left",
                  value:
                    secs > 0
                      ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
                      : "0:00",
                  tone: "accent" as const,
                },
              ]
            : []),
        ]}
        statsLabel="Ticket summary"
      />

      <div className="mb-1 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-1.5 h-8 gap-1 rounded-full px-2 text-muted-foreground"
          asChild
        >
          <Link href="/app/deposit">
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
        </Button>
        <StatusPill
          open={open}
          danger={danger}
          waitingAdmin={waitingAdmin}
          status={deposit.status}
        />
      </div>

      <article className={styles.ticketCard}>
          {/* Top: method + amount + timer */}
          <header className="space-y-3 px-4 pb-1 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background p-1 ring-1 ring-primary/20 shadow-[0_0_12px_-4px_color-mix(in_oklab,var(--primary)_40%,transparent)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt={methodCopy.title}
                  className={cn(
                    "size-full max-h-7 max-w-7 rounded-md object-contain",
                    methodCopy.logoClassName,
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">
                  {methodCopy.title}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {methodCopy.subtitle}
                </p>
              </div>
              {open && !waitingAdmin ? (
                <CompactTimer seconds={secs} totalSeconds={totalSecs} />
              ) : null}
            </div>

            <div className="rounded-xl border border-success/25 bg-success/[0.07] px-3.5 py-3 ring-1 ring-success/15">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pay exactly
                  </p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-success shadow-[0_0_24px_-8px_color-mix(in_oklab,var(--success)_55%,transparent)]">
                    {payLabel}
                  </p>
                </div>
                <p className="shrink-0 pb-0.5 text-right text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="size-3" />
                    Wallet
                  </span>
                  <span className="mt-0.5 block font-bold tabular-nums text-foreground">
                    {formatMoney(deposit.amount)}
                  </span>
                </p>
              </div>
            </div>

            {waitingAdmin ? (
              <div className="rounded-xl bg-amber-500/10 px-3 py-2.5 ring-1 ring-amber-500/25">
                <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-200">
                  <ShieldCheck className="size-3.5 shrink-0" />
                  Screenshot received
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-200/75">
                  Admin will verify and credit your wallet.
                </p>
              </div>
            ) : null}
          </header>

          <TicketNotch />

          <div className="space-y-3 px-4 pb-4 pt-0.5">
            {deposit.secretCode ? (
              <div className="rounded-xl bg-primary/[0.06] px-3 py-2.5 ring-1 ring-primary/20">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Memo · required
                  </p>
                  <button
                    type="button"
                    onClick={() => copyAndToast("Memo", deposit.secretCode)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/18"
                  >
                    <Copy className="size-3" />
                    Copy
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => copyAndToast("Memo", deposit.secretCode)}
                  className="mt-1.5 w-full break-all text-left font-mono text-base font-semibold tracking-wide"
                >
                  {deposit.secretCode}
                </button>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  Paste this memo in the payment note.
                </p>
                {deposit.payId ? (
                  <button
                    type="button"
                    onClick={() => copyAndToast("Pay ID", deposit.payId)}
                    className="mt-2 flex w-full items-center justify-between border-t border-primary/15 pt-2 text-left text-xs"
                  >
                    <span className="text-muted-foreground">Pay ID</span>
                    <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
                      {deposit.payId}
                      <Copy className="size-3 text-muted-foreground" />
                    </span>
                  </button>
                ) : null}
              </div>
            ) : null}

            {deposit.qrImage ? (
              <div className="space-y-2 rounded-xl bg-muted/25 px-3 py-3 ring-1 ring-foreground/8">
                <div className="mx-auto flex size-40 items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-foreground/10 sm:size-44">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={deposit.qrImage}
                    alt="Payment QR"
                    width={160}
                    height={160}
                    className="size-full max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <p className="text-[11px] text-muted-foreground">
                    Scan with {methodCopy.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => void downloadQr()}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
                  >
                    <Download className="size-3" />
                    Save
                  </button>
                </div>
              </div>
            ) : null}

            {deposit.method === "BINANCE" && open ? (
              <form
                onSubmit={handleVerifyBinance}
                className="space-y-2.5 rounded-xl bg-muted/25 p-3 ring-1 ring-foreground/8"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/80">
                    Verify Binance Order ID
                  </p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    5 min window
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Paste your Binance <strong>Order ID</strong> or <strong>Transaction ID</strong> if you didn&apos;t include the memo or want instant confirmation.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={binanceOrderId}
                    onChange={(e) => setBinanceOrderId(e.target.value)}
                    placeholder="e.g. 458121815123795968"
                    className="h-10 flex-1 rounded-lg border border-border/60 bg-background/80 px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={verifyingBinance}
                    className={cn(
                      styles.glowBtn,
                      "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 px-3.5 text-xs font-medium",
                    )}
                  >
                    {verifyingBinance ? (
                      <Spinner className="relative z-10 size-3.5" />
                    ) : (
                      <CheckCircle2 className="relative z-10 size-3.5" />
                    )}
                    <span className="relative z-10">Verify</span>
                  </button>
                </div>
              </form>
            ) : null}

            {deposit.method === "QRIS" && open ? (
              <div className="space-y-2.5 rounded-xl bg-muted/25 p-3 ring-1 ring-foreground/8">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/80">
                      Auto-Polling & Instant Verify
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    Live Status Watch
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  After paying in your Indonesian e-wallet or banking app (GoPay, OVO, Dana, BCA, etc.), your wallet auto-credits within seconds. Or tap <strong>Verify Payment</strong> below for immediate check.
                </p>
                <button
                  type="button"
                  onClick={() => void handleVerifyQris()}
                  disabled={verifyingQris}
                  className={cn(
                    styles.glowBtn,
                    "inline-flex h-10 w-full items-center justify-center gap-2 text-xs font-medium",
                  )}
                >
                  {verifyingQris ? (
                    <Spinner className="relative z-10 size-3.5" />
                  ) : (
                    <CheckCircle2 className="relative z-10 size-3.5" />
                  )}
                  <span className="relative z-10">
                    {verifyingQris ? "Checking status…" : "Verify Payment"}
                  </span>
                </button>
              </div>
            ) : null}

            {deposit.instructions?.trim() ? (
              <div className="rounded-xl bg-muted/25 px-3 py-2.5 ring-1 ring-foreground/8">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Instructions
                </p>
                <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-foreground/90">
                  {deposit.instructions.trim()}
                </p>
              </div>
            ) : null}

            {isManualProof && open ? (
              <div className="space-y-2 rounded-xl border border-dashed border-border/40 bg-muted/25 p-3">
                {deposit.proofImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={deposit.proofImage}
                    alt="Proof"
                    className="mx-auto max-h-28 w-auto max-w-full rounded-lg object-contain ring-1 ring-foreground/10"
                  />
                ) : (
                  <p className="text-center text-[11px] text-muted-foreground">
                    After paying in eSewa, upload the success screenshot.
                  </p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void attachProofFile(file);
                  }}
                />
                <button
                  type="button"
                  className={cn(
                    waitingAdmin ? styles.glowBtnOutline : styles.glowBtn,
                    "flex h-11 w-full items-center justify-center gap-2 text-sm",
                  )}
                  disabled={acting === "proof"}
                  onClick={() => fileRef.current?.click()}
                >
                  {acting === "proof" ? (
                    <Spinner className="relative z-10 size-3.5" />
                  ) : (
                    <Upload className="relative z-10 size-3.5" />
                  )}
                  <span className="relative z-10">
                    {waitingAdmin ? "Replace screenshot" : "Upload screenshot"}
                  </span>
                </button>
              </div>
            ) : null}

            {open ? (
              <details className="group rounded-xl bg-muted/20 ring-1 ring-foreground/8">
                <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    How to pay
                    <span className="text-[10px] uppercase tracking-wider opacity-70 group-open:hidden">
                      Show
                    </span>
                    <span className="hidden text-[10px] uppercase tracking-wider opacity-70 group-open:inline">
                      Hide
                    </span>
                  </span>
                </summary>
                <ol className="space-y-0 border-t border-border/40 px-1 pb-1">
                  {howToSteps.map((step, i) => (
                    <li
                      key={step.title}
                      className={cn(
                        "flex gap-2.5 px-2.5 py-2 text-xs",
                        i > 0 && "border-t border-border/40",
                      )}
                    >
                      <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium">{step.title}</span>
                        <span className="mt-0.5 block leading-relaxed text-muted-foreground">
                          {step.text}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}

            {deposit.qrString && open && !deposit.paymentSessionId ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 w-full rounded-xl"
                onClick={() => copyAndToast("QR string", deposit.qrString)}
              >
                <Copy className="size-3.5" />
                Copy QR payload
              </Button>
            ) : null}

            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <button
                type="button"
                onClick={() => copyAndToast("Ticket", deposit.id)}
                className="truncate font-medium hover:text-foreground"
              >
                #{deposit.id.slice(-8).toUpperCase()}
              </button>
              {!isManualProof && open ? (
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-50" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                  </span>
                  Auto-checking
                </span>
              ) : deposit.providerDepositId ? (
                <button
                  type="button"
                  onClick={() =>
                    copyAndToast(meta.detailLabel, deposit.providerDepositId)
                  }
                  className="truncate hover:text-foreground"
                >
                  {meta.detailLabel}
                </button>
              ) : null}
            </div>

            {/* Desktop / tablet actions inside ticket */}
            {showStickyBar ? (
              <div className="hidden space-y-2 border-t border-border/40 pt-3 sm:block">
                {showCashfreePay ? (
                  <button
                    type="button"
                    className={cn(
                      styles.glowBtn,
                      "flex h-12 w-full items-center justify-center gap-2 text-sm",
                    )}
                    disabled={payingCashfree || Boolean(acting)}
                    onClick={() => void openCashfreeCheckout()}
                  >
                    {payingCashfree ? (
                      <Spinner className="relative z-10 size-4" />
                    ) : (
                      <CreditCard className="relative z-10 size-4" />
                    )}
                    <span className="relative z-10">
                      {payingCashfree ? "Opening…" : "Pay now"}
                    </span>
                  </button>
                ) : showPrimaryPay && deposit.paymentUrl ? (
                  <a
                    href={deposit.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      styles.glowBtn,
                      "flex h-12 w-full items-center justify-center gap-2 text-sm",
                    )}
                  >
                    <span className="relative z-10">{meta.primaryActionLabel}</span>
                    <ExternalLink className="relative z-10 size-4" />
                  </a>
                ) : null}

                {open ? (
                  <div
                    className={cn(
                      "grid gap-2",
                      !isManualProof && !deposit.hasProof
                        ? "grid-cols-2"
                        : "grid-cols-1",
                    )}
                  >
                    {!isManualProof ? (
                      <button
                        type="button"
                        className={cn(
                          styles.glowBtnSecondary,
                          "flex h-12 items-center justify-center gap-2 text-sm",
                        )}
                        disabled={Boolean(acting)}
                        onClick={() => void onRefreshClick()}
                      >
                        {refreshBusy ? (
                          <Spinner className="size-4" />
                        ) : (
                          <RefreshCcw className="size-4" />
                        )}
                        {refreshBusy ? "Checking…" : "Refresh status"}
                      </button>
                    ) : null}
                    {!deposit.hasProof ? (
                      <button
                        type="button"
                        className={cn(
                          styles.glowBtnOutline,
                          "flex h-12 items-center justify-center gap-2 text-sm",
                        )}
                        disabled={Boolean(acting)}
                        onClick={() => setCancelOpen(true)}
                      >
                        <X className="size-4" />
                        Cancel ticket
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>

      {/* Mobile bottom bar — solid, tappable, clear of support FAB */}
      {showStickyBar ? (
        <div
          className={cn(
            styles.stickyBar,
            "fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 sm:hidden",
          )}
        >
          <div className="mx-auto flex w-full max-w-md gap-2 pr-[4.25rem]">
            <>
              {showCashfreePay ? (
                <button
                  type="button"
                  className={cn(
                    styles.glowBtn,
                    "flex h-12 min-h-12 min-w-0 flex-[1.2] items-center justify-center gap-1.5 text-sm",
                  )}
                  disabled={payingCashfree || Boolean(acting)}
                  onClick={() => void openCashfreeCheckout()}
                >
                  {payingCashfree ? (
                    <Spinner className="relative z-10 size-4" />
                  ) : (
                    <CreditCard className="relative z-10 size-4" />
                  )}
                  <span className="relative z-10 truncate">
                    {payingCashfree ? "Opening…" : "Pay now"}
                  </span>
                </button>
              ) : showPrimaryPay && deposit.paymentUrl ? (
                <a
                  href={deposit.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    styles.glowBtn,
                    "flex h-12 min-h-12 min-w-0 flex-[1.2] items-center justify-center gap-1.5 text-sm",
                  )}
                >
                  <span className="relative z-10">Pay</span>
                  <ExternalLink className="relative z-10 size-4 shrink-0" />
                </a>
              ) : null}
              {open && !isManualProof ? (
                <button
                  type="button"
                  className={cn(
                    styles.glowBtnSecondary,
                    "flex h-12 min-h-12 flex-1 items-center justify-center gap-1.5 text-sm",
                  )}
                  disabled={Boolean(acting)}
                  onClick={() => void onRefreshClick()}
                >
                  {refreshBusy ? (
                    <Spinner className="size-4" />
                  ) : (
                    <RefreshCcw className="size-4" />
                  )}
                  <span>{refreshBusy ? "…" : "Refresh"}</span>
                </button>
              ) : null}
              {open && !deposit.hasProof ? (
                <button
                  type="button"
                  className={cn(
                    styles.glowBtnOutline,
                    "flex h-12 min-h-12 flex-1 items-center justify-center gap-1.5 text-sm",
                  )}
                  disabled={Boolean(acting)}
                  onClick={() => setCancelOpen(true)}
                >
                  <X className="size-4" />
                  Cancel
                </button>
              ) : null}
            </>
          </div>
        </div>
      ) : null}

      <Dialog
        open={cancelOpen}
        onOpenChange={(next) => {
          if (cancelBusy) return;
          setCancelOpen(next);
        }}
      >
        <DialogContent
          showCloseButton={!cancelBusy}
          className="flex max-h-[min(92dvh,520px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <DialogHeader className="shrink-0 gap-3 border-b border-border bg-muted/40 px-5 py-5 text-left">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-destructive/12 text-destructive ring-1 ring-destructive/20">
              <X className="size-5" aria-hidden />
            </div>
            <div className="space-y-1.5 pr-6">
              <DialogTitle className="text-lg">Cancel this ticket?</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                This stops the payment watch. You can start a new top-up anytime
                — nothing will be charged for this ticket.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="rounded-xl bg-muted/30 px-3.5 py-3 ring-1 ring-foreground/10">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background p-1.5 ring-1 ring-foreground/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoSrc}
                    alt=""
                    className={cn(
                      "size-full max-h-7 max-w-7 rounded-md object-contain",
                      methodCopy.logoClassName,
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{methodCopy.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {methodCopy.subtitle} · #{deposit.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <p className="shrink-0 text-right text-base font-semibold tabular-nums text-success">
                  {payLabel}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/40 pt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Wallet credit</p>
                  <p className="mt-0.5 font-medium tabular-nums">
                    {formatMoney(deposit.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Status</p>
                  <p className="mt-0.5 font-medium capitalize">
                    {deposit.status.toLowerCase()}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              If you already paid, wait for auto-credit instead of cancelling.
            </p>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/20 px-4 py-4 sm:flex-row sm:justify-stretch sm:px-5">
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full rounded-xl sm:flex-1"
              disabled={cancelBusy}
              onClick={() => setCancelOpen(false)}
            >
              Keep waiting
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11 w-full gap-2 rounded-xl sm:flex-1"
              disabled={cancelBusy}
              onClick={() => void confirmCancel()}
            >
              {cancelBusy ? (
                <Spinner className="size-4" />
              ) : (
                <X className="size-4" />
              )}
              {cancelBusy ? "Cancelling…" : "Yes, cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HubPageShell>
  );
}

