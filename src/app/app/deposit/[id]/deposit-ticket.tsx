"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Copy, ExternalLink, ImageUp, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { Panel, StatusBadge, formatDate } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";

export type TicketDeposit = {
  id: string;
  status: string;
  method: string;
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
  adminNote: string | null;
  failReason: string | null;
  createdAt: string;
  completedAt: string | null;
  label: string;
  hasProof: boolean;
};

const OPEN = ["PENDING", "PROCESSING"];

function useCountdown(expiresAt: string | null, active: boolean) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt || !active) return;
    const tick = () => setLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt, active]);
  if (left == null) return null;
  const s = Math.floor(left / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function copy(text: string) {
  navigator.clipboard?.writeText(text);
  toast.success("Copied");
}

export function DepositTicket({ initial }: { initial: TicketDeposit }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState<"verify" | "cancel" | "proof" | null>(null);
  const open = OPEN.includes(d.status);
  const timer = useCountdown(d.expiresAt, open && !d.hasProof);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/deposits/${initial.id}/status`, { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setD((prev) => {
      if (prev.status !== json.data.deposit.status && json.data.deposit.status === "COMPLETED") {
        toast.success("Payment received — wallet credited!");
        router.refresh();
      }
      return json.data.deposit;
    });
  }, [initial.id, router]);

  // Poll while the ticket is still open.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
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
      if (kind === "cancel") toast.success("Deposit cancelled.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(null);
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
      toast.success("Proof submitted — waiting for review.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  const needsProof = open && (d.method === "ESEWA" || d.method === "MANUAL") && !d.hasProof;
  const inReview = open && d.hasProof;
  const isBinance = d.method === "BINANCE";
  const payAmount = `${d.payableAmount || d.requestedAmount} ${d.payCurrency}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        {d.status === "COMPLETED" ? (
          <Banner icon={CheckCircle2} tone="success" title="Payment confirmed" text={`${formatMoney(d.amount)} was added to your wallet.`} />
        ) : d.status === "CANCELLED" || d.status === "EXPIRED" || d.status === "FAILED" ? (
          <Banner
            icon={XCircle}
            tone="destructive"
            title={d.status === "EXPIRED" ? "Ticket expired" : d.status === "CANCELLED" ? "Ticket cancelled" : "Payment failed"}
            text={d.adminNote || d.failReason || "Create a new deposit to try again."}
          />
        ) : inReview ? (
          <Banner icon={ShieldCheck} tone="warning" title="Proof received" text="An admin is reviewing your payment. This page updates automatically." />
        ) : (
          <Banner
            icon={Clock}
            tone="warning"
            title={`Waiting for payment${timer ? ` · ${timer} left` : ""}`}
            text="Complete the payment below. This page updates automatically."
          />
        )}

        {open ? (
          <Panel title={`Pay with ${d.label}`}>
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/60 p-4 text-center">
                <p className="text-xs text-muted-foreground">Exact amount to pay</p>
                <button onClick={() => copy(String(d.payableAmount || d.requestedAmount))} className="font-display text-3xl font-bold">
                  {payAmount}
                </button>
              </div>

              {d.qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.qrImage} alt="Payment QR" className="mx-auto size-56 rounded-xl border bg-white object-contain p-2" />
              ) : null}

              {d.payId ? <CopyRow label="Binance Pay ID" value={d.payId} /> : null}
              {d.secretCode ? <CopyRow label="Note / reference" value={d.secretCode} /> : null}

              {d.paymentUrl ? (
                <Button asChild className="w-full" size="lg">
                  <a href={d.paymentUrl} target="_blank" rel="noreferrer">
                    Open payment page <ExternalLink />
                  </a>
                </Button>
              ) : null}

              {d.instructions ? <p className="whitespace-pre-line text-sm text-muted-foreground">{d.instructions}</p> : null}

              {needsProof ? (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm hover:border-primary/50">
                  {busy === "proof" ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4 text-primary" />}
                  Upload payment screenshot
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && sendProof(e.target.files[0])}
                  />
                </label>
              ) : null}

              {isBinance ? (
                <div className="flex gap-2">
                  <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Binance order ID (optional)" />
                  <Button variant="secondary" disabled={busy !== null} onClick={() => call("verify", { orderId: orderId.trim() || undefined })}>
                    {busy === "verify" ? <Loader2 className="animate-spin" /> : null} Verify
                  </Button>
                </div>
              ) : !needsProof && !inReview ? (
                <Button variant="secondary" className="w-full" disabled={busy !== null} onClick={() => call("verify")}>
                  {busy === "verify" ? <Loader2 className="animate-spin" /> : null} I&apos;ve paid — check now
                </Button>
              ) : null}
            </div>
          </Panel>
        ) : null}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Panel title="Details">
          <dl className="space-y-2.5 text-sm">
            <Row k="Status" v={<StatusBadge status={d.status} />} />
            <Row k="Method" v={d.label} />
            <Row k="Wallet credit" v={formatMoney(d.amount)} />
            <Row k="Created" v={formatDate(d.createdAt, true)} />
            {d.completedAt ? <Row k="Completed" v={formatDate(d.completedAt, true)} /> : null}
          </dl>
          {open && !d.hasProof ? (
            <Button variant="destructive" size="sm" className="mt-4 w-full" disabled={busy !== null} onClick={() => call("cancel")}>
              {busy === "cancel" ? <Loader2 className="animate-spin" /> : null} Cancel ticket
            </Button>
          ) : null}
        </Panel>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <button onClick={() => copy(value)} className="flex w-full items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 text-left">
      <span>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-sm">{value}</span>
      </span>
      <Copy className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

const TONE = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
};

function Banner({ icon: Icon, tone, title, text }: { icon: typeof Clock; tone: keyof typeof TONE; title: string; text: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${TONE[tone]}`}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm opacity-90">{text}</p>
      </div>
    </div>
  );
}
