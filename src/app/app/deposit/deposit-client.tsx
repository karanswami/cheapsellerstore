"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowRight,
  Banknote,
  Bitcoin,
  Check,
  ChevronRight,
  Copy,
  ImageUp,
  Landmark,
  Loader2,
  Lock,
  Pencil,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { IconTile, SectionHeader, Surface, type Tone } from "@/components/app-kit";
import { BottomSheet } from "@/components/app-kit-client";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { formatMoney } from "@/lib/currencies";
import { depositMethodLabel } from "@/lib/deposit-labels";
import { feedbackTap } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import { AmountDisplay, Keypad, cleanAmount, decimalsFor, useAmountInput } from "./amount-pad";
import type { PublicGateway } from "@/lib/auto-gateways";
import type { PublicManualDepositMethod } from "@/types/manual-deposit";

export type DepositRow = {
  id: string;
  status: string;
  method: string;
  manualMethodKey: string | null;
  amount: number;
  payCurrency: string;
  requestedAmount: number;
  createdAt: string;
};

type Currency = { code: string; name: string; symbol: string };

type Props = {
  canDeposit: boolean;
  rates: Record<string, number>;
  currencies: Currency[];
  mins: Record<string, number>;
  quick: Record<string, number[]>;
  gateways: PublicGateway[];
  manualMethods: PublicManualDepositMethod[];
  deposits: DepositRow[];
  /** "Try again" links prefill the method + amount and open the amount step. */
  initial?: { method?: string; amount?: string };
};

type Choice = {
  key: string;
  kind: "auto" | "manual";
  name: string;
  currency: string;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
  instant: boolean;
  manual?: PublicManualDepositMethod;
  /** Set when the gateway is under maintenance: shown but not selectable. */
  paused?: string;
};

const AUTO: Record<PublicGateway["provider"], { hint: string; icon: LucideIcon; tone: Tone; instant: boolean }> = {
  UPI: { hint: "UPI apps", icon: Landmark, tone: "emerald", instant: true },
  QRIS: { hint: "Scan QRIS", icon: QrCode, tone: "sky", instant: true },
  BINANCE: { hint: "Binance Pay", icon: Bitcoin, tone: "amber", instant: true },
  NASIONALPAY: { hint: "QRIS / DANA", icon: QrCode, tone: "sky", instant: true },
  ESEWA: { hint: "Upload proof", icon: Banknote, tone: "violet", instant: false },
};

const STEPS = ["Method", "Amount", "Pay"] as const;
/** Pages are Method (0) and Review & pay (2); Amount (1) is the keypad sheet on top of them. */
type Step = 0 | 1 | 2;

const tap = () => feedbackTap({ impact: "selection", silent: true });

