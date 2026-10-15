"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { KpiCard } from "@/components/admin/stats/kpi-card";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/currencies";
import {
  formatSettlementDate,
  type DeveloperSettlementsPayload,
} from "@/types/developer-settlements";
import { Banknote } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

export function DevelopmentWorkspace() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [singleDay, setSingleDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const query = new URLSearchParams({
    page: String(page),
    ...(deferredSearch ? { q: deferredSearch } : {}),
  });
  const { data, loading, reload } =
    useAdminFetch<DeveloperSettlementsPayload>(
      `/api/admin/developer-settlements?${query.toString()}`,
    );

  const selectedPending = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(
      (r) => selected.has(r.dateKey) && r.status === "PENDING",
    );
  }, [data, selected]);

  const selectedShare = selectedPending.reduce(
    (s, r) => s + r.developerShare,
    0,
  );

  const confirmKeys = singleDay
    ? [singleDay]
    : selectedPending.map((r) => r.dateKey);
  const confirmAmount = singleDay
    ? (data?.rows.find((r) => r.dateKey === singleDay)?.developerShare ?? 0)
    : selectedShare;

  function toggle(dateKey: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(dateKey);
      else next.delete(dateKey);
      return next;
    });
  }

  function toggleAllPending(checked: boolean) {
    if (!data) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of data.rows) {
        if (row.status !== "PENDING") continue;
        if (checked) next.add(row.dateKey);
        else next.delete(row.dateKey);
      }
      return next;
    });
  }

  async function markPaid() {
    if (!confirmKeys.length) return;
    setBusy(true);
    const result = await adminMutate("/api/admin/developer-settlements", {
      method: "POST",
      body: JSON.stringify({ dateKeys: confirmKeys }),
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(
      confirmKeys.length === 1
        ? "Day marked as paid"
        : `${confirmKeys.length} days marked as paid`,
    );
    setConfirmOpen(false);
    setSingleDay(null);
    setSelected(new Set());
    void reload();
  }

  const pendingOnPage =
    data?.rows.filter((r) => r.status === "PENDING").length ?? 0;
  const allPendingSelected =
    pendingOnPage > 0 &&
    !!data &&
    data.rows
      .filter((r) => r.status === "PENDING")
      .every((r) => selected.has(r.dateKey));

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Development"
        description="Developer settlement control — review daily profit sharing, select payout days, and safely mark settlement records as paid without changing purchase or wallet logic."
      />

      {loading || !data ? (
        <AdminListSkeleton rows={8} />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Profit × {Math.round(data.shareRate * 100)}%
          </p>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <KpiCard
              label="Pending days"
              value={String(data.pendingDays)}
              hint="Awaiting payout"
            />
            <KpiCard
              label="Pending share"
              value={formatMoney(data.pendingShare)}
              hint="Developer total"
              tone="success"
            />
            <KpiCard
              label="Paid days"
              value={String(data.paidDays)}
              hint="Already settled"
            />
            <KpiCard
              label="Selected"
              value={formatMoney(selectedShare)}
              hint={`${selectedPending.length} day(s)`}
            />
          </div>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  Settlement rows
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Search directly above the data. Use row selection for batch
                  settlement.
                </p>
              </div>
              <Button
                size="sm"
                disabled={selectedPending.length === 0}
                onClick={() => {
                  setSingleDay(null);
                  setConfirmOpen(true);
                }}
              >
                Mark selected paid
              </Button>
            </div>

            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search date, amount, share..."
              className="max-w-md"
            />

            {!data.rows.length ? (
              <AdminEmptyState message="No settlement rows for this search." />
            ) : (
              <>
                {/* Mobile compact list */}
                <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:hidden">
                  {data.rows.map((row) => {
                    const pending = row.status === "PENDING";
                    return (
                      <li key={row.dateKey} className="px-3 py-2.5">
                        <div className="flex items-start gap-2.5">
                          <Checkbox
                            checked={selected.has(row.dateKey)}
                            disabled={!pending}
                            onCheckedChange={(v) =>
                              toggle(row.dateKey, v === true)
                            }
                            className="mt-0.5"
                            aria-label={`Select ${row.dateKey}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-medium">
                                {formatSettlementDate(row.dateKey)}
                              </p>
                              <Badge
                                variant={
                                  pending ? "outline" : "secondary"
                                }
                                className="text-[10px]"
                              >
                                {row.status === "PAID" ? "Paid" : "Pending"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {row.dateKey} · {row.orders} orders · Cost{" "}
                              {formatMoney(row.cost)}
                            </p>
                            <p className="mt-0.5 text-xs tabular-nums">
                              Sales {formatMoney(row.sales)} · Profit{" "}
                              {formatMoney(row.grossProfit)} · Dev{" "}
                              <span className="text-success">
                                {formatMoney(row.developerShare)}
                              </span>
                            </p>
                          </div>
                          {pending ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              onClick={() => {
                                setSingleDay(row.dateKey);
                                setConfirmOpen(true);
                              }}
                            >
                              Pay
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allPendingSelected}
                            disabled={pendingOnPage === 0}
                            onCheckedChange={(v) =>
                              toggleAllPending(v === true)
                            }
                            aria-label="Select all pending on page"
                          />
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Gross profit</TableHead>
                        <TableHead>Developer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((row) => {
                        const pending = row.status === "PENDING";
                        return (
                          <TableRow key={row.dateKey}>
                            <TableCell>
                              <Checkbox
                                checked={selected.has(row.dateKey)}
                                disabled={!pending}
                                onCheckedChange={(v) =>
                                  toggle(row.dateKey, v === true)
                                }
                                aria-label={`Select ${row.dateKey}`}
                              />
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">
                                {formatSettlementDate(row.dateKey)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {row.dateKey}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm tabular-nums">
                                {formatMoney(row.sales)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {row.orders} orders
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm tabular-nums">
                                {formatMoney(row.grossProfit)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Actual cost {formatMoney(row.cost)}
                              </p>
                            </TableCell>
                            <TableCell className="font-medium text-success tabular-nums">
                              {formatMoney(row.developerShare)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={pending ? "outline" : "secondary"}
                              >
                                {row.status === "PAID" ? "Paid" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {pending ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSingleDay(row.dateKey);
                                    setConfirmOpen(true);
                                  }}
                                >
                                  Mark paid
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Settled
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <p>
                    Showing {data.rows.length} of {data.totalRows} rows
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={data.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <span className="tabular-nums">
                      {data.page}/{data.pageCount}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={data.page >= data.pageCount}
                      onClick={() =>
                        setPage((p) => Math.min(data.pageCount, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setSingleDay(null);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Banknote className="size-5" />
              </div>
              <DialogTitle className="text-lg">Mark settlement paid</DialogTitle>
              <DialogDescription>
                Records payout status only. Purchase totals and customer wallets
                are not changed.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm sm:px-5">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Days
                </p>
                <p className="mt-0.5 text-base font-medium tabular-nums">
                  {confirmKeys.length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Developer share
                </p>
                <p className="mt-0.5 text-base font-medium text-success tabular-nums">
                  {formatMoney(confirmAmount)}
                </p>
              </div>
            </div>
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
              {confirmKeys.map((k) => (
                <li key={k} className="tabular-nums">
                  {formatSettlementDate(k)}
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:px-5">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !confirmKeys.length}
              onClick={() => void markPaid()}
            >
              {busy ? "Saving…" : "Confirm paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
