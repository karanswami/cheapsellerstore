"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgeDollarSign, Gem } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, Pager, SearchBox, StatCard, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminQuery, useDebounced } from "@/components/admin/kit";
import { useCatalog } from "@/components/admin/pickers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/currencies";
import type { DeveloperSettlementsPayload } from "@/lib/developer-settlements";
import type { SpecialInventoryListPayload, SpecialStockSettlementsPayload } from "@/lib/special-inventory";

export function AdminFinanceClient() {
  return (
    <Tabs defaultValue="developer" className="space-y-4">
      <TabsList>
        <TabsTrigger value="developer">
          <BadgeDollarSign className="size-4" /> Developer share
        </TabsTrigger>
        <TabsTrigger value="special">
          <Gem className="size-4" /> Special stock
        </TabsTrigger>
      </TabsList>
      <TabsContent value="developer">
        <SettlementPanel kind="developer" />
      </TabsContent>
      <TabsContent value="special">
        <SpecialStock />
      </TabsContent>
    </Tabs>
  );
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
type Payload = DeveloperSettlementsPayload | SpecialStockSettlementsPayload;

function SettlementPanel({ kind }: { kind: "developer" | "special" }) {
  const endpoint = kind === "developer" ? "/api/admin/developer-settlements" : "/api/admin/special-inventory/settlements";
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

/* ───────────────────────── Special stock ───────────────────────── */

function SpecialStock() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const { data, loading, reload } = useAdminQuery<SpecialInventoryListPayload>(`/api/admin/special-inventory?page=${page}&limit=20&status=${status}&q=${encodeURIComponent(dq)}`);
  const [importing, setImporting] = useState(false);
  const s = data?.summary;

  return (
    <div className="space-y-6">
      {s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Special keys" value={s.totalKeys} hint={`${s.availableKeys} available`} />
          <StatCard label="Sold" value={s.soldKeys} />
          <StatCard label="Realized" value={formatMoney(s.totalRealizedRevenue)} tone="success" />
          <StatCard label="Potential" value={formatMoney(s.potentialRevenue)} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Chips value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ v: "all", label: "All" }, { v: "AVAILABLE", label: "Available" }, { v: "SOLD", label: "Sold" }]} />
        <div className="flex gap-2">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Key, product, buyer…" />
          <Button onClick={() => setImporting(true)}>Import keys</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : (data?.keys.length ?? 0) === 0 ? (
          <div className="p-6">
            <EmptyState icon={Gem} title="No special keys" hint="Special inventory is excluded from developer settlements." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="max-w-48 truncate font-mono text-xs">{k.code}</TableCell>
                  <TableCell className="text-sm">
                    {k.productTitle} <span className="text-muted-foreground">· {k.durationLabel}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={k.status} />
                  </TableCell>
                  <TableCell className="text-sm">{k.buyerName ?? k.buyerEmail ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">{k.salePrice != null ? formatMoney(k.salePrice) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {data ? <Pager page={page} pageSize={20} total={data.total} onPage={setPage} loading={loading} /> : null}

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold">Special stock settlements</h3>
        <SettlementPanel kind="special" />
      </div>

      <Dialog open={importing} onOpenChange={setImporting}>
        <DialogContent className="max-w-lg">
          {importing ? (
            <ImportSpecial
              onDone={() => {
                setImporting(false);
                reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImportSpecial({ onDone }: { onDone: () => void }) {
  const catalog = useCatalog();
  const [productId, setProductId] = useState("");
  const [durationId, setDurationId] = useState("");
  const [raw, setRaw] = useState("");
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const product = catalog.find((p) => p.id === productId);
  const count = raw.split("\n").filter((l) => l.trim()).length;

  async function run() {
    setBusy(true);
    try {
      const r = await adminFetch<{ added: number; skipped: number }>("/api/admin/special-inventory", { method: "POST", json: { durationId, rawKeys: raw, batchTag: tag.trim() || undefined } });
      toast.success(`Added ${r.added}, skipped ${r.skipped}.`);
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Import special keys</DialogTitle>
        <DialogDescription>These keys are sold from an isolated pool and are not part of developer settlements.</DialogDescription>
      </DialogHeader>
      <Field label="Product">
        <Select value={productId} onValueChange={(v) => { setProductId(v); setDurationId(""); }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a product" />
          </SelectTrigger>
          <SelectContent>
            {catalog.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Duration">
        <Select value={durationId} onValueChange={setDurationId} disabled={!product}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a duration" />
          </SelectTrigger>
          <SelectContent>
            {(product?.durations ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Batch tag (optional)">
        <Input value={tag} onChange={(e) => setTag(e.target.value)} />
      </Field>
      <Field label="Keys" hint={`One per line. ${count} detected.`}>
        <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} className="font-mono text-xs" />
      </Field>
      <DialogFooter>
        <SubmitButton busy={busy} disabled={!durationId || count === 0} onClick={run}>
          Import {count || ""}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