export function DepositClient({ canDeposit, rates, currencies, mins, quick, gateways, manualMethods, deposits, initial }: Props) {
  const router = useRouter();
  const choices = useMemo<Choice[]>(() => {
    const auto = gateways.map((g) => ({
      key: g.id,
      kind: "auto" as const,
      name: g.name,
      currency: g.currency,
      ...AUTO[g.provider],
      paused: g.maintenance ? g.note || "Under maintenance" : undefined,
    }));
    const manual = manualMethods.map((m) => ({
      key: `manual:${m.id}`,
      kind: "manual" as const,
      name: m.name,
      currency: m.currency,
      hint: "Admin verifies",
      icon: ImageUp,
      tone: "rose" as const,
      instant: false,
      manual: m,
    }));
    return [...auto, ...manual];
  }, [gateways, manualMethods]);

  // A retry link lands on Review with its method + amount; the only method there is opens the keypad.
  const start = useMemo(() => {
    const open = choices.filter((c) => !c.paused);
    const hit = open.find((c) => c.key === initial?.method) ?? (open.length === 1 && choices.length === 1 ? open[0] : undefined);
    if (!hit) return null;
    const amount = initial?.method === hit.key ? cleanAmount(initial?.amount ?? "", decimalsFor(hit.currency)) : "";
    const min = mins[hit.currency] ?? mins.USD ?? 1;
    return { key: hit.key, amount, review: Number(amount) > 0 && Number(amount) >= min - 1e-9 };
    // first render only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [step, setStep] = useState<Step>(start?.review ? 2 : 0);
  const [sheet, setSheet] = useState(Boolean(start && !start.review));
  const [selected, setSelected] = useState(start?.key ?? "");
  const [proof, setProof] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const choice = choices.find((c) => c.key === selected);
  const cur = currencies.find((c) => c.code === choice?.currency) ?? { code: choice?.currency ?? "USD", name: "", symbol: "" };
  const rate = rates[cur.code] || 1;
  const min = mins[cur.code] ?? mins.USD ?? 1;
  const decimals = decimalsFor(cur.code);
  const pad = useAmountInput({
    initial: start?.amount ?? "",
    decimals,
    active: sheet,
    onEnter: () => confirmAmount(),
  });
  const amount = pad.value;
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && value >= min - 1e-9;
  const tooLow = Boolean(amount) && !valid;
  const usd = value > 0 ? value / rate : 0;
  const credit = Math.round(usd * 100_000_000);
  const money = (n: number) => `${cur.symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const quickList = quick[cur.code] ?? quick.USD ?? [];

  function go(next: Step) {
    tap();
    if (next === 1) return setSheet(true);
    setSheet(false);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmAmount() {
    if (!valid) return pad.reject();
    go(2);
  }

  function pick(c: Choice) {
    if (c.paused) return;
    if (c.key !== selected) {
      setSelected(c.key);
      setProof(null);
      // Amount is in the method's currency; a different currency makes it meaningless.
      if (c.currency !== choice?.currency) pad.set("");
    }
    go(1);
  }

  async function uploadProof(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/support/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Upload failed.");
      setProof({ url: json.data.upload.url, name: file.name });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!choice || choice.paused) return;
    if (!valid) return toast.error(`Minimum deposit is ${money(min)}.`);
    if (choice.kind === "manual" && !proof) return toast.error("Upload your payment screenshot first.");
    feedbackTap({ impact: "medium" });
    setBusy(true);
    try {
      const body =
        choice.kind === "manual"
          ? { amount: value, manualMethodKey: choice.manual!.id, proofImage: proof!.url }
          : { amount: value, gatewayId: choice.key };
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not create deposit.");
      router.push(json.data.redirectPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create deposit.");
      setBusy(false);
    }
  }

  if (!canDeposit) {
    return (
      <EmptyState
        icon={Lock}
        title="Deposits are turned off for this account"
        hint="Your seller or support tops up your wallet. Want to deposit yourself? Ask admin for your own deposit access: money you deposit stays yours."
      >
        <Link href="/app/reports?new=general" className="tap inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Ask admin for deposit access
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-5">
        <Stepper step={sheet ? 1 : step} onJump={(s) => s < step && go(s)} />

        {step === 0 ? (
          <div key="s0" className="anim-page-in">
            <SectionHeader title="How do you want to pay?" />
            {choices.length === 0 ? (
              <Surface className="px-4 py-12 text-center text-sm text-muted-foreground">
                No payment methods are available right now.
              </Surface>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {choices.map((c, i) => (
                  <MethodCard key={c.key} c={c} active={selected === c.key} delay={i * 40} onPick={() => pick(c)} />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {step === 2 && choice ? (
          <div key="s2" className="anim-page-in space-y-4">
            <Receipt c={choice} pay={money(value)} credit={formatMoney(credit)} onEdit={go} />

            {choice.kind === "manual" ? (
              <ManualPay method={choice.manual!} pay={money(value)} proof={proof} uploading={uploading} onFile={uploadProof} />
            ) : (
              <Surface className="flex items-start gap-3 p-4 text-sm">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
                <p className="text-muted-foreground">
                  Next you&rsquo;ll get the payment details. Pay the exact amount and your wallet is credited{" "}
                  {choice.instant ? "automatically within seconds" : "once your proof is reviewed"}.
                </p>
              </Surface>
            )}

            <PayBar
              total={money(value)}
              credit={formatMoney(credit)}
              label={choice.kind === "manual" ? (proof ? "Submit" : "Upload proof first") : "Pay now"}
              busy={busy}
              disabled={busy || uploading || Boolean(choice.paused) || !valid || (choice.kind === "manual" && !proof)}
              onPay={submit}
            />
          </div>
        ) : null}
      </div>

      {choice ? (
        <BottomSheet
          open={sheet}
          onClose={() => setSheet(false)}
          title="Enter amount"
          subtitle={`${choice.name} · ${cur.code}`}
          icon={<IconTile icon={choice.icon} tone={choice.tone} className="size-10 rounded-xl" />}
        >
          <div className="rounded-3xl bg-muted/40 px-3 pb-3 pt-4 ring-1 ring-inset ring-white/[0.05]">
            <AmountDisplay value={amount} symbol={cur.symbol} code={cur.code} error={tooLow} shakeKey={pad.shake} />
            <div className="mt-1 flex items-center justify-between gap-2 px-1 text-xs">
              <span className={cn("transition-colors", tooLow ? "font-semibold text-destructive" : "text-muted-foreground")}>Min {money(min)}</span>
              <span className="flex items-center gap-1 font-semibold text-success">
                <ArrowDownLeft className="size-3.5" /> {credit > 0 ? formatMoney(credit) : "—"}
              </span>
            </div>
          </div>

          {quickList.length ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {quickList.slice(0, 8).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    tap();
                    pad.set(cleanAmount(String(q), decimals));
                  }}
                  className={cn(
                    "tap truncate rounded-xl px-1 py-2 text-[13px] font-bold tabular-nums ring-1 ring-inset transition-colors",
                    value === q ? "bg-primary/15 text-primary ring-primary/50" : "bg-muted/50 ring-white/[0.06]",
                  )}
                >
                  {money(q)}
                </button>
              ))}
            </div>
          ) : null}

          <Keypad decimals={decimals} onKey={pad.press} className="mt-3 lg:pointer-fine:hidden" />
          <p className="mt-4 hidden text-center text-xs text-muted-foreground lg:pointer-fine:block">
            Type the amount · <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to continue
          </p>

          <button
            type="button"
            disabled={!valid}
            onClick={confirmAmount}
            className="tap bg-brand-gradient mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity disabled:opacity-40 disabled:shadow-none"
          >
            {!amount ? (
              "Enter an amount"
            ) : tooLow ? (
              `Minimum ${money(min)}`
            ) : (
              <>
                Continue <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </BottomSheet>
      ) : null}

      <RecentDeposits deposits={deposits} manualMethods={manualMethods} />
    </div>
  );
}

function Stepper({ step, onJump }: { step: Step; onJump: (s: Step) => void }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Deposit steps">
      {STEPS.map((label, i) => {
        const done = i < step;
        const now = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <button
              type="button"
              disabled={!done}
              onClick={() => onJump(i as Step)}
              aria-current={now ? "step" : undefined}
              className="flex items-center gap-2 disabled:cursor-default"
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-all duration-300",
                  done && "bg-success text-white",
                  now && "bg-brand-gradient text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/15",
                  !done && !now && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("text-xs font-semibold", now ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </button>
            {i < STEPS.length - 1 ? (
              <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn("absolute inset-y-0 left-0 bg-success transition-[width] duration-500", done ? "w-full" : "w-0")}
                />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function MethodCard({ c, active, delay, onPick }: { c: Choice; active: boolean; delay: number; onPick: () => void }) {
  return (
    <button
      type="button"
      disabled={Boolean(c.paused)}
      onClick={onPick}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
      className={cn(
        "anim-fade-up tap group relative flex items-center gap-3.5 overflow-hidden rounded-3xl border bg-card/80 p-4 text-left transition-colors",
        active ? "border-primary/60 bg-primary/[0.07]" : "border-white/[0.06] hover:border-white/15",
        c.paused && "cursor-not-allowed opacity-55 hover:border-white/[0.06]",
      )}
    >
      <IconTile icon={c.icon} tone={c.tone} className="size-12" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{c.name}</span>
        {c.paused ? (
          <span className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-warning">
            <Wrench className="size-3 shrink-0" /> {c.paused}
          </span>
        ) : (
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-foreground/80">{c.currency}</span>
            {c.instant ? (
              <span className="flex items-center gap-0.5 font-semibold text-success">
                <Zap className="size-3 fill-current" /> Instant
              </span>
            ) : null}
            <span className="truncate">{c.hint}</span>
          </span>
        )}
      </span>
      {active ? (
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
}

/** Ticket-style review: perforated edge between the method and the totals. */
function Receipt({ c, pay, credit, onEdit }: { c: Choice; pay: string; credit: string; onEdit: (s: Step) => void }) {
  return (
    <Surface className="overflow-visible">
      <div className="flex items-center gap-3 p-5 pb-4">
        <IconTile icon={c.icon} tone={c.tone} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{c.name}</p>
          <p className="text-xs text-muted-foreground">
            {c.currency} · {c.instant ? "Instant credit" : c.hint}
          </p>
        </div>
        <button type="button" onClick={() => onEdit(0)} className="tap text-xs font-semibold text-primary">
          Change
        </button>
      </div>
      <div aria-hidden className="relative mx-5 border-t border-dashed border-white/10">
        <span className="absolute -left-8 -top-3 size-6 rounded-full bg-background" />
        <span className="absolute -right-8 -top-3 size-6 rounded-full bg-background" />
      </div>
      <dl className="space-y-3 p-5 pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">You pay</dt>
          <dd>
            <button
              type="button"
              onClick={() => onEdit(1)}
              className="tap inline-flex items-center gap-1.5 rounded-full bg-muted/70 py-1 pl-3 pr-2.5 font-semibold tabular-nums ring-1 ring-inset ring-white/[0.06]"
            >
              {pay} <Pencil className="size-3.5 text-primary" />
            </button>
          </dd>
        </div>
        <div className="flex items-end justify-between border-t border-white/[0.06] pt-3">
          <dt className="text-muted-foreground">Wallet credit</dt>
          <dd className="font-display text-3xl font-bold tabular-nums text-success">{credit}</dd>
        </div>
      </dl>
    </Surface>
  );
}

function ManualPay({
  method,
  pay,
  proof,
  uploading,
  onFile,
}: {
  method: PublicManualDepositMethod;
  pay: string;
  proof: { url: string; name: string } | null;
  uploading: boolean;
  onFile: (f: File) => void;
}) {
  return (
    <Surface className="space-y-4 p-5">
      <p className="font-display text-base font-bold">
        Send {pay} to {method.name}
      </p>
      {method.qrUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={method.qrUrl} alt="Payment QR" className="mx-auto size-52 rounded-2xl bg-white object-contain p-2 shadow-xl shadow-black/30" />
      ) : null}
      {method.accountNumber ? (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(method.accountNumber!);
            toast.success("Copied");
          }}
          className="tap flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-muted/50 px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[11px] text-muted-foreground">Account / ID</span>
            <span className="block truncate font-mono text-sm">{method.accountNumber}</span>
          </span>
          <Copy className="size-4 shrink-0 text-primary" />
        </button>
      ) : null}
      {method.instructions ? <p className="whitespace-pre-line text-sm text-muted-foreground">{method.instructions}</p> : null}
      <label
        className={cn(
          "tap flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-4 transition-colors",
          proof ? "border-success/40 bg-success/[0.06]" : "border-white/10 hover:border-primary/50",
        )}
      >
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", proof ? "bg-success/15 text-success" : "bg-primary/10 text-primary")}>
          {uploading ? <Loader2 className="size-5 animate-spin" /> : proof ? <Check className="size-5" /> : <ImageUp className="size-5" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{proof ? proof.name : "Upload payment screenshot"}</span>
          <span className="block text-xs text-muted-foreground">{proof ? "Tap to replace" : "PNG, JPG or WEBP"}</span>
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
    </Surface>
  );
}

/**
 * Pay action: floats above the tab dock on phones (thumb reach, always visible over long
 * manual-pay instructions), sits inline under the receipt on desktop.
 */
function PayBar({
  total,
  credit,
  label,
  busy,
  disabled,
  onPay,
}: {
  total: string;
  credit: string;
  label: string;
  busy: boolean;
  disabled: boolean;
  onPay: () => void;
}) {
  return (
    <>
      <div aria-hidden className="h-20 lg:hidden" />
      <div className="fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-[51] px-3 lg:static lg:px-0">
        <div className="mx-auto flex max-w-lg items-center gap-3 rounded-[1.4rem] border border-white/10 bg-card/95 p-2 pl-4 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.75)] backdrop-blur-xl lg:max-w-none lg:shadow-none">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold leading-tight tabular-nums">{total}</p>
            <p className="truncate text-[11px] text-success">Wallet gets {credit}</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onPay}
            className="tap bg-brand-gradient flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl px-5 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity disabled:opacity-45 disabled:shadow-none"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            {label}
          </button>
        </div>
      </div>
    </>
  );
}

function RecentDeposits({ deposits, manualMethods }: { deposits: DepositRow[]; manualMethods: PublicManualDepositMethod[] }) {
  return (
    <aside className="lg:sticky lg:top-6">
      <SectionHeader title="Recent deposits" icon={ReceiptText} />
      <Surface className="p-2">
        {deposits.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No deposits yet. Your first top-up shows here.</p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {deposits.map((d) => (
              <li key={d.id}>
                <Link href={`/app/deposit/${d.id}`} className="tap flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]">
                  <IconTile icon={ArrowDownLeft} tone={d.status === "COMPLETED" ? "emerald" : "violet"} className="size-10 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {depositMethodLabel(d.method, manualMethods.find((m) => m.id === d.manualMethodKey)?.name)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.requestedAmount.toLocaleString()} {d.payCurrency} · {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn("font-display text-sm font-bold tabular-nums", d.status === "COMPLETED" ? "text-success" : "text-foreground")}>
                      +{formatMoney(d.amount)}
                    </span>
                    <StatusBadge status={d.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </aside>
  );
}
