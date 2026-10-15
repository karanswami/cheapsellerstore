"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Summary = {
  total: number;
  completed: number;
  failed: number;
  expired: number;
  cancelled: number;
  open: number;
  paidIdr: number;
  creditedMicrocents: number;
  avgIdr: number;
  successRate: number;
};

type DailyRow = {
  date: string;
  count: number;
  completed: number;
  failed: number;
  paidIdr: number;
  creditedMicrocents: number;
};

type QrisDeposit = {
  id: string;
  status: string;
  payableAmount: number;
  paidAmount: number | null;
  amount: number;
  providerDepositId: string | null;
  failReason: string | null;
  createdAt: string;
  completedAt: string | null;
  user: { id: string; username: string; email: string | null };
};

type Payload = {
  truncated: boolean;
  summary: Summary;
  daily: DailyRow[];
  deposits: QrisDeposit[];
  page: number;
  total: number;
  hasMore: boolean;
};

const RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "Since 14 Oct" },
  { id: "custom", label: "Custom" },
] as const;

const STATUSES = [
  "all",
  "COMPLETED",
  "PENDING",
  "PROCESSING",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
] as const;

const PAGE_SIZE = 20;

const idr = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

function statusVariant(s: string): "secondary" | "destructive" | "outline" {
  if (s === "COMPLETED") return "secondary";
  if (s === "PENDING" || s === "PROCESSING") return "outline";
  return "destructive";
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card variant="stat" size="sm" className="px-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

export function QrisWorkspace() {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [amountApplied, setAmountApplied] = useState({ min: "", max: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({
        range,
        status,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (range === "custom") {
        if (from) sp.set("from", from);
        if (to) sp.set("to", to);
      }
      if (qApplied) sp.set("q", qApplied);
      if (amountApplied.min) sp.set("minAmount", amountApplied.min);
      if (amountApplied.max) sp.set("maxAmount", amountApplied.max);
      const res = await fetch(`/api/admin/qris-deposits?${sp}`, {
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: Payload;
        error?: { message: string };
      };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Failed to load");
        return;
      }
      setData(json.data);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [range, from, to, status, page, qApplied, amountApplied]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters() {
    setPage(1);
    setQApplied(q.trim());
    setAmountApplied({ min: minAmount.trim(), max: maxAmount.trim() });
  }

  const s = data?.summary;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="QRIS deposits"
        description="AutoGoPay QRIS (IDR) deposit analytics · counted from 14 Oct 2026 (AutoGoPay start) · days are WIB (UTC+7)"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            <span className="ml-1.5">Refresh</span>
          </Button>
        }
      />

      <div className="space-y-3">
        <FilterChipRow>
          {RANGES.map((r) => (
            <FilterChip
              key={r.id}
              active={range === r.id}
              onClick={() => {
                setRange(r.id);
                setPage(1);
              }}
            >
              {r.label}
            </FilterChip>
          ))}
        </FilterChipRow>
        {range === "custom" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 w-40"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="h-9 w-40"
            />
          </div>
        ) : null}
        <FilterChipRow>
          {STATUSES.map((st) => (
            <FilterChip
              key={st}
              active={status === st}
              onClick={() => {
                setStatus(st);
                setPage(1);
              }}
            >
              {st === "all" ? "All statuses" : st.charAt(0) + st.slice(1).toLowerCase()}
            </FilterChip>
          ))}
        </FilterChipRow>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search user, email, txn or deposit ID"
            className="h-9 w-full sm:w-72"
          />
          <Input
            type="number"
            min={0}
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="Min Rp"
            className="h-9 w-28"
          />
          <Input
            type="number"
            min={0}
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="Max Rp"
            className="h-9 w-28"
          />
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
      </div>

      {loading && !data ? (
        <AdminListSkeleton rows={5} />
      ) : data && s ? (
        <>
          {data.truncated ? (
            <p className="text-xs text-warning">
              Very large range — summary covers the latest 20,000 deposits only.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Paid (IDR)" value={idr(s.paidIdr)} hint={`${s.completed} successful`} />
            <Stat label="Credited (USD)" value={formatMoney(s.creditedMicrocents)} />
            <Stat label="Deposits" value={String(s.total)} hint={`${s.open} open`} />
            <Stat
              label="Success rate"
              value={`${s.successRate}%`}
              hint={`avg ${idr(s.avgIdr)}`}
            />
            <Stat label="Failed" value={String(s.failed)} />
            <Stat label="Expired" value={String(s.expired)} />
            <Stat label="Cancelled" value={String(s.cancelled)} />
            <Stat label="Successful" value={String(s.completed)} />
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Daily breakdown</h2>
            {data.daily.length === 0 ? (
              <AdminEmptyState message="No QRIS deposits in this range." />
            ) : (
              <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Created</th>
                      <th className="px-3 py-2 text-right">Success</th>
                      <th className="px-3 py-2 text-right">Failed/exp.</th>
                      <th className="px-3 py-2 text-right">Paid (IDR)</th>
                      <th className="px-3 py-2 text-right">Credited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((d) => (
                      <tr key={d.date} className="border-t border-border/60">
                        <td className="px-3 py-2 font-medium">{d.date}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{d.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{d.completed}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{d.failed}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{idr(d.paidIdr)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(d.creditedMicrocents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Transactions ({data.total})</h2>
            {data.deposits.length === 0 ? (
              <AdminEmptyState message="No matching deposits." />
            ) : (
              <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Txn ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deposits.map((d) => (
                      <tr key={d.id} className="border-t border-border/60">
                        <td className="whitespace-nowrap px-3 py-2 text-xs">
                          {new Date(d.createdAt).toLocaleString(undefined, {
                            timeZone: "Asia/Jakarta",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium">@{d.user.username}</p>
                          <p className="text-xs text-muted-foreground">{d.user.email}</p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {idr(d.paidAmount ?? d.payableAmount)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(d.amount)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                          {d.failReason ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">{d.failReason}</p>
                          ) : null}
                        </td>
                        <td className="max-w-[10rem] truncate px-3 py-2 font-mono text-xs">
                          {d.providerDepositId ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span>
                Page {data.page} of {pages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!data.hasMore || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
