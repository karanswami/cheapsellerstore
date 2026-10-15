"use client";

import {
  buildQuickAmounts,
  DEPOSIT_METHODS,
  formatAmountInput,
  formatCountdownLabel,
  formatPayAmount,
  getDepositMethodMeta,
  type DepositMethodId,
} from "@/components/app/deposit-method-meta";
import { ManualDepositDialog } from "@/components/app/manual-deposit-dialog";
import styles from "@/components/app/deposit-ui.module.css";
import {
  HubListRow,
  HubListStack,
  HubPanelCard,
  hubListRowStyles,
} from "@/components/app/hub/hub-list-row";
import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useSiteIcons } from "@/components/theme/site-icons-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gift,
  Lock,
  ShieldAlert,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import type {
  PublicManualDepositMethod,
} from "@/types/manual-deposit";
import {
  defaultManualCurrencyMeta,
  defaultManualDepositIconKey,
  resolveManualMethodLogoSrc,
} from "@/types/manual-deposit";

type DepositRow = {
  id: string;
  amount: number;
  method: string;
  manualMethodKey?: string | null;
  status: string;
  payCurrency?: string;
  payableAmount?: number;
  createdAt: string;
  expiresAt?: string | null;
  proofImage: string | null;
  adminAction?: string | null;
  adminNote?: string | null;
  failReason?: string | null;
};

type FxRates = Record<string, number>;

type QuickAmounts = Record<string, number[]>;

type CurrencyMins = Record<string, number>;

type MethodsEnabled = Record<DepositMethodId, { enabled: boolean }>;

type DepositViewProps = {
  initialBalance: number;
};

const DEFAULT_METHODS: MethodsEnabled = {
  QRIS: { enabled: true },
  BINANCE: { enabled: true },
  UPI: { enabled: true },
  ESEWA: { enabled: true },
  MGCLOUDPAY: { enabled: false },
};

const DEFAULT_RATES: FxRates = {
  USD: 1,
  INR: 92,
  IDR: 17000,
  NPR: 134,
};

const DEFAULT_MINS: CurrencyMins = {
  USD: 1,
  INR: 92,
  IDR: 17000,
  NPR: 134,
};

const DEFAULT_QUICK_AMOUNTS: QuickAmounts = {
  USD: [1, 5, 10, 25],
  INR: [100, 250, 500, 1000],
  IDR: [17000, 50000, 100000, 250000],
  NPR: [140, 500, 1000, 2000],
};

const MANUAL_CURRENCY_META: Record<
  string,
  { symbol: string; step: string }
> = {
  USD: { symbol: "$", step: "0.01" },
  INR: { symbol: "₹", step: "1" },
  IDR: { symbol: "Rp", step: "1" },
  NPR: { symbol: "रु", step: "1" },
};

type MethodSelection =
  | { kind: "auto"; method: DepositMethodId }
  | { kind: "manual"; id: string };

function normalizeDeposit(d: DepositRow): DepositRow {
  return {
    ...d,
    createdAt:
      typeof d.createdAt === "string"
        ? d.createdAt
        : new Date(d.createdAt).toISOString(),
    expiresAt: d.expiresAt
      ? typeof d.expiresAt === "string"
        ? d.expiresAt
        : new Date(d.expiresAt).toISOString()
      : null,
  };
}

function isOpen(d: DepositRow) {
  return d.status === "PENDING" || d.status === "PROCESSING";
}

function depositStatusPill(
  status: string,
  adminAction?: string | null,
  failReason?: string | null,
) {
  const s = status.toUpperCase();
  if (s === "COMPLETED") {
    return {
      className: styles.statusSuccess,
      label: "Paid",
      icon: CheckCircle2,
    };
  }
  if (
    s === "REJECTED" ||
    adminAction === "rejected" ||
    (s === "FAILED" &&
      Boolean(failReason) &&
      failReason !== "expired" &&
      failReason !== "cancelled_by_user")
  ) {
    return {
      className: styles.statusDanger,
      label: "Rejected",
      icon: ShieldAlert,
    };
  }
  if (s === "FAILED") {
    return {
      className: styles.statusDanger,
      label: "Failed",
      icon: XCircle,
    };
  }
  if (["CANCELLED", "EXPIRED"].includes(s)) {
    return {
      className: styles.statusMuted,
      label: s === "CANCELLED" ? "Cancelled" : "Expired",
      icon: XCircle,
    };
  }
  if (s === "PROCESSING") {
    return {
      className: styles.statusPending,
      label: "Processing",
      icon: Clock3,
    };
  }
  return {
    className: styles.statusPending,
    label: "Pending",
    icon: Clock3,
  };
}

