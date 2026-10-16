"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Eye, ImageIcon, Wallet, X } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, Pager, SearchBox, StatCard, TableSkeleton, adminFetch, errMsg, useAdminList, useDebounced } from "@/components/admin/kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";

type Deposit = {
  id: string;
  method: string;
  status: string;
  amount: number;
  requestedAmount: number;
  payCurrency: string;
  proofImage: string | null;
  proofUploadedAt: string | null;
  adminNote: string | null;
  failReason: string | null;
  manualMethodName: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; username: string; banned: boolean };
};

const STATUS_FILTERS = [
  { v: "open", label: "Open" },
  { v: "pending", label: "Pending" },
  { v: "processing", label: "Processing" },
  { v: "completed", label: "Approved" },
  { v: "failed", label: "Rejected" },
  { v: "expired", label: "Expired" },
  { v: "cancelled", label: "Cancelled" },
  { v: "all", label: "All" },
];
const RANGES = [
  { v: "all", label: "All time" },
  { v: "today", label: "Today" },
  { v: "7d", label: "7 days" },
  { v: "30d", label: "30 days" },
];
const PROOF_FILTERS = [
  { v: "any", label: "Any proof" },
  { v: "with", label: "With proof" },
  { v: "without", label: "No proof" },
];
const SORTS = [
  { v: "newest", label: "Newest" },
  { v: "oldest", label: "Oldest" },
  { v: "amount", label: "Highest amount" },
];
const LIMIT = 15;

type Summary = { open: number; pending: number; processing: number; openAmount: number; completed: number; completedAmount: number; rejected: number };
type MethodOpt = { id: string; name: string };

export function AdminDepositsClient() {
  const [status, setStatus] = useState("open");
  const [range, setRange] = useState("all");
  const [method, setMethod] = useState("");
  const [proof, setProof] = useState("any");
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const dmin = useDebounced(minAmount);
  const dmax = useDebounced(maxAmount);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [methods, setMethods] = useState<MethodOpt[]>([]);
  const [active, setActive] = useState<Deposit | null>(null);

  // Wallet credit is stored in microcents; the filter inputs are in dollars.
  const toMicro = (v: string) => (v && Number(v) >= 0 ? String(usdToMicrocents(Number(v))) : undefined);
  const params = {
    status,
    range,
    method: method || undefined,
    proof: proof === "any" ? undefined : proof,
    sort,
    q: dq,
    minAmount: toMicro(dmin),
    maxAmount: toMicro(dmax),
  };
  const list = useAdminList<Deposit>("/api/admin/deposits", "deposits", { page, limit: LIMIT, ...params });

  // Summary and method list ride along with the list response; refetch them only when filters change.
  const filterKey = JSON.stringify(params);
  useEffect(() => {
    let live = true;
    const qs = new URLSearchParams({ limit: "1" });
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    adminFetch<{ summary: Summary; methods: MethodOpt[] }>(`/api/admin/deposits?${qs}`)
      .then((d) => {
        if (!live) return;
        setSummary(d.summary);
        setMethods(d.methods);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, list.items]);

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const dirty = range !== "all" || method || proof !== "any" || q || minAmount || maxAmount || sort !== "newest" || status !== "open";

  return (
    <div className="space-y-4">
      {summary ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Awaiting review" value={summary.open} hint={`${summary.pending} pending · ${summary.processing} processing`} icon={Wallet} tone={summary.open ? "warning" : "default"} />
          <StatCard label="Pending value" value={formatMoney(summary.openAmount)} />
          <StatCard label="Approved" value={summary.completed} hint={formatMoney(summary.completedAmount)} tone="success" />
          <StatCard label="Rejected / expired" value={summary.rejected} tone={summary.rejected ? "destructive" : "default"} />
        </div>
      ) : null}

      <div className="space-y-3 rounded-xl border bg-card p-3">
        <Chips value={status} onChange={reset(setStatus)} options={STATUS_FILTERS} />
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <Chips value={range} onChange={reset(setRange)} options={RANGES} />
            <Chips value={proof} onChange={reset(setProof)} options={PROOF_FILTERS} />
            {methods.length > 1 ? (
              <Chips value={method} onChange={reset(setMethod)} options={[{ v: "", label: "All methods" }, ...methods.map((m) => ({ v: m.id, label: m.name }))]} />
            ) : null}
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <SearchBox value={q} onChange={reset(setQ)} placeholder="User, email or deposit ID…" />
            <div className="flex flex-wrap items-center gap-2">
              <Input type="number" min={0} inputMode="decimal" value={minAmount} onChange={(e) => reset(setMinAmount)(e.target.value)} placeholder="Min $" className="h-8 w-24" />
              <Input type="number" min={0} inputMode="decimal" value={maxAmount} onChange={(e) => reset(setMaxAmount)(e.target.value)} placeholder="Max $" className="h-8 w-24" />
              <select
                value={sort}
                onChange={(e) => reset(setSort)(e.target.value)}
                className="h-8 rounded-lg border bg-background px-2 text-xs"
                aria-label="Sort"
              >
                {SORTS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.label}
                  </option>
                ))}
              </select>
              {dirty ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatus("open"); setRange("all"); setMethod(""); setProof("any"); setSort("newest");
                    setQ(""); setMinAmount(""); setMaxAmount(""); setPage(1);
                  }}
                >
                  <X /> Reset
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Wallet} title="No pending deposits" hint="No manual deposits match these filters." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((d) => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => setActive(d)}>
                  <TableCell>
                    <p className="text-sm font-medium">@{d.user.username}</p>
                    <p className="text-xs text-muted-foreground">{d.user.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">{d.manualMethodName ?? d.method}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(d.amount)}</TableCell>
                  <TableCell>{d.proofImage ? <ImageIcon className="size-4 text-primary" /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(d.proofUploadedAt ?? d.createdAt, true)}</TableCell>
                  <TableCell>
                    <Eye className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={LIMIT} total={list.total} onPage={setPage} loading={list.loading} />
      <ReviewDialog
        deposit={active}
        onClose={() => setActive(null)}
        onDone={() => {
          setActive(null);
          list.reload();
        }}
      />
    </div>
  );
}

