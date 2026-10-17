"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Eye, ImageIcon, Wallet, X } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, Field, Pager, SearchBox, StatCard, TableSkeleton, adminFetch, errMsg, useAdminList, useDebounced } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

      <div className="space-y-3 rounded-xl border bg-card p-3">
        <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="w-max">
            <Chips value={status} onChange={reset(setStatus)} options={STATUS_FILTERS} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <SearchBox value={q} onChange={reset(setQ)} placeholder="User, email or deposit ID…" className="col-span-2 sm:w-72" />
          <Select value={proof} onValueChange={reset(setProof)}>
            <SelectTrigger size="sm" className="w-full sm:w-36" aria-label="Proof">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROOF_FILTERS.map((f) => (
                <SelectItem key={f.v} value={f.v}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {methods.length > 1 ? (
            <Select value={method || "all"} onValueChange={(v) => reset(setMethod)(v === "all" ? "" : v)}>
              <SelectTrigger size="sm" className="w-full sm:w-44" aria-label="Method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {methods.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      {list.loading && list.items.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <TableSkeleton />
        </div>
      ) : list.items.length === 0 ? (
        <div className="rounded-xl border bg-card p-6">
          <EmptyState icon={Wallet} title="No deposits" hint="Nothing matches these filters." />
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards, no horizontal scroll */}
          <ul className="space-y-2.5 md:hidden">
            {list.items.map((d) => {
              const open = isOpenStatus(d.status);
              return (
                <li key={d.id} className="overflow-hidden rounded-xl border bg-card">
                  <button type="button" onClick={() => setActive({ deposit: d, step: "view" })} className="block w-full p-3.5 text-left active:bg-accent/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">@{d.user.username}</p>
                        <p className="truncate text-xs text-muted-foreground">{d.user.email}</p>
                      </div>
                      <p className="shrink-0 text-base font-semibold tabular-nums">{formatMoney(d.amount)}</p>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                      <StatusBadge status={d.status} />
                      <span className="min-w-0 truncate">{d.manualMethodName ?? d.method}</span>
                      {d.proofImage ? (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <ImageIcon className="size-3.5" /> Proof
                        </span>
                      ) : null}
                      <span className="ml-auto">{formatDate(d.proofUploadedAt ?? d.createdAt, true)}</span>
                    </div>
                  </button>
                  {open ? (
                    <div className="grid grid-cols-2 gap-2 border-t bg-muted/30 p-2.5">
                      <Button size="sm" variant="outline" onClick={() => setActive({ deposit: d, step: "reject" })}>
                        <X /> Reject
                      </Button>
                      <Button size="sm" onClick={() => setActive({ deposit: d, step: "approve" })}>
                        <Check /> Approve
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {/* Desktop: table */}
          <div className="hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="w-44" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.items.map((d) => {
                  const open = isOpenStatus(d.status);
                  return (
                    <TableRow key={d.id} className="cursor-pointer" onClick={() => setActive({ deposit: d, step: "view" })}>
                      <TableCell className="max-w-56">
                        <p className="truncate text-sm font-medium">@{d.user.username}</p>
                        <p className="truncate text-xs text-muted-foreground">{d.user.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">{d.manualMethodName ?? d.method}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(d.amount)}</TableCell>
                      <TableCell>{d.proofImage ? <ImageIcon className="size-4 text-primary" /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} />
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">{formatDate(d.proofUploadedAt ?? d.createdAt, true)}</TableCell>
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
          </div>
        </>
      )}
      <Pager page={page} pageSize={LIMIT} total={list.total} onPage={setPage} loading={list.loading} />
      <ReviewDialog
        key={active?.deposit.id}
        deposit={active?.deposit ?? null}
        initialStep={active?.step ?? "view"}
        onClose={() => setActive(null)}
        onDone={() => {
          setActive(null);
          list.reload();
          window.dispatchEvent(new Event("admin:badges-refresh"));
        }}
      />
    </div>
  );
}

type Step = "view" | "approve" | "reject";
const isOpenStatus = (s: string) => s === "PENDING" || s === "PROCESSING";

function ReviewDialog({ deposit, initialStep, onClose, onDone }: { deposit: Deposit | null; initialStep: Step; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>(initialStep);
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
        json: { action, note: action === "reject" ? reason.trim() : undefined },
      });
      toast.success(action === "approve" ? "Deposit approved and credited." : "Deposit rejected.");
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const title = step === "approve" ? "Approve deposit" : step === "reject" ? "Reject deposit" : "Deposit review";

  return (
    <Dialog open={!!deposit} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg gap-0 p-0 sm:p-0">
        {deposit ? (
          <>
            <DialogHeader className="border-b p-5 pr-12">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="truncate">
                #{deposit.id.slice(-8).toUpperCase()} · @{deposit.user.username}
                {deposit.user.banned ? " · banned" : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{step === "approve" ? "Will be credited" : "Wallet credit"}</p>
                  <p className="text-2xl font-semibold tabular-nums">{formatMoney(deposit.amount)}</p>
                </div>
                <StatusBadge status={deposit.status} />
              </div>

              {step === "view" ? (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <Info k="User" v={<span className="break-all">{deposit.user.email}</span>} />
                    <Info k="Method" v={deposit.manualMethodName ?? deposit.method} />
                    <Info k="Requested" v={`${deposit.requestedAmount} ${deposit.payCurrency}`} />
                    <Info k="Submitted" v={formatDate(deposit.proofUploadedAt ?? deposit.createdAt, true)} />
                  </div>
                  {deposit.proofImage ? (
                    <a href={deposit.proofImage} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={deposit.proofImage} alt="Payment proof" className="max-h-64 w-full object-contain" />
                    </a>
                  ) : (
                    <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">No proof uploaded.</p>
                  )}
                  {deposit.adminNote || deposit.failReason ? <p className="rounded-lg bg-muted p-3 text-sm">{deposit.adminNote || deposit.failReason}</p> : null}
                </>
              ) : null}

              {step === "approve" ? (
                <p className="text-xs text-muted-foreground">
                  {deposit.manualMethodName ?? deposit.method} · {deposit.proofImage ? "proof attached" : "no proof uploaded"}
                </p>
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
                        className={`rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent hover:text-foreground ${reason === r ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            {step === "view" && !isOpen ? null : (
              <DialogFooter className="border-t bg-muted/30 p-4">
                {step === "view" ? (
                  <>
                    <Button variant="outline" onClick={() => setStep("reject")}>
                      <X /> Reject
                    </Button>
                    <Button onClick={() => setStep("approve")}>
                      <Check /> Approve
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" disabled={busy} onClick={() => setStep("view")}>
                      Back
                    </Button>
                    {step === "approve" ? (
                      <Button disabled={busy} onClick={() => act("approve")}>
                        <Check /> {busy ? "Approving…" : "Approve & credit"}
                      </Button>
                    ) : (
                      <Button variant="destructive" disabled={busy || !reasonOk} onClick={() => act("reject")}>
                        <X /> {busy ? "Rejecting…" : "Reject deposit"}
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            )}
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
