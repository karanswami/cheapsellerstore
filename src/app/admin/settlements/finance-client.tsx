"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgeDollarSign } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { ConfirmDialog, Pager, SearchBox, StatCard, TableSkeleton, adminFetch, errMsg, useAdminQuery, useDebounced } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/currencies";
import type { DeveloperSettlementsPayload } from "@/lib/developer-settlements";

export function AdminFinanceClient() {
  return <SettlementPanel />;
}

/* ───────────────────────── Settlement tables ───────────────────────── */

type Row = {
  dateKey: string;
  sales: number;
  orders: number;
  grossProfit: number;
  cost: number;
  developerShare: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
  keysSold?: number;
};
type Payload = DeveloperSettlementsPayload;

function SettlementPanel() {
  const endpoint = "/api/admin/developer-settlements";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const { data, loading, reload } = useAdminQuery<Payload>(`${endpoint}?page=${page}&q=${encodeURIComponent(dq)}`);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const rows = (data?.rows ?? []) as Row[];
  const pendingKeys = rows.filter((r) => r.status === "PENDING").map((r) => r.dateKey);
  const pickedPending = [...picked].filter((k) => pendingKeys.includes(k));
  const pickedTotal = rows.filter((r) => pickedPending.includes(r.dateKey)).reduce((a, r) => a + r.developerShare, 0);

  function toggle(k: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  return (
    <div className="space-y-4">
      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Share rate" value={`${Math.round(data.shareRate * 1000) / 10}%`} />
          <StatCard label="Pending" value={formatMoney(data.pendingShare)} hint={`${data.pendingDays} days`} tone="warning" />
          <StatCard label="Paid" value={formatMoney(data.paidShare)} hint={`${data.paidDays} days`} tone="success" />
          <StatCard label="Days tracked" value={data.totalRows} />
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Filter by date or status…" />
        <Button disabled={pickedPending.length === 0} onClick={() => setConfirm(true)}>
          Mark {pickedPending.length || ""} paid
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={BadgeDollarSign} title="No settlement days" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Share</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.dateKey}>
                  <TableCell>{r.status === "PENDING" ? <Checkbox checked={picked.has(r.dateKey)} onCheckedChange={() => toggle(r.dateKey)} aria-label={`Select ${r.dateKey}`} /> : null}</TableCell>
                  <TableCell className="font-medium">{r.dateKey}</TableCell>
                  <TableCell className="text-right">{formatMoney(r.sales)}</TableCell>
                  <TableCell className="text-right">{r.orders}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatMoney(r.cost)}</TableCell>
                  <TableCell className="text-right">{formatMoney(r.grossProfit)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(r.developerShare)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                    {r.paidAt ? <span className="ml-1 text-xs text-muted-foreground">{formatDate(r.paidAt)}</span> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {data ? <Pager page={page} pageSize={data.pageSize} total={data.totalRows} onPage={setPage} loading={loading} /> : null}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Mark days as paid?"
        description={`${pickedPending.length} day(s), ${formatMoney(pickedTotal)} total developer share, will be recorded as paid out.`}
        confirmLabel="Mark paid"
        onConfirm={async () => {
          try {
            await adminFetch(endpoint, { method: "POST", json: { dateKeys: pickedPending } });
            toast.success("Marked as paid.");
            setPicked(new Set());
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}