function ReviewDialog({ deposit, onClose, onDone }: { deposit: Deposit | null; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);
  const open = !!deposit;
  const isOpen = deposit?.status === "PENDING" || deposit?.status === "PROCESSING";

  async function act(action: "approve" | "reject") {
    if (!deposit) return;
    setBusy(action);
    try {
      await adminFetch(`/api/admin/deposits/${deposit.id}`, { method: "PATCH", json: { action, note: note.trim() || undefined } });
      toast.success(action === "approve" ? "Deposit approved and credited." : "Deposit rejected.");
      setNote("");
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
      throw e;
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          {deposit ? (
            <>
              <DialogHeader>
                <DialogTitle>Deposit #{deposit.id.slice(-8).toUpperCase()}</DialogTitle>
                <DialogDescription>
                  @{deposit.user.username} · {deposit.user.email}
                  {deposit.user.banned ? " · banned" : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info k="Status" v={<StatusBadge status={deposit.status} />} />
                <Info k="Method" v={deposit.manualMethodName ?? deposit.method} />
                <Info k="Wallet credit" v={formatMoney(deposit.amount)} />
                <Info k="Requested" v={`${deposit.requestedAmount} ${deposit.payCurrency}`} />
              </div>
              {deposit.proofImage ? (
                <a href={deposit.proofImage} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={deposit.proofImage} alt="Payment proof" className="max-h-72 w-full rounded-lg border object-contain" />
                </a>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No proof uploaded.</p>
              )}
              {deposit.adminNote || deposit.failReason ? (
                <p className="rounded-lg bg-muted p-3 text-sm">{deposit.adminNote || deposit.failReason}</p>
              ) : null}
              {isOpen ? (
                <>
                  <Field label="Note to user (optional)">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Reason or message…" />
                  </Field>
                  <DialogFooter>
                    <Button variant="destructive" disabled={!!busy} onClick={() => setConfirm("reject")}>
                      <X /> Reject
                    </Button>
                    <Button disabled={!!busy} onClick={() => setConfirm("approve")}>
                      <Check /> Approve
                    </Button>
                  </DialogFooter>
                </>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "approve" ? "Approve this deposit?" : "Reject this deposit?"}
        description={
          confirm === "approve"
            ? `This credits ${deposit ? formatMoney(deposit.amount) : ""} to the user's wallet.`
            : "The user is notified and nothing is credited."
        }
        confirmLabel={confirm === "approve" ? "Approve & credit" : "Reject"}
        destructive={confirm === "reject"}
        onConfirm={() => act(confirm!)}
      />
    </>
  );
}

function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{k}</p>
      <div className="font-medium">{v}</div>
    </div>
  );
}
