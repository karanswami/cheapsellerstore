"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  ShoppingBag,
  Tag,
  Wallet,
  Zap,
} from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Pager, SearchBox, StatCard, TableSkeleton, adminFetch, errMsg, useAdminList, useAdminQuery, useDebounced } from "@/components/admin/kit";
import { CopyKey } from "@/components/copy-key";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import type { AdminOrderAudience, AdminOrderDetail, AdminOrderListItem, AdminOrderStats } from "@/types/admin-orders";

const STATUS = [
  { v: "all", label: "All" },
  { v: "PENDING", label: "Pending" },
  { v: "PAID", label: "Paid" },
  { v: "FULFILLED", label: "Fulfilled" },
  { v: "FAILED", label: "Failed" },
  { v: "REFUNDED", label: "Refunded" },
];
const DOT: Record<string, string> = {
  PENDING: "bg-warning",
  PAID: "bg-primary",
  FULFILLED: "bg-success",
  FAILED: "bg-destructive",
  REFUNDED: "bg-muted-foreground",
};
const LIMIT = 15;

const shortId = (id: string) => id.slice(-8).toUpperCase();

function Avatar({ name, guest }: { name: string; guest?: boolean }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold uppercase",
        guest ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
      )}
    >
      {guest ? "G" : name.slice(0, 2)}
    </span>
  );
}

function Buyer({ o }: { o: AdminOrderListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={o.user?.username ?? "G"} guest={!o.user} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{o.user ? `@${o.user.username}` : "Guest"}</p>
        <p className="truncate text-xs text-muted-foreground">{o.buyerEmail}</p>
      </div>
    </div>
  );
}

export function AdminOrdersClient() {
  const [status, setStatus] = useState("all");
  const [audience, setAudience] = useState<AdminOrderAudience>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<AdminOrderListItem>("/api/admin/orders", "orders", { page, limit: LIMIT, status, audience, q: dq });
  const stats = useAdminQuery<AdminOrderStats>("/api/admin/orders/stats");
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const s = stats.data;
  const count = (v: string) => (!s ? null : v === "all" ? s.all : (s.counts[v] ?? 0));

  async function open(id: string) {
    setOpening(id);
    try {
      setDetail(await adminFetch<AdminOrderDetail>(`/api/admin/orders/${id}`));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {s ? (
          <>
            <StatCard label="Revenue" value={formatMoney(s.revenue)} hint="Paid + fulfilled" icon={Wallet} tone="success" />
            <StatCard label="Today" value={s.today} hint="Orders placed (UTC)" icon={CalendarClock} />
            <StatCard label="Pending" value={s.counts.PENDING ?? 0} hint="Awaiting payment" icon={Clock} tone="warning" />
            <StatCard label="Fulfilled" value={s.counts.FULFILLED ?? 0} hint={`of ${s.all} total`} icon={CheckCircle2} tone="success" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="space-y-3 border-b p-3 sm:p-4">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {STATUS.map((o) => {
              const active = status === o.v;
              const n = count(o.v);
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => {
                    setStatus(o.v);
                    setPage(1);
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {o.v !== "all" ? <span className={cn("size-1.5 rounded-full", DOT[o.v])} /> : null}
                  {o.label}
                  {n !== null ? (
                    <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-primary/20" : "bg-muted")}>{n}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBox
              value={q}
              onChange={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder="Order ID, buyer, product…"
              className="sm:flex-1"
            />
            <Select
              value={audience}
              onValueChange={(v) => {
                setAudience(v as AdminOrderAudience);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buyers</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="resellers">Sellers</SelectItem>
                <SelectItem value="admins">Admins</SelectItem>
                <SelectItem value="guests">Guests</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ShoppingBag} title="No orders" hint="Nothing matches these filters." />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className={cn("hidden md:block", list.loading && "opacity-60 transition-opacity")}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Order</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items.map((o) => (
                    <TableRow key={o.id} className="group cursor-pointer" onClick={() => open(o.id)}>
                      <TableCell className="pl-4">
                        <p className="font-mono text-xs font-semibold">#{shortId(o.id)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(o.createdAt, true)}</p>
                      </TableCell>
                      <TableCell className="max-w-56">
                        <Buyer o={o} />
                      </TableCell>
                      <TableCell className="max-w-56">
                        <p className="truncate text-sm">{o.productSummary}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell className="text-right font-display font-semibold tabular-nums">{formatMoney(o.total)}</TableCell>
                      <TableCell className="pr-4">
                        {opening === o.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className={cn("divide-y md:hidden", list.loading && "opacity-60 transition-opacity")}>
              {list.items.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => open(o.id)} className="block w-full space-y-2.5 p-4 text-left active:bg-accent">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold">#{shortId(o.id)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <Buyer o={o} />
                    <p className="truncate text-sm text-muted-foreground">{o.productSummary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{formatDate(o.createdAt, true)}</span>
                      <span className="font-display font-semibold tabular-nums">
                        {opening === o.id ? <Loader2 className="size-4 animate-spin" /> : formatMoney(o.total)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="border-t px-4 pb-3">
          <Pager page={page} pageSize={LIMIT} total={list.total} onPage={setPage} loading={list.loading} />
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 pr-6">
                  <DialogTitle className="font-mono">#{shortId(detail.id)}</DialogTitle>
                  <StatusBadge status={detail.status} />
                </div>
                <DialogDescription>{formatDate(detail.createdAt, true)}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
                <Avatar name={detail.user?.username ?? "G"} guest={!detail.user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {detail.user ? `@${detail.user.username}` : "Guest checkout"}
                    {detail.user ? <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">{detail.user.role.toLowerCase()}</span> : null}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{detail.buyerEmail}</span>
                  </p>
                  {detail.buyerDiscord ? (
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <MessageCircle className="size-3 shrink-0" />
                      <span className="truncate">{detail.buyerDiscord}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {detail.promoCode || detail.flashSale ? (
                <div className="flex flex-wrap gap-2">
                  {detail.promoCode ? (
                    <Badge variant="default">
                      <Tag /> Promo {detail.promoCode.code}
                    </Badge>
                  ) : null}
                  {detail.flashSale ? (
                    <Badge variant="highlight">
                      <Zap /> {detail.flashSale.title}
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2.5">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Package className="size-3.5" /> {detail.items.length} {detail.items.length === 1 ? "item" : "items"}
                </p>
                {detail.items.map((it) => (
                  <div key={it.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{it.productTitle}</p>
                        <p className="text-xs text-muted-foreground">{it.durationLabel}</p>
                      </div>
                      <span className="font-display text-sm font-semibold tabular-nums">{formatMoney(it.unitPrice)}</span>
                    </div>
                    {it.key ? (
                      <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
                        <KeyRound className="size-3.5 shrink-0 text-primary" />
                        <code className="min-w-0 flex-1 truncate font-mono text-xs">{it.key.code}</code>
                        <Badge variant="muted">{it.key.status}</Badge>
                        <CopyKey value={it.key.code} />
                      </div>
                    ) : (
                      <p className="mt-2.5 rounded-lg border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground">No key attached.</p>
                    )}
                    {it.androidId ? <p className="mt-2 text-xs text-muted-foreground">Android ID: <span className="font-mono">{it.androidId}</span></p> : null}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
                <span className="text-sm font-medium text-muted-foreground">Total paid</span>
                <span className="font-display text-2xl font-bold tabular-nums">{formatMoney(detail.total)}</span>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
