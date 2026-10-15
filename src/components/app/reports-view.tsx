"use client";

import {
  HubEmptyPanel,
  HubListRow,
  HubListStack,
} from "@/components/app/hub/hub-list-row";
import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  Flag,
  KeyRound,
  LoaderCircle,
  Plus,
  Wallet,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type ReportKind = "KEY" | "DEPOSIT";
type ReportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type ReportListItem = {
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
  reviewedAt: string | null;
  createdAt: string;
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

type EligibleDeposit = {
  id: string;
  amount: number;
  status: string;
  method: string;
  failReason: string | null;
  createdAt: string;
};

type EligibleKey = {
  keyId: string;
  orderId: string;
  orderItemId: string;
  productTitle: string;
  durationLabel: string;
  maskedCode: string;
  createdAt: string;
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function statusVariant(
  status: ReportStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "OPEN") return "destructive";
  if (status === "IN_PROGRESS") return "default";
  if (status === "RESOLVED") return "secondary";
  return "outline";
}

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

export function ReportsView({
  initialReports,
  initialHasMore,
  pageSize = 15,
}: {
  initialReports: ReportListItem[];
  initialHasMore: boolean;
  pageSize?: number;
}) {

  const [reports, setReports] = useState(initialReports);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<ReportListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [kind, setKind] = useState<ReportKind>("DEPOSIT");
  const [explanation, setExplanation] = useState("");
  const [depositId, setDepositId] = useState("");
  const [keyId, setKeyId] = useState("");
  const [deposits, setDeposits] = useState<EligibleDeposit[]>([]);
  const [keys, setKeys] = useState<EligibleKey[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetCreate = useCallback(() => {
    setKind("DEPOSIT");
    setExplanation("");
    setDepositId("");
    setKeyId("");
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    let cancelled = false;

    if (kind === "DEPOSIT") {
      setLoadingDeposits(true);
      void (async () => {
        try {
          const res = await fetch("/api/reports?eligibleDeposits=1", {
            credentials: "include",
          });
          const json = (await res.json()) as {
            data?: { deposits: EligibleDeposit[] };
          };
          if (!cancelled) setDeposits(json.data?.deposits ?? []);
        } finally {
          if (!cancelled) setLoadingDeposits(false);
        }
      })();
    } else {
      setLoadingKeys(true);
      void (async () => {
        try {
          const res = await fetch("/api/reports?eligibleKeys=1", {
            credentials: "include",
          });
          const json = (await res.json()) as {
            data?: { keys: EligibleKey[] };
          };
          if (!cancelled) setKeys(json.data?.keys ?? []);
        } finally {
          if (!cancelled) setLoadingKeys(false);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [createOpen, kind]);

  function onFileChange(next: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function submitCreate() {
    if (explanation.trim().length < 10) {
      toast.error("Please explain the issue (at least 10 characters).");
      return;
    }
    if (kind === "DEPOSIT" && !depositId) {
      toast.error("Select a failed or expired deposit.");
      return;
    }
    if (kind === "KEY" && !keyId) {
      toast.error("Select a purchased key to report.");
      return;
    }
    if (kind === "DEPOSIT" && !file) {
      toast.error("A screenshot is required for deposit reports.");
      return;
    }

    setPending(true);
    try {
      let screenshotUrl: string | null = null;
      if (file) {
        toast.loading("Uploading screenshot…", { id: "report-submit" });
        const form = new FormData();
        form.append("file", file);
        const upRes = await fetch("/api/support/upload", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const upJson = (await upRes.json()) as {
          data?: { upload: { url: string } };
          error?: { message: string };
        };
        if (!upRes.ok || !upJson.data?.upload?.url) {
          toast.error(upJson.error?.message ?? "Could not upload image", {
            id: "report-submit",
          });
          return;
        }
        screenshotUrl = upJson.data.upload.url;
      }

      const selectedKey =
        kind === "KEY" ? keys.find((k) => k.keyId === keyId) : null;

      const res = await fetch("/api/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          explanation: explanation.trim(),
          depositId: kind === "DEPOSIT" ? depositId : null,
          keyId: kind === "KEY" ? keyId : null,
          orderId: selectedKey?.orderId ?? null,
          screenshotUrl,
        }),
      });
      const json = (await res.json()) as {
        data?: { report: ReportListItem };
        error?: { message: string };
      };
      if (!res.ok || !json.data?.report) {
        toast.error(json.error?.message ?? "Could not submit report", {
          id: "report-submit",
        });
        return;
      }

      toast.success("Report submitted", { id: "report-submit" });
      setReports((prev) => [json.data!.report, ...prev]);
      setCreateOpen(false);
      resetCreate();
    } finally {
      setPending(false);
    }
  }

  async function openDetail(r: ReportListItem) {
    setDetail(r);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/reports/${r.id}`, {
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: { report: ReportListItem };
      };
      if (res.ok && json.data?.report) {
        const fresh = json.data.report;
        setDetail(fresh);
        setReports((prev) =>
          prev.map((item) =>
            item.id === fresh.id ? { ...item, ...fresh } : item,
          ),
        );
      }
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetch(
        `/api/reports?page=${next}&limit=${pageSize}`,
        { credentials: "include" },
      );
      const json = (await res.json()) as {
        data?: {
          reports: ReportListItem[];
          hasMore: boolean;
        };
      };
      if (!res.ok || !json.data) {
        toast.error("Could not load more");
        return;
      }
      setReports((prev) => [...prev, ...json.data!.reports]);
      setPage(next);
      setHasMore(json.data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <HubPageShell maxWidth="md">
      <HubHeaderBar
        icon={<Flag className="size-5" />}
        title="Reports"
        description="Submit key or deposit issues — no live chat"
        stats={[
          {
            label: "Tickets",
            value: String(reports.length),
            tone: "default",
          },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => {
              resetCreate();
              setCreateOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            New report
          </Button>
        }
      />

      {reports.length === 0 ? (
        <HubEmptyPanel>
          <EmptyState
            title="No reports yet"
            description="Report a failed deposit or a key problem. We review tickets asynchronously — no live messaging."
            action={
              <Button
                size="sm"
                onClick={() => {
                  resetCreate();
                  setCreateOpen(true);
                }}
              >
                <Plus data-icon="inline-start" />
                New report
              </Button>
            }
          />
        </HubEmptyPanel>
      ) : (
        <HubListStack>
          {reports.map((r) => (
            <HubListRow
              key={r.id}
              interactive
              role="button"
              tabIndex={0}
              onClick={() => void openDetail(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void openDetail(r);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="gap-1">
                      {r.kind === "DEPOSIT" ? (
                        <Wallet className="size-3" />
                      ) : (
                        <KeyRound className="size-3" />
                      )}
                      {r.kind === "DEPOSIT" ? "Deposit" : "Key"}
                    </Badge>
                    <Badge variant={statusVariant(r.status)}>
                      {STATUS_LABEL[r.status]}
                    </Badge>
                    {r.adminNote ? (
                      <Badge variant="secondary">Admin replied</Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-sm font-semibold">{r.subject}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {r.explanation}
                  </p>
                  {r.adminNote ? (
                    <p className="line-clamp-2 rounded-lg bg-primary/5 px-2 py-1.5 text-xs text-primary/90 ring-1 ring-primary/15">
                      <span className="font-semibold">Admin: </span>
                      {r.adminNote}
                    </p>
                  ) : null}
                  <p className="text-[10px] text-muted-foreground">
                    {formatWhen(r.createdAt)}
                    {r.deposit
                      ? ` · ${formatMoney(r.deposit.amount)}${r.deposit.payCurrency && r.deposit.payCurrency !== "USD" && r.deposit.requestedAmount > 0 ? ` (${r.deposit.requestedAmount} ${r.deposit.payCurrency})` : ""} · ${r.deposit.status}`
                      : null}
                    {r.keyDetails
                      ? ` · ${r.keyDetails.productTitle} (${r.keyDetails.durationLabel})`
                      : null}
                  </p>
                </div>
              </div>
            </HubListRow>
          ))}
        </HubListStack>
      )}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? (
              <>
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      ) : null}

      <DialogShell
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreate();
        }}
        icon={<Flag className="size-5" />}
        title="New report"
        description={
          "Pick an issue type, explain what happened, and attach proof when required."
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={pending} onClick={() => void submitCreate()}>
              {pending ? "Submitting…" : "Submit"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label>Issue type</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "DEPOSIT" as const, label: "Deposit", Icon: Wallet },
                { value: "KEY" as const, label: "Key", Icon: KeyRound },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  kind === value
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-border",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {kind === "DEPOSIT" ? (
          <div className="space-y-1.5">
            <Label htmlFor="report-deposit">Failed / expired deposit</Label>
            {loadingDeposits ? (
              <p className="text-xs text-muted-foreground">Loading deposits…</p>
            ) : deposits.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
                No failed or expired deposits to report.
              </p>
            ) : (
              <select
                id="report-deposit"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:border-border dark:bg-input"
                value={depositId}
                onChange={(e) => setDepositId(e.target.value)}
              >
                <option value="">Select a deposit…</option>
                {deposits.map((d) => (
                  <option key={d.id} value={d.id}>
                    {formatMoney(d.amount)} · {d.status} · {d.method} ·{" "}
                    {formatWhen(d.createdAt)}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="report-key">
              Purchased key <span className="text-destructive">(required)</span>
            </Label>
            {loadingKeys ? (
              <p className="text-xs text-muted-foreground">Loading keys…</p>
            ) : keys.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
                No purchased keys to report.
              </p>
            ) : (
              <select
                id="report-key"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:border-border dark:bg-input"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
              >
                <option value="">Select a key…</option>
                {keys.map((k) => (
                  <option key={k.keyId} value={k.keyId}>
                    {k.productTitle} · {k.durationLabel} · {k.maskedCode} ·{" "}
                    {formatWhen(k.createdAt)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="report-explain">Explanation</Label>
          <Textarea
            id="report-explain"
            rows={4}
            maxLength={4000}
            placeholder="Describe what went wrong…"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Screenshot{" "}
            {kind === "DEPOSIT" ? (
              <span className="text-destructive">(required)</span>
            ) : (
              <span className="text-muted-foreground">(optional)</span>
            )}
          </Label>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Screenshot preview"
              className="max-h-40 w-full rounded-lg object-contain ring-1 ring-border/50"
            />
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            {file ? "Replace screenshot" : "Choose screenshot"}
          </Button>
        </div>
      </DialogShell>

      <DialogShell
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        icon={
          detail?.kind === "DEPOSIT" ? (
            <Wallet className="size-5" />
          ) : (
            <KeyRound className="size-5" />
          )
        }
        title={detail?.subject ?? "Report"}
        description={
          detail
            ? `${detail.kind === "DEPOSIT" ? "Deposit" : "Key"} · ${STATUS_LABEL[detail.status]} · ${formatWhen(detail.createdAt)}`
            : undefined
        }
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        {detail ? (
          <div className="space-y-4">
            {detailLoading ? (
              <p className="text-xs text-muted-foreground">Refreshing…</p>
            ) : null}

            {detail.adminNote ? (
              <div className="rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-3">
                <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                  Admin reply
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                  {detail.adminNote}
                </p>
                {detail.reviewedAt ? (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {formatWhen(detail.reviewedAt)}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3.5 py-3">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Admin reply
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Awaiting admin reply on this ticket.
                </p>
              </div>
            )}

            {/* Linked Key Card */}
            {detail.kind === "KEY" && detail.keyDetails ? (
              <div className="rounded-xl bg-muted/40 p-3 ring-1 ring-border/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <KeyRound className="size-3.5" />
                  <span>Reported Key</span>
                </div>
                <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Product: </span>
                    <span className="font-semibold text-foreground">
                      {detail.keyDetails.productTitle} ({detail.keyDetails.durationLabel})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Purchased: </span>
                    <span className="font-medium text-foreground">
                      {formatWhen(detail.keyDetails.purchasedAt)}
                    </span>
                  </div>
                </div>
                {detail.keyDetails.maskedCode ? (
                  <div className="pt-1 text-xs">
                    <span className="text-muted-foreground">Key: </span>
                    <code className="rounded bg-background/80 px-2 py-0.5 font-mono text-primary ring-1 ring-primary/20">
                      {detail.keyDetails.maskedCode}
                    </code>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Linked Deposit Card */}
            {detail.deposit ? (
              <div className="rounded-xl bg-muted/40 p-3 ring-1 ring-border/40 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-success">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="size-3.5" />
                    <span>Reported Deposit</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {detail.deposit.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Amount: </span>
                    <span className="font-semibold text-success">
                      {formatMoney(detail.deposit.amount)}
                      {detail.deposit.payCurrency && detail.deposit.payCurrency !== "USD" && detail.deposit.requestedAmount > 0
                        ? ` (${detail.deposit.requestedAmount} ${detail.deposit.payCurrency})`
                        : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Method: </span>
                    <span className="font-medium text-foreground">
                      {detail.deposit.method}
                      {detail.deposit.manualMethodKey ? ` (${detail.deposit.manualMethodKey})` : ""}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Deposit Date: </span>
                    <span className="font-medium text-foreground">
                      {formatWhen(detail.deposit.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Your explanation
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                {detail.explanation}
              </p>
            </div>
            {detail.screenshotUrl ? (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Screenshot
                </p>
                <a
                  href={detail.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg ring-1 ring-border/50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detail.screenshotUrl}
                    alt="Report screenshot"
                    className="max-h-56 w-full object-contain bg-muted/30"
                  />
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogShell>
    </HubPageShell>
  );
}