export function DepositView({ initialBalance }: DepositViewProps) {
  const router = useRouter();
  const { user, pagesEnabled } = useAuth();
  const giftCodesEnabled = pagesEnabled.giftCodes;
  const { getIcon } = useSiteIcons();
  const [balance, setBalance] = useState(initialBalance);
  const [amount, setAmount] = useState("");
  const [manualMethods, setManualMethods] = useState<PublicManualDepositMethod[]>(
    [],
  );
  const [selection, setSelection] = useState<MethodSelection>({
    kind: "auto",
    method: "QRIS",
  });
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [depositsEnabled, setDepositsEnabled] = useState(
    () => user?.depositsEnabled !== false,
  );
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [rates, setRates] = useState<FxRates>(DEFAULT_RATES);
  const [quickAmountPresets, setQuickAmountPresets] =
    useState<QuickAmounts>(DEFAULT_QUICK_AMOUNTS);
  const [minDeposits, setMinDeposits] = useState<CurrencyMins>(DEFAULT_MINS);
  const [methods, setMethods] = useState<MethodsEnabled>(DEFAULT_METHODS);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (user && typeof user.depositsEnabled === "boolean") {
      setDepositsEnabled(user.depositsEnabled);
    }
  }, [user?.depositsEnabled]);

  const hasEsewaManual = manualMethods.some((m) => m.id === "esewa");

  const availableMethods = useMemo(
    () =>
      DEPOSIT_METHODS.filter((m) => {
        if (methods[m.value]?.enabled === false) return false;
        if (m.value === "ESEWA" && hasEsewaManual) return false;
        return m.auto;
      }),
    [methods, hasEsewaManual],
  );

  const selectedManual = useMemo(
    () =>
      selection.kind === "manual"
        ? manualMethods.find((m) => m.id === selection.id) ?? null
        : null,
    [manualMethods, selection],
  );

  const selectedAuto =
    selection.kind === "auto"
      ? availableMethods.find((m) => m.value === selection.method) ??
        availableMethods[0] ??
        null
      : null;

  const activeCurrency =
    selectedManual?.currency ?? selectedAuto?.currency ?? "USD";
  const activeCurrencyName =
    selectedManual?.currencyName?.trim() ||
    (selectedManual
      ? defaultManualCurrencyMeta(selectedManual.currency).currencyName
      : activeCurrency);
  const activeCurrencySymbol =
    selectedManual?.currencySymbol?.trim() ||
    (MANUAL_CURRENCY_META[activeCurrency] ?? MANUAL_CURRENCY_META.USD).symbol;
  const activeLabel = selectedManual?.name ?? selectedAuto?.label ?? "Deposit";
  const activeShortLabel = selectedManual
    ? `${activeCurrencyName} · admin review`
    : selectedAuto
      ? `${selectedAuto.shortLabel}${selectedAuto.auto ? " · auto credit" : " · admin review"}`
      : "";
  const isManualSelection = selection.kind === "manual";
  const currencyMeta = MANUAL_CURRENCY_META[activeCurrency] ?? {
    symbol: activeCurrencySymbol || activeCurrency,
    step: activeCurrency === "USD" ? "0.01" : "1",
  };
  const amountSymbol = isManualSelection
    ? activeCurrencySymbol
    : currencyMeta.symbol;

  const rate = rates[activeCurrency] || 1;
  const minLocal = minDeposits[activeCurrency] ?? minDeposits.USD ?? 1;

  const quickAmounts = useMemo(() => {
    const presets =
      quickAmountPresets[activeCurrency] ?? quickAmountPresets.USD ?? [];
    if (selectedAuto) {
      return buildQuickAmounts(minLocal, selectedAuto.currency, presets);
    }
    return buildQuickAmounts(minLocal, activeCurrency, presets);
  }, [
    activeCurrency,
    minLocal,
    quickAmountPresets,
    selectedAuto,
  ]);

  useEffect(() => {
    if (user) setBalance(user.walletBalance);
  }, [user?.walletBalance, user]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    setAmount(formatAmountInput(minLocal, activeCurrency));
  }, [selection, minLocal, activeCurrency]);

  useEffect(() => {
    if (selection.kind === "auto" && availableMethods.length > 0) {
      if (!availableMethods.some((m) => m.value === selection.method)) {
        setSelection({ kind: "auto", method: availableMethods[0].value });
      }
      return;
    }
    if (
      selection.kind === "manual" &&
      manualMethods.length > 0 &&
      !manualMethods.some((m) => m.id === selection.id)
    ) {
      setSelection({ kind: "manual", id: manualMethods[0].id });
      return;
    }
    if (
      availableMethods.length === 0 &&
      manualMethods.length > 0 &&
      selection.kind === "auto"
    ) {
      setSelection({ kind: "manual", id: manualMethods[0].id });
    }
  }, [availableMethods, manualMethods, selection]);

  const reloadList = useCallback(async () => {
    const res = await fetch("/api/deposits", { credentials: "include" });
    const json = (await res.json()) as {
      data?: {
        walletBalance: number;
        depositsEnabled?: boolean;
        deposits: DepositRow[];
        rates?: FxRates;
        minDeposits?: CurrencyMins;
        quickAmounts?: QuickAmounts;
        methods?: MethodsEnabled;
        manualMethods?: PublicManualDepositMethod[];
      };
    };
    if (res.ok && json.data) {
      setBalance(json.data.walletBalance);
      if (typeof json.data.depositsEnabled === "boolean") {
        setDepositsEnabled(json.data.depositsEnabled);
      }
      setDeposits(json.data.deposits.map(normalizeDeposit));
      if (json.data.rates) setRates(json.data.rates);
      if (json.data.minDeposits) setMinDeposits(json.data.minDeposits);
      if (json.data.quickAmounts) setQuickAmountPresets(json.data.quickAmounts);
      if (json.data.methods) setMethods(json.data.methods);
      if (json.data.manualMethods) setManualMethods(json.data.manualMethods);
    }
  }, []);

  useEffect(() => {
    void reloadList();
    const t = window.setInterval(() => {
      if (document.hidden) return;
      void reloadList();
    }, 5_000);
    return () => window.clearInterval(t);
  }, [reloadList]);

  const openDeposits = useMemo(
    () => deposits.filter((d) => isOpen(d)),
    [deposits],
  );

  const parsedAmount = Number(amount);
  const usdEstimate = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;
    return parsedAmount / rate;
  }, [parsedAmount, rate]);

  const belowMin =
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    parsedAmount + 1e-9 < minLocal;

  function selectAutoMethod(next: DepositMethodId) {
    setSelection({ kind: "auto", method: next });
  }

  function selectManualMethod(id: string) {
    setSelection({ kind: "manual", id });
  }

  function depositLabel(d: DepositRow) {
    if (d.method === "MANUAL" && d.manualMethodKey) {
      return (
        manualMethods.find((m) => m.id === d.manualMethodKey)?.name ??
        d.manualMethodKey
      );
    }
    return getDepositMethodMeta(d.method).label;
  }

  function depositRowLogo(d: DepositRow): string {
    if (d.method === "MANUAL" && d.manualMethodKey) {
      const manual = manualMethods.find((m) => m.id === d.manualMethodKey);
      if (manual) return resolveManualMethodLogoSrc(manual, getIcon);
      const pay = (d.payCurrency ?? "USD").toUpperCase();
      const key =
        pay === "INR" || pay === "IDR" || pay === "NPR" || pay === "USD"
          ? defaultManualDepositIconKey(pay)
          : "deposit-manual";
      return getIcon(key);
    }
    const m = getDepositMethodMeta(d.method);
    return getIcon(m.iconKey) || m.logoSrc;
  }

  async function submit() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error(`Enter a valid ${activeCurrencyName} amount`);
      return;
    }
    if (belowMin) {
      toast.error(
        `Minimum is ${formatPayAmount(
          minLocal,
          activeCurrency,
          isManualSelection ? amountSymbol : undefined,
        )}.`,
      );
      return;
    }

    if (isManualSelection) {
      setManualDialogOpen(true);
      return;
    }

    if (!selectedAuto) return;

    setPending(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: n, method: selectedAuto.value }),
      });
      const json = (await res.json()) as {
        error?: { message: string };
        data?: { redirectPath?: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Deposit failed");
        return;
      }
      toast.success("Opening payment…");
      const path = json.data?.redirectPath;
      if (path) {
        router.push(path);
        return;
      }
      setAmount(formatAmountInput(minLocal, activeCurrency));
      await reloadList();
    } finally {
      setPending(false);
    }
  }

  const hasAnyMethod = availableMethods.length > 0 || manualMethods.length > 0;

  return (
    <HubPageShell maxWidth="sm">
      <HubHeaderBar
        icon={<Wallet />}
        title="Deposit"
        description="Add funds · wallet credits in USD"
        stats={[
          {
            label: "Balance",
            value: formatMoney(balance),
            tone: "success",
          },
          {
            label: "Open",
            value: String(openDeposits.length),
            tone: openDeposits.length > 0 ? "accent" : "default",
          },
        ]}
        statsLabel="Wallet summary"
      />

      <div className={styles.walletHero}>
        <div className={styles.walletHeroGlow} aria-hidden />
        <div className="relative flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Available balance
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-success">
              {formatMoney(balance)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Instant key delivery after top-up
            </p>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-success/12 text-success ring-1 ring-success/25 shadow-[0_0_20px_-4px_color-mix(in_oklab,var(--success)_45%,transparent)]">
            <Wallet className="size-7" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      {giftCodesEnabled ? (
        <Link
          href="/app/gift-codes"
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-primary/25 bg-card/70 px-3.5 py-3",
            "shadow-[var(--glow-soft)] transition-colors hover:border-primary/40 hover:bg-card/90",
            "supports-backdrop-filter:backdrop-blur-sm",
          )}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Gift className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Gift code</span>
            <span className="text-xs text-muted-foreground">
              Redeem a USD code · credits Binance USD wallet
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-primary" />
        </Link>
      ) : null}

      {openDeposits.length > 0 ? (
        <section className="space-y-2">
          <h2 className="px-0.5 text-sm font-semibold">Open tickets</h2>
          <HubListStack>
            {openDeposits.slice(0, 3).map((d) => {
              const left = formatCountdownLabel(d.expiresAt, now);
              const m = getDepositMethodMeta(d.method);
              return (
                <HubListRow key={d.id} interactive stripe={false}>
                  <Link
                    href={`/app/deposit/${d.id}`}
                    className={cn(
                      hubListRowStyles.innerRow,
                      "ring-1 ring-primary/20 hover:ring-primary/40",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={depositRowLogo(d)}
                      alt=""
                      className={cn(
                        "size-8 rounded-lg object-contain ring-1 ring-foreground/10",
                        d.method !== "MANUAL" && m.logoClassName,
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{depositLabel(d)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatMoney(d.amount)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary shadow-[0_0_12px_-4px_color-mix(in_oklab,var(--primary)_50%,transparent)]">
                      {left && left !== "Expired" ? left : "Resume"}
                    </span>
                  </Link>
                </HubListRow>
              );
            })}
          </HubListStack>
        </section>
      ) : null}

      {!depositsEnabled ? (
        <EmptyState
          icon={<Lock />}
          title="Deposits disabled"
          description={
            user?.role === "RESELLER"
              ? "This reseller account tops up only through your seller. Ask them to add balance to your wallet."
              : "Self-serve top-ups are turned off on this account. Contact support if you need funds."
          }
        />
      ) : (
      <HubPanelCard>
        <div className={styles.panel}>
          <div className={cn(styles.panelHeader, "space-y-1 px-4 py-3.5 sm:px-5")}>
            <h2 className="text-base font-semibold tracking-tight">Add funds</h2>
            <p className="text-sm text-muted-foreground">{activeShortLabel}</p>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            {!hasAnyMethod ? (
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                No deposit methods are available right now. Please try again later.
              </p>
            ) : (
              <div className="space-y-3">
                {availableMethods.length > 0 ? (
                  <div
                    className={cn(
                      "grid gap-2",
                      availableMethods.length === 1 && "grid-cols-1",
                      availableMethods.length === 2 && "grid-cols-2",
                      availableMethods.length === 3 && "grid-cols-3",
                      availableMethods.length >= 4 && "grid-cols-4",
                    )}
                    role="radiogroup"
                    aria-label="Auto payment methods"
                  >
                    {availableMethods.map((m) => {
                      const active =
                        selection.kind === "auto" && selection.method === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={pending}
                          onClick={() => selectAutoMethod(m.value)}
                          className={cn(
                            styles.methodChip,
                            active && styles.methodChipActive,
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getIcon(m.iconKey) || m.logoSrc}
                            alt={m.logoAlt}
                            className={cn(
                              "size-10 rounded-xl object-contain sm:size-11",
                              m.logoClassName,
                            )}
                          />
                          <span className="text-[10px] font-bold leading-none text-foreground">
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {manualMethods.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Manual · admin review
                    </p>
                    <div
                      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                      role="radiogroup"
                      aria-label="Manual payment methods"
                    >
                      {manualMethods.map((m) => {
                        const active =
                          selection.kind === "manual" && selection.id === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={pending}
                            onClick={() => selectManualMethod(m.id)}
                            className={cn(
                              styles.methodChip,
                              active && styles.methodChipActive,
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveManualMethodLogoSrc(m, getIcon)}
                              alt={m.name}
                              className="size-10 rounded-xl object-contain sm:size-11"
                            />
                            <span className="line-clamp-2 text-center text-[10px] font-bold leading-tight text-foreground">
                              {m.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="dep-amount"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Amount ({activeCurrencyName})
                </label>
                {usdEstimate != null && usdEstimate > 0 ? (
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      belowMin ? "text-destructive" : "text-success",
                    )}
                  >
                    ≈ {formatMoney(usdToMicrocents(usdEstimate))}
                  </span>
                ) : null}
              </div>

              <div
                className="flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] px-3.5 py-2.5 ring-1 ring-primary/10"
                role="status"
              >
                <span className="text-[11px] font-medium text-muted-foreground">
                  Minimum deposit
                </span>
                <span className="text-xs font-bold tabular-nums text-foreground">
                  {formatPayAmount(
                    minLocal,
                    activeCurrency,
                    isManualSelection ? amountSymbol : undefined,
                  )}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · ≈{" "}
                    {formatMoney(
                      usdToMicrocents(minLocal / (rate > 0 ? rate : 1)),
                    )}{" "}
                    credit
                  </span>
                </span>
              </div>

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-base font-semibold text-primary">
                  {amountSymbol}
                </span>
                <Input
                  id="dep-amount"
                  type="number"
                  min={minLocal}
                  step={selectedAuto?.step ?? currencyMeta.step}
                  placeholder={formatAmountInput(minLocal, activeCurrency)}
                  value={amount}
                  disabled={pending}
                  className="h-12 border-primary/25 bg-background/80 pl-9 text-lg font-semibold tabular-nums shadow-[inset_0_1px_0_color-mix(in_oklab,#fff_6%,transparent)]"
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((q) => {
                  const active =
                    Number(amount) === q ||
                    amount === formatAmountInput(q, activeCurrency);
                  const isMin = Math.abs(q - minLocal) < 0.001;
                  return (
                    <button
                      key={q}
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        setAmount(formatAmountInput(q, activeCurrency))
                      }
                      className={cn(
                        styles.amountChip,
                        active && styles.amountChipActive,
                      )}
                    >
                      <span className="block text-xs font-bold leading-none tabular-nums">
                        {formatPayAmount(
                          q,
                          activeCurrency,
                          isManualSelection ? amountSymbol : undefined,
                        )}
                      </span>
                      {isMin ? (
                        <span
                          className={cn(
                            "mt-1 block text-[9px] font-bold uppercase tracking-wide",
                            active ? "text-primary-foreground/80" : "text-primary",
                          )}
                        >
                          Min
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {belowMin ? (
                <p className="text-xs font-medium text-destructive">
                  Enter at least{" "}
                  {formatPayAmount(
                    minLocal,
                    activeCurrency,
                    isManualSelection ? amountSymbol : undefined,
                  )}
                  .
                </p>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {isManualSelection
                    ? "Upload payment proof in the next step. Admin verifies before credit."
                    : `${selectedAuto?.hint ?? "Pay the exact amount shown."} Expires in ~${selectedAuto?.expiryMinutes ?? 15} min.`}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 bg-muted/20 px-4 py-4 sm:px-5">
            <button
              type="button"
              className={cn(
                styles.glowBtn,
                "flex h-12 w-full items-center justify-center gap-2 text-sm",
              )}
              disabled={pending || belowMin || !hasAnyMethod}
              onClick={() => void submit()}
            >
              {pending ? (
                <>
                  <Spinner className="relative z-10 size-4" />
                  <span className="relative z-10">Starting {activeLabel}…</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">
                    {isManualSelection
                      ? `Continue with ${activeLabel}`
                      : `Continue with ${activeLabel}`}
                  </span>
                  <ArrowRight className="relative z-10 size-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </HubPanelCard>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-sm font-semibold">Recent</h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {deposits.length}
          </span>
        </div>

        {deposits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary/35 bg-card/40 px-4 py-7 text-center text-sm text-muted-foreground">
            No deposits yet
          </p>
        ) : (
          <HubListStack>
            {deposits.map((d) => {
              const left = isOpen(d)
                ? formatCountdownLabel(d.expiresAt, now)
                : null;
              const isRejected =
                d.status === "REJECTED" ||
                d.adminAction === "rejected" ||
                (d.status === "FAILED" &&
                  Boolean(d.failReason) &&
                  d.failReason !== "expired" &&
                  d.failReason !== "cancelled_by_user");
              const m = getDepositMethodMeta(d.method);
              const pill = depositStatusPill(d.status, d.adminAction, d.failReason);
              const PillIcon = pill.icon;
              return (
                <HubListRow key={d.id} interactive stripe={false}>
                  <Link
                    href={`/app/deposit/${d.id}`}
                    className={hubListRowStyles.innerRow}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={depositRowLogo(d)}
                      alt=""
                      className={cn(
                        "size-8 shrink-0 rounded-lg object-contain ring-1 ring-foreground/10",
                        d.method !== "MANUAL" && m.logoClassName,
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold tabular-nums">
                          {formatMoney(d.amount)}
                        </span>
                        <span
                          className={cn(styles.statusPill, pill.className)}
                        >
                          <PillIcon className="size-3" aria-hidden />
                          {pill.label}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {depositLabel(d)}
                        {typeof d.payableAmount === "number"
                          ? ` · ${formatPayAmount(d.payableAmount, d.payCurrency || "USD")}`
                          : ""}
                        {left && left !== "Expired" ? ` · ${left}` : ""}
                        {isRejected && (d.adminNote || d.failReason)
                          ? ` · ${d.adminNote || d.failReason}`
                          : ""}
                      </p>
                    </div>
                  </Link>
                </HubListRow>
              );
            })}
          </HubListStack>
        )}
      </section>

      <ManualDepositDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        method={selectedManual}
        amount={parsedAmount}
        usdEstimate={usdEstimate}
        onSubmitted={() => {
          setAmount(formatAmountInput(minLocal, activeCurrency));
          void reloadList();
        }}
      />
    </HubPageShell>
  );
}
