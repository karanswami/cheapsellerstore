"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Banknote, Bitcoin, ImageUp, Landmark, Loader2, Lock, QrCode, Wallet, Wrench } from "lucide-react";
import { EmptyState, Panel, StatusBadge, formatDate } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";
import { depositMethodLabel } from "@/lib/deposit-labels";
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
  icon: React.ComponentType<{ className?: string }>;
  manual?: PublicManualDepositMethod;
  /** Set when the gateway is under maintenance: shown but not selectable. */
  paused?: string;
};

const AUTO: Record<PublicGateway["provider"], { hint: string; icon: Choice["icon"] }> = {
  UPI: { hint: "Instant · UPI", icon: Landmark },
  QRIS: { hint: "Instant · QRIS", icon: QrCode },
  BINANCE: { hint: "Crypto · Binance Pay", icon: Bitcoin },
  ESEWA: { hint: "Upload payment proof", icon: Banknote },
};

export function DepositClient({ canDeposit, rates, currencies, mins, quick, gateways, manualMethods, deposits }: Props) {
  const router = useRouter();
  const choices = useMemo<Choice[]>(() => {
    const auto = gateways.map((g) => ({
      key: g.id,
      kind: "auto" as const,
      name: g.name,
      currency: g.currency,
      hint: AUTO[g.provider].hint,
      icon: AUTO[g.provider].icon,
      paused: g.maintenance ? g.note || "Under maintenance" : undefined,
    }));
    const manual = manualMethods.map((m) => ({
      key: `manual:${m.id}`,
      kind: "manual" as const,
      name: m.name,
      currency: m.currency,
      hint: "Pay manually · admin verifies",
      icon: ImageUp,
      manual: m,
    }));
    return [...auto, ...manual];
  }, [gateways, manualMethods]);

  const [selected, setSelected] = useState(choices.find((c) => !c.paused)?.key ?? "");
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
  const money = (n: number) => `${cur.symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const quickList = quick[cur.code] ?? quick.USD ?? [];

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
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Panel title="1 · Choose a payment method" icon={Wallet}>
          {choices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payment methods are available right now.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {choices.map((c) => (
                <button
                  key={c.key}
                  disabled={Boolean(c.paused)}
                  onClick={() => {
                    setSelected(c.key);
                    setProof(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary/50",
                    selected === c.key ? "border-primary bg-primary/10" : "bg-muted/40",
                    c.paused && "cursor-not-allowed opacity-60 hover:border-border",
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-background text-primary">
                    <c.icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    {c.paused ? (
                      <span className="flex items-center gap-1 truncate text-xs font-medium text-warning">
                        <Wrench className="size-3 shrink-0" /> {c.paused}
                      </span>
                    ) : (
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.currency} · {c.hint}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        {choice ? (
          <Panel title="2 · Enter amount" icon={Banknote}>
            <label className="text-xs text-muted-foreground" htmlFor="dep-amount">
              Amount in {cur.code}
              {cur.name ? ` (${cur.name})` : ""}
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                {cur.symbol}
              </span>
              <Input
                id="dep-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={String(min)}
                className="h-12 pl-9 text-lg font-semibold"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickList.map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className="rounded-full border bg-muted px-3.5 py-1.5 text-sm font-medium hover:border-primary/50"
                >
                  {money(q)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Minimum {money(min)} · 1 USD ≈ {money(rate)}
            </p>

            {choice.kind === "manual" ? (
              <div className="mt-5 space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="font-semibold">Pay to {choice.manual!.name}</p>
                {choice.manual!.accountNumber ? (
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(choice.manual!.accountNumber!);
                      toast.success("Copied");
                    }}
                    className="block w-full rounded-lg border bg-background px-3 py-2 text-left font-mono text-sm"
                    title="Tap to copy"
                  >
                    {choice.manual!.accountNumber}
                  </button>
                ) : null}
                {choice.manual!.qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={choice.manual!.qrUrl} alt="Payment QR" className="size-44 rounded-lg border bg-white object-contain p-1" />
                ) : null}
                {choice.manual!.instructions ? (
                  <p className="whitespace-pre-line text-muted-foreground">{choice.manual!.instructions}</p>
                ) : null}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed bg-background px-3 py-3 hover:border-primary/50">
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4 text-primary" />}
                  <span className="truncate text-sm">{proof ? proof.name : "Upload payment screenshot"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])}
                  />
                </label>
              </div>
            ) : null}
          </Panel>
        ) : null}

        <Panel title="Recent deposits">
          {deposits.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No deposits yet.</p>
          ) : (
            <ul className="divide-y">
              {deposits.map((d) => (
                <li key={d.id}>
                  <Link href={`/app/deposit/${d.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {depositMethodLabel(d.method, manualMethods.find((m) => m.id === d.manualMethodKey)?.name)}
                        <span className="ml-2 text-muted-foreground">
                          {d.requestedAmount.toLocaleString()} {d.payCurrency}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(d.createdAt, true)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold">{formatMoney(d.amount)}</span>
                      <StatusBadge status={d.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Panel title="Summary">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Method</dt>
              <dd className="font-medium">{choice?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">You pay</dt>
              <dd className="font-medium">{value > 0 ? money(value) : "—"}</dd>
            </div>
            <div className="flex items-end justify-between border-t pt-3">
              <dt className="text-muted-foreground">Wallet credit</dt>
              <dd className="font-display text-2xl font-bold text-success">
                {usd > 0 ? formatMoney(Math.round(usd * 100_000_000)) : "—"}
              </dd>
            </div>
          </dl>
          <Button onClick={submit} disabled={busy || !choice || Boolean(choice.paused) || !valid || uploading} className="mt-5 w-full" size="lg">
            {busy ? <Loader2 className="animate-spin" /> : null}
            {choice?.kind === "manual" ? "Submit for review" : "Continue to pay"}
            {!busy ? <ArrowRight /> : null}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Auto methods credit instantly after payment.</p>
        </Panel>
      </aside>
    </div>
  );
}
