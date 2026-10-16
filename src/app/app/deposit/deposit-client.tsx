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
  ChevronLeft,
  ChevronRight,
  Copy,
  ImageUp,
  Landmark,
  Loader2,
  Lock,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { IconTile, SectionHeader, Surface, type Tone } from "@/components/app-kit";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { formatMoney } from "@/lib/currencies";
import { depositMethodLabel } from "@/lib/deposit-labels";
import { feedbackTap } from "@/lib/feedback";
import { cn } from "@/lib/utils";
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
  ESEWA: { hint: "Upload proof", icon: Banknote, tone: "violet", instant: false },
};

const STEPS = ["Method", "Amount", "Pay"] as const;
type Step = 0 | 1 | 2;

const tap = () => feedbackTap({ impact: "selection", silent: true });

export function DepositClient({ canDeposit, rates, currencies, mins, quick, gateways, manualMethods, deposits }: Props) {
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

  const [step, setStep] = useState<Step>(0);
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const choice = choices.find((c) => c.key === selected);
  const cur = currencies.find((c) => c.code === choice?.currency) ?? { code: choice?.currency ?? "USD", name: "", symbol: "" };
  const rate = rates[cur.code] || 1;
  const min = mins[cur.code] ?? mins.USD ?? 1;
  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= min - 1e-9;
  const usd = value > 0 ? value / rate : 0;
  const credit = Math.round(usd * 100_000_000);
  const money = (n: number) => `${cur.symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const quickList = quick[cur.code] ?? quick.USD ?? [];

  function go(next: Step) {
    tap();
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pick(c: Choice) {
    if (c.paused) return;
    if (c.key !== selected) {
      setSelected(c.key);
      setProof(null);
      // Amount is in the method's currency; a different currency makes it meaningless.
      if (c.currency !== choice?.currency) setAmount("");
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
        hint="Ask your seller or support to top up your balance."
      />
    );
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-5">
        <Stepper step={step} onJump={(s) => s < step && go(s)} />

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

        {step === 1 && choice ? (
          <div key="s1" className="anim-page-in space-y-4">
            <SelectedMethod c={choice} onChange={() => go(0)} />

            <Surface className="p-5 sm:p-6">
              <label htmlFor="dep-amount" className="block text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Enter amount · {cur.code}
              </label>
              <div className="mt-3 flex items-baseline justify-center gap-1">
                <span className="font-display text-3xl font-bold text-muted-foreground">{cur.symbol || cur.code}</span>
                <input
                  id="dep-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
                  onKeyDown={(e) => e.key === "Enter" && valid && go(2)}
                  placeholder="0"
                  style={{ width: `${Math.max(1, amount.length || 1) + 0.5}ch` }}
                  className="min-w-[2ch] max-w-full bg-transparent text-center font-display text-5xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/40"
                />
              </div>
              <p className={cn("mt-2 text-center text-xs", amount && !valid ? "font-semibold text-destructive" : "text-muted-foreground")}>
                Minimum {money(min)}
                {cur.code !== "USD" ? ` · 1 USD ≈ ${money(rate)}` : ""}
              </p>

              {quickList.length ? (
                <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {quickList.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        tap();
                        setAmount(String(q));
                      }}
                      className={cn(
                        "tap rounded-2xl border py-2.5 text-sm font-bold tabular-nums transition-colors",
                        value === q
                          ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
                          : "border-white/[0.06] bg-muted/50 hover:border-primary/40",
                      )}
                    >
                      {money(q)}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-success/10 px-4 py-3 ring-1 ring-inset ring-success/20">
                <span className="flex items-center gap-2 text-sm text-success">
                  <ArrowDownLeft className="size-4" /> Wallet gets
                </span>
                <span className="font-display text-xl font-bold tabular-nums text-success">{credit > 0 ? formatMoney(credit) : "—"}</span>
              </div>
            </Surface>

            <div className="flex gap-2.5">
              <BackButton onClick={() => go(0)} />
              <PrimaryButton disabled={!valid} onClick={() => go(2)}>
                Continue <ArrowRight className="size-4" />
              </PrimaryButton>
            </div>
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

            <div className="flex gap-2.5">
              <BackButton onClick={() => go(1)} />
              <PrimaryButton
                disabled={busy || uploading || Boolean(choice.paused) || !valid || (choice.kind === "manual" && !proof)}
                onClick={submit}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                {choice.kind === "manual" ? "Submit for review" : `Pay ${money(value)}`}
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </div>

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

function SelectedMethod({ c, onChange }: { c: Choice; onChange: () => void }) {
  return (
    <Surface className="flex items-center gap-3 p-3 pr-4">
      <IconTile icon={c.icon} tone={c.tone} className="size-10 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">Paying with</p>
        <p className="truncate text-sm font-semibold">{c.name}</p>
      </div>
      <button type="button" onClick={onChange} className="tap text-xs font-semibold text-primary">
        Change
      </button>
    </Surface>
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
            <button type="button" onClick={() => onEdit(1)} className="tap font-semibold tabular-nums underline decoration-dotted underline-offset-4">
              {pay}
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

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="tap grid size-13 shrink-0 place-items-center rounded-2xl border border-white/[0.06] bg-muted/60"
    >
      <ChevronLeft className="size-5" />
    </button>
  );
}

function PrimaryButton({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="tap bg-brand-gradient flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity disabled:opacity-45 disabled:shadow-none"
    >
      {children}
    </button>
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
