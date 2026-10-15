"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/currencies";
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Copy,
  Crown,
  ExternalLink,
  Flag,
  KeyRound,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ReportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type ReportKind = "KEY" | "DEPOSIT";

type Report = {
  id: string;
  kind: ReportKind;
  status: ReportStatus;
  subject: string;
  explanation: string;
  screenshotUrl: string | null;
  depositId: string | null;
  orderId: string | null;
  keyId: string | null;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    username: string;
    isPremium?: boolean;
  };
  deposit?: {
    id: string;
    amount: number;
    payCurrency: string;
    requestedAmount: number;
    payableAmount: number;
    status: string;
    method: string;
    manualMethodKey?: string | null;
    failReason?: string | null;
    proofImage?: string | null;
    createdAt: string;
  } | null;
  keyDetails?: {
    keyId: string;
    code: string;
    maskedCode?: string;
    productTitle: string;
    durationLabel: string;
    orderId: string | null;
    purchasedAt: string | null;
  } | null;
};

type StatusFilter = "open" | ReportStatus | "ALL";
type KindFilter = ReportKind | "ALL";

const STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopySnippet({
  text,
  label,
  valueToCopy,
}: {
  text: string;
  label?: string;
  valueToCopy?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(valueToCopy ?? text);
      setCopied(true);
      toast.success(label ? `${label} copied` : "Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground ring-1 ring-border/50 transition-colors hover:bg-muted"
      title={`Click to copy ${label || ""}`}
    >
      <span className="truncate max-w-[260px]">{text}</span>
      {copied ? (
        <Check className="size-3 text-success shrink-0" />
      ) : (
        <Copy className="size-3 text-muted-foreground group-hover:text-foreground shrink-0" />
      )}
    </button>
  );
}

export function ReportsWorkspace() {
  const [status, setStatus] = useState<StatusFilter>("open");
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [selected, setSelected] = useState<Report | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  const url = useMemo(() => {
    const params = new URLSearchParams({
      status,
      kind,
      limit: "40",
    });
    return `/api/admin/issue-reports?${params.toString()}`;
  }, [status, kind]);

  const { data, loading, reload } = useAdminFetch<{
    reports: Report[];
    total: number;
    hasMore: boolean;
  }>(url);

  const reports = data?.reports ?? [];

  function openDetail(r: Report) {
    setSelected(r);
    setNote(r.adminNote ?? "");
  }

  async function setStatusAction(next: ReportStatus) {
    if (!selected) return;
    setPending(true);
    const result = await adminMutate(`/api/admin/issue-reports/${selected.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next, note: note.trim() || null }),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Marked ${STATUS_LABEL[next].toLowerCase()}`);
    setSelected(null);
    void reload();
  }

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Reports"
        description="Customer key and deposit issue tickets"
      />

      <FilterChipRow role="tablist" aria-label="Status filters">
        {(
          [
            { value: "open" as const, label: "Open queue" },
            { value: "OPEN" as const, label: "Open" },
            { value: "IN_PROGRESS" as const, label: "In progress" },
            { value: "RESOLVED" as const, label: "Resolved" },
            { value: "CLOSED" as const, label: "Closed" },
            { value: "ALL" as const, label: "All" },
          ] as const
        ).map((f) => (
          <FilterChip
            key={f.value}
            active={status === f.value}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </FilterChip>
        ))}
      </FilterChipRow>

      <FilterChipRow role="tablist" aria-label="Kind filters">
        {(
          [
            { value: "ALL" as const, label: "All kinds" },
            { value: "DEPOSIT" as const, label: "Deposit" },
            { value: "KEY" as const, label: "Key" },
          ] as const
        ).map((f) => (
          <FilterChip
            key={f.value}
            active={kind === f.value}
            onClick={() => setKind(f.value)}
          >
            {f.label}
          </FilterChip>
        ))}
      </FilterChipRow>

      {loading ? (
        <AdminListSkeleton />
      ) : reports.length === 0 ? (
        <AdminEmptyState message="No reports in this filter." />
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full space-y-1.5 rounded-xl bg-card px-3.5 py-3 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/30"
                onClick={() => openDetail(r)}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="gap-1">
                    {r.kind === "DEPOSIT" ? (
                      <Wallet className="size-3" />
                    ) : (
                      <KeyRound className="size-3" />
                    )}
                    {r.kind === "DEPOSIT" ? "Deposit" : "Key"}
                  </Badge>
                  <Badge
                    variant={
                      r.status === "OPEN"
                        ? "destructive"
                        : r.status === "IN_PROGRESS"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {STATUS_LABEL[r.status]}
                  </Badge>
                  {r.user?.isPremium ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-500/40 bg-amber-500/10 text-[10px] font-semibold text-amber-300 shadow-xs"
                    >
                      <Crown className="size-3 text-amber-400" />
                      VIP Priority
                    </Badge>
                  ) : null}
                  {r.deposit ? (
                    <span className="text-xs font-semibold tabular-nums text-success">
                      {formatMoney(r.deposit.amount)}
                      {r.deposit.payCurrency && r.deposit.payCurrency !== "USD" && r.deposit.requestedAmount > 0
                        ? ` (${r.deposit.requestedAmount} ${r.deposit.payCurrency})`
                        : ""}
                    </span>
                  ) : null}
                  {r.keyDetails ? (
                    <span className="text-xs font-medium text-primary/90">
                      {r.keyDetails.productTitle} · {r.keyDetails.durationLabel}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-sm font-semibold">{r.subject}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {r.explanation}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[10px] text-muted-foreground">
                  <span>
                    {r.user
                      ? `${r.user.name || r.user.username} (@${r.user.username})`
                      : "User"}{" "}
                    · {formatWhen(r.createdAt)}
                  </span>
                  {r.adminNote ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                      Replied
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <DialogShell
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        icon={<Flag className="size-5" />}
        title={selected?.subject ?? "Report"}
        description={
          selected
            ? `${selected.kind} · ${STATUS_LABEL[selected.status]} · Reported: ${formatWhen(selected.createdAt)}`
            : undefined
        }
        size="lg"
        footer={
          selected ? (
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Close
              </Button>
              {selected.status === "OPEN" ? (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => void setStatusAction("IN_PROGRESS")}
                >
                  In progress
                </Button>
              ) : null}
              {selected.status === "OPEN" ||
              selected.status === "IN_PROGRESS" ? (
                <>
                  <Button
                    disabled={pending}
                    onClick={() => void setStatusAction("RESOLVED")}
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => void setStatusAction("CLOSED")}
                  >
                    Close ticket
                  </Button>
                </>
              ) : null}
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            {/* Customer identity bar */}
            {selected.user ? (
              <div className="rounded-xl bg-muted/40 p-3 ring-1 ring-border/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Customer Account
                  </p>
                  {selected.user.isPremium ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-500/40 bg-amber-500/10 text-[10px] font-semibold text-amber-300"
                    >
                      <Crown className="size-3 text-amber-400" />
                      VIP Priority Member
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <p className="text-sm font-semibold">
                    {selected.user.name || selected.user.username}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    @{selected.user.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({selected.user.email})
                  </span>
                </div>
              </div>
            ) : null}

            {/* KEY details card */}
            {selected.kind === "KEY" && selected.keyDetails ? (
              <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3.5 ring-1 ring-primary/20">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <KeyRound className="size-4" />
                  <span>Reported License Key Details</span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Product & Plan:</span>
                    <p className="font-semibold text-foreground">
                      {selected.keyDetails.productTitle} — {selected.keyDetails.durationLabel}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Purchased Date:</span>
                    <p className="font-medium text-foreground">
                      {formatWhen(selected.keyDetails.purchasedAt)}
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-xs text-muted-foreground">Exact License Key:</span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 rounded-lg bg-background/80 px-3 py-2 font-mono text-sm font-bold tracking-wide text-primary ring-1 ring-primary/30 select-all">
                      {selected.keyDetails.code || "N/A"}
                    </div>
                    {selected.keyDetails.code ? (
                      <CopySnippet
                        text="Copy Key"
                        label="License key"
                        valueToCopy={selected.keyDetails.code}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-muted-foreground">
                  {selected.keyDetails.orderId ? (
                    <div className="flex items-center gap-1">
                      <span>Order ID:</span>
                      <CopySnippet
                        text={selected.keyDetails.orderId}
                        label="Order ID"
                      />
                    </div>
                  ) : null}
                  {selected.keyDetails.keyId ? (
                    <div className="flex items-center gap-1">
                      <span>Key ID:</span>
                      <CopySnippet
                        text={selected.keyDetails.keyId}
                        label="Key ID"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* DEPOSIT details card */}
            {selected.deposit ? (
              <div className="space-y-2 rounded-xl border border-success/30 bg-success/5 p-3.5 ring-1 ring-success/20">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                    <Wallet className="size-4" />
                    <span>Reported Deposit Details</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {selected.deposit.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className="font-bold text-success text-sm">
                      {formatMoney(selected.deposit.amount)} USD
                      {selected.deposit.payCurrency && selected.deposit.payCurrency !== "USD" && selected.deposit.requestedAmount > 0
                        ? ` (~${selected.deposit.requestedAmount} ${selected.deposit.payCurrency})`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Method / Rail:</span>
                    <p className="font-medium text-foreground">
                      {selected.deposit.method}
                      {selected.deposit.manualMethodKey ? ` (${selected.deposit.manualMethodKey})` : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deposit Date & Time:</span>
                    <p className="font-medium text-foreground">
                      {formatWhen(selected.deposit.createdAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deposit ID:</span>
                    <div className="mt-0.5">
                      <CopySnippet
                        text={selected.deposit.id}
                        label="Deposit ID"
                      />
                    </div>
                  </div>
                </div>

                {selected.deposit.failReason ? (
                  <div className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    <span>Fail reason: {selected.deposit.failReason}</span>
                  </div>
                ) : null}

                {selected.deposit.proofImage && selected.deposit.proofImage !== selected.screenshotUrl ? (
                  <div className="pt-1">
                    <span className="text-[11px] text-muted-foreground">Original Deposit Proof:</span>
                    <a
                      href={selected.deposit.proofImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" /> View Deposit Receipt
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Explanation card */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Customer Explanation
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Reported: {formatWhen(selected.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap rounded-xl bg-muted/30 p-3 text-sm leading-relaxed ring-1 ring-border/40">
                {selected.explanation}
              </p>
            </div>

            {/* Attached Screenshot */}
            {selected.screenshotUrl ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Attached Screenshot
                  </p>
                  <a
                    href={selected.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    Open Full Image <ExternalLink className="size-3" />
                  </a>
                </div>
                <a
                  href={selected.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-xl ring-1 ring-border/50 transition-opacity hover:opacity-90"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.screenshotUrl}
                    alt="Report screenshot"
                    className="max-h-72 w-full object-contain bg-muted/20"
                  />
                </a>
              </div>
            ) : null}

            {/* Admin Note Input */}
            <div className="space-y-1.5">
              <Label htmlFor="admin-note">Admin reply / resolution note</Label>
              <Textarea
                id="admin-note"
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Visible to the customer on their report…"
              />
            </div>
          </div>
        ) : null}
      </DialogShell>
    </main>
  );
}

