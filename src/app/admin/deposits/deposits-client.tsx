"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Eye, ImageIcon, Wallet, X } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, Field, Pager, SearchBox, StatCard, TableSkeleton, adminFetch, errMsg, useAdminList, useDebounced } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/currencies";

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
  { v: "open", label: "Pending" },
  { v: "completed", label: "Approved" },
  { v: "failed", label: "Rejected" },
  { v: "all", label: "All" },
];
const PROOF_FILTERS = [
  { v: "any", label: "Any proof" },
  { v: "with", label: "With proof" },
  { v: "without", label: "No proof" },
];
const REJECT_REASONS = ["Payment not received", "Proof is unclear or invalid", "Amount doesn't match", "Duplicate or reused proof"];
const LIMIT = 15;

type Summary = { open: number; pending: number; processing: number; openAmount: number; completed: number; completedAmount: number; rejected: number };
type MethodOpt = { id: string; name: string };

export function AdminDepositsClient() {
  const [status, setStatus] = useState("open");
  const [method, setMethod] = useState("");
  const [proof, setProof] = useState("any");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [methods, setMethods] = useState<MethodOpt[]>([]);
  const [active, setActive] = useState<{ deposit: Deposit; step: Step } | null>(null);

  const params = { status, method: method || undefined, proof: proof === "any" ? undefined : proof, q: dq };
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
  const selectCls = "h-8 rounded-lg border bg-background px-2 text-xs";

  return (
    <div className="space-y-4">
      {summary ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Awaiting review" value={summary.open} icon={Wallet} tone={summary.open ? "warning" : "default"} />
          <StatCard label="Pending value" value={formatMoney(summary.openAmount)} />
          <StatCard label="Approved" value={summary.completed} hint={formatMoney(summary.completedAmount)} tone="success" />
          <StatCard label="Rejected" value={summary.rejected} tone={summary.rejected ? "destructive" : "default"} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips value={status} onChange={reset(setStatus)} options={STATUS_FILTERS} />
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={q} onChange={reset(setQ)} placeholder="User, email or deposit ID…" />
          <select value={proof} onChange={(e) => reset(setProof)(e.target.value)} className={selectCls} aria-label="Proof">
            {PROOF_FILTERS.map((f) => (
              <option key={f.v} value={f.v}>
                {f.label}
              </option>
            ))}
          </select>
          {methods.length > 1 ? (
            <select value={method} onChange={(e) => reset(setMethod)(e.target.value)} className={selectCls} aria-label="Method">
              <option value="">All methods</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Wallet} title="No deposits" hint="Nothing matches these filters." />
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
                <TableHead className="w-44" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((d) => {
                const open = isOpenStatus(d.status);
                return (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => setActive({ deposit: d, step: "view" })}>
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
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {open ? (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setActive({ deposit: d, step: "reject" })}>
                            <X /> Reject
                          </Button>
                          <Button size="sm" onClick={() => setActive({ deposit: d, step: "approve" })}>
                            <Check /> Approve
                          </Button>
                        </div>
                      ) : (
                        <Eye className="ml-auto size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={LIMIT} total={list.total} onPage={setPage} loading={list.loading} />
      <ReviewDialog
        key={active?.deposit.id}
        deposit={active?.deposit ?? null}
        initialStep={active?.step ?? "view"}
        onClose={() => setActive(null)}
        onDone={() => {
          setActive(null);
          list.reload();
        }}
      />
    </div>
  );
}

type Step = "view" | "approve" | "reject";
const isOpenStatus = (s: string) => s === "PENDING" || s === "PROCESSING";

function ReviewDialog({ deposit, initialStep, onClose, onDone }: { deposit: Deposit | null; initialStep: Step; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>(initialStep);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const isOpen = !!deposit && isOpenStatus(deposit.status);
  const reasonOk = reason.trim().length >= 3;

  async function act(action: "approve" | "reject") {
    if (!deposit) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/deposits/${deposit.id}`, {
        method: "PATCH",
        json: { action, note: (action === "reject" ? reason : note).trim() || undefined },
      });
      toast.success(action === "approve" ? "Deposit approved and credited." : "Deposit rejected.");
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!deposit} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        {deposit ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {step === "approve" ? "Approve deposit" : step === "reject" ? "Reject deposit" : `Deposit #${deposit.id.slice(-8).toUpperCase()}`}
              </DialogTitle>
              <DialogDescription>
                @{deposit.user.username} · {deposit.user.email}
                {deposit.user.banned ? " · banned" : ""}
              </DialogDescription>
            </DialogHeader>

            {step === "view" ? (
              <>
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
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setStep("reject")}>
                      <X /> Reject
                    </Button>
                    <Button onClick={() => setStep("approve")}>
                      <Check /> Approve
                    </Button>
                  </DialogFooter>
                ) : null}
              </>
            ) : null}

            {step === "approve" ? (
              <>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <p className="text-xs text-muted-foreground">Will be credited to wallet</p>
                  <p className="text-2xl font-semibold">{formatMoney(deposit.amount)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {deposit.manualMethodName ?? deposit.method} · {deposit.proofImage ? "proof attached" : "no proof uploaded"}
                  </p>
                </div>
                <Field label="Note to user (optional)">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Add a message…" />
                </Field>
                <DialogFooter>
                  <Button variant="ghost" disabled={busy} onClick={() => setStep("view")}>
                    Back
                  </Button>
                  <Button disabled={busy} onClick={() => act("approve")}>
                    <Check /> {busy ? "Approving…" : "Approve & credit"}
                  </Button>
                </DialogFooter>
              </>
            ) : null}

            {step === "reject" ? (
              <>
                <Field label="Reason (shown to user)">
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} placeholder="Why is this deposit being rejected?" autoFocus />
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {REJECT_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="ghost" disabled={busy} onClick={() => setStep("view")}>
                    Back
                  </Button>
                  <Button variant="destructive" disabled={busy || !reasonOk} onClick={() => act("reject")}>
                    <X /> {busy ? "Rejecting…" : "Reject deposit"}
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
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
