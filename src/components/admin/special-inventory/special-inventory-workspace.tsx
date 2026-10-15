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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/currencies";
import type {
  SpecialInventoryListPayload,
  SpecialStockSettlementRow,
  SpecialStockSettlementsPayload,
} from "@/lib/special-inventory";
import { formatSettlementDate } from "@/types/developer-settlements";
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Layers,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProductApi = {
  id: string;
  title: string;
  durations: { id: string; label: string; version?: string }[];
};

function formatDateSafe(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm} UTC`;
  } catch {
    return isoString ?? "—";
  }
}

export function SpecialInventoryWorkspace() {
  const [activeTab, setActiveTab] = useState<"settlements" | "inventory">("settlements");

  // Inventory tab states
  const [invPage, setInvPage] = useState(1);
  const [invSearch, setInvSearch] = useState("");
  const deferredInvSearch = useDeferredValue(invSearch.trim());
  const [statusFilter, setStatusFilter] = useState<"all" | "AVAILABLE" | "SOLD">("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  const [importOpen, setImportOpen] = useState(false);
  const [importDurationId, setImportDurationId] = useState("");
  const [importBatchTag, setImportBatchTag] = useState("SPECIAL_BATCH");
  const [importRawKeys, setImportRawKeys] = useState("");
  const [importing, setImporting] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Settlements tab states
  const [settlePage, setSettlePage] = useState(1);
  const [settleSearch, setSettleSearch] = useState("");
  const deferredSettleSearch = useDeferredValue(settleSearch.trim());
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [singleDay, setSingleDay] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch catalog for import duration picker
  const { data: catalogProducts } = useAdminFetch<ProductApi[]>("/api/admin/products");

  // Fetch inventory data
  const invQuery = new URLSearchParams({
    page: String(invPage),
    limit: "30",
    ...(deferredInvSearch ? { q: deferredInvSearch } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(productFilter !== "all" ? { productId: productFilter } : {}),
  });

  const {
    data: invData,
    loading: invLoading,
    reload: reloadInventory,
  } = useAdminFetch<SpecialInventoryListPayload>(
    `/api/admin/special-inventory?${invQuery.toString()}`,
  );

  // Fetch settlements data
  const settleQuery = new URLSearchParams({
    page: String(settlePage),
    ...(deferredSettleSearch ? { q: deferredSettleSearch } : {}),
  });

  const {
    data: settleData,
    loading: settleLoading,
    reload: reloadSettlements,
  } = useAdminFetch<SpecialStockSettlementsPayload>(
    `/api/admin/special-inventory/settlements?${settleQuery.toString()}`,
  );

  const summary = invData?.summary;
  const keys = invData?.keys ?? [];

  // Payout calculation helpers
  const selectedPendingRows = useMemo(() => {
    if (!settleData) return [];
    return settleData.rows.filter(
      (r) => selectedDays.has(r.dateKey) && r.status === "PENDING",
    );
  }, [settleData, selectedDays]);

  const selectedDevShare = selectedPendingRows.reduce(
    (s, r) => s + r.developerShare,
    0,
  );
  const selectedOwnerShare = selectedPendingRows.reduce(
    (s, r) => s + r.ownerShare,
    0,
  );

  const confirmKeys = singleDay
    ? [singleDay]
    : selectedPendingRows.map((r) => r.dateKey);

  const targetSingleRow = singleDay
    ? settleData?.rows.find((r) => r.dateKey === singleDay)
    : null;

  const confirmDevAmount = targetSingleRow
    ? targetSingleRow.developerShare
    : selectedDevShare;

  const confirmOwnerAmount = targetSingleRow
    ? targetSingleRow.ownerShare
    : selectedOwnerShare;

  function toggleDay(dateKey: string, checked: boolean) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (checked) next.add(dateKey);
      else next.delete(dateKey);
      return next;
    });
  }

  function toggleAllPendingDays(checked: boolean) {
    if (!settleData) return;
    setSelectedDays((prev) => {
      const next = new Set(prev);
      for (const row of settleData.rows) {
        if (row.status !== "PENDING") continue;
        if (checked) next.add(row.dateKey);
        else next.delete(row.dateKey);
      }
      return next;
    });
  }

  async function handleMarkPaidSubmit() {
    if (!confirmKeys.length) return;
    setSettling(true);
    const result = await adminMutate("/api/admin/special-inventory/settlements", {
      method: "POST",
      body: JSON.stringify({ dateKeys: confirmKeys }),
    });
    setSettling(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(
      confirmKeys.length === 1
        ? "Special stock settlement day marked as paid"
        : `${confirmKeys.length} special settlement days marked as paid`,
    );
    setConfirmOpen(false);
    setSingleDay(null);
    setSelectedDays(new Set());
    void reloadSettlements();
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(id);
      toast.success("Key copied to clipboard");
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch {
      toast.error("Failed to copy key");
    }
  }

  async function handleImportSubmit() {
    if (!importDurationId) {
      toast.error("Please select a duration / plan");
      return;
    }
    if (!importRawKeys.trim()) {
      toast.error("Please paste at least one key");
      return;
    }

    setImporting(true);
    try {
      const res = await adminMutate("/api/admin/special-inventory", {
        method: "POST",
        body: JSON.stringify({
          durationId: importDurationId,
          rawKeys: importRawKeys,
          batchTag: importBatchTag.trim() || "SPECIAL_BATCH",
        }),
      });

      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      const info = res.data as { added: number; skipped: number };
      toast.success(
        `Imported ${info?.added ?? 0} keys (${info?.skipped ?? 0} skipped duplicates)`,
      );
      setImportOpen(false);
      setImportRawKeys("");
      reloadInventory();
      reloadSettlements();
    } catch (err: any) {
      toast.error(err.message || "Failed to import keys");
    } finally {
      setImporting(false);
    }
  }

  const pendingOnSettlePage =
    settleData?.rows.filter((r) => r.status === "PENDING").length ?? 0;
  const allPendingSelected =
    pendingOnSettlePage > 0 &&
    !!settleData &&
    settleData.rows
      .filter((r) => r.status === "PENDING")
      .every((r) => selectedDays.has(r.dateKey));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Special Stock Inventory & 50/50 Settlements"
        description="Isolated special batch stock management with automated 50-50 Developer & Owner profit split and daily settlement payout tracking."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "settlements" && selectedPendingRows.length > 0 && (
              <Button
                onClick={() => {
                  setSingleDay(null);
                  setConfirmOpen(true);
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-600/20"
              >
                <Banknote className="h-4 w-4" />
                <span>Mark Paid ({selectedPendingRows.length} days · {formatMoney(selectedDevShare)})</span>
              </Button>
            )}
            <Button
              onClick={() => setImportOpen(true)}
              className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              <span>Import Special Keys</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        <KpiCard
          label="Unsold Stock"
          value={String(summary?.availableKeys ?? 0)}
          hint="Ready for store purchase"
          tone="success"
        />
        <KpiCard
          label="Sold Keys"
          value={String(summary?.soldKeys ?? 0)}
          hint="Delivered to buyers"
          tone="muted"
        />
        <KpiCard
          label="Total Realized Revenue"
          value={formatMoney(summary?.totalRealizedRevenue ?? 0)}
          hint={`Potential: ${formatMoney(summary?.potentialRevenue ?? 0)}`}
          tone="success"
        />
        <KpiCard
          label="Pending 50% Dev Share"
          value={formatMoney(settleData?.pendingShare ?? 0)}
          hint={`${settleData?.pendingDays ?? 0} pending payout days`}
          tone="default"
        />
        <KpiCard
          label="Settled 50% Dev Share"
          value={formatMoney(settleData?.paidShare ?? 0)}
          hint={`${settleData?.paidDays ?? 0} days marked paid`}
          tone="success"
        />
      </div>

      {/* Navigation Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "settlements" | "inventory")}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/60 p-1 border border-border/40">
          <TabsTrigger value="settlements" className="gap-2 text-xs sm:text-sm font-semibold">
            <Receipt className="h-4 w-4" />
            <span>50/50 Daily Settlements</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2 text-xs sm:text-sm font-semibold">
            <Layers className="h-4 w-4" />
            <span>Stock Inventory & Matrix</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================= */}
        {/* TAB 1: 50/50 DAILY SETTLEMENTS */}
        {/* ========================================================= */}
        <TabsContent value="settlements" className="space-y-4">
          {/* Info Banner */}
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">
                    50% Developer & 50% Owner Profit Share Model
                  </p>
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px]">
                    50 / 50 Active
                  </Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Special stock sales are live-calculated each day. <strong>50% of gross profit</strong> is allocated to Developer Settlement and <strong>50%</strong> is retained as Owner Profit. Payouts can be settled and marked as paid directly below.
                </p>
              </div>
            </div>
          </div>

          {/* Settlements Filter Toolbar */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-md p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search date (YYYY-MM-DD), status, amount..."
                  value={settleSearch}
                  onChange={(e) => {
                    setSettleSearch(e.target.value);
                    setSettlePage(1);
                  }}
                  className="pl-9 h-9 bg-background/50 text-xs sm:text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                {selectedPendingRows.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSingleDay(null);
                      setConfirmOpen(true);
                    }}
                    className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    <span>Mark Selected Paid ({selectedPendingRows.length})</span>
                  </Button>
                )}
                <div className="rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground border border-border/40 font-mono">
                  Share Rate: <strong className="text-foreground">{Math.round((settleData?.shareRate ?? 0.5) * 100)}% Dev / {100 - Math.round((settleData?.shareRate ?? 0.5) * 100)}% Owner</strong>
                </div>
              </div>
            </div>
          </Card>

          {/* Settlements Table */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-md overflow-hidden">
            {settleLoading || !settleData ? (
              <div className="p-6">
                <AdminListSkeleton rows={8} />
              </div>
            ) : settleData.rows.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No settlement records found"
                  description="No daily special stock sales recorded yet in this time window."
                />
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allPendingSelected}
                            onCheckedChange={(c) => toggleAllPendingDays(!!c)}
                            aria-label="Select all pending days"
                          />
                        </TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="text-center font-semibold">Keys Sold</TableHead>
                        <TableHead className="text-right font-semibold">Gross Sales</TableHead>
                        <TableHead className="text-right font-semibold">Cost</TableHead>
                        <TableHead className="text-right font-semibold">Gross Profit</TableHead>
                        <TableHead className="text-right font-semibold text-primary">Dev Share (50%)</TableHead>
                        <TableHead className="text-right font-semibold text-accent">Owner Share (50%)</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Settled At</TableHead>
                        <TableHead className="text-right font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settleData.rows.map((row) => (
                        <TableRow
                          key={row.dateKey}
                          className="border-border/30 hover:bg-muted/30 transition-colors"
                        >
                          {/* Selection Checkbox */}
                          <TableCell>
                            {row.status === "PENDING" && row.developerShare > 0 ? (
                              <Checkbox
                                checked={selectedDays.has(row.dateKey)}
                                onCheckedChange={(c) => toggleDay(row.dateKey, !!c)}
                                aria-label={`Select ${row.dateKey}`}
                              />
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </TableCell>

                          {/* Date */}
                          <TableCell className="font-mono text-xs font-semibold text-foreground">
                            <div>
                              <span>{formatSettlementDate(row.dateKey)}</span>
                              <div className="text-[10px] text-muted-foreground">{row.dateKey}</div>
                            </div>
                          </TableCell>

                          {/* Keys Sold / Orders */}
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                row.keysSold > 0
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold text-xs"
                                  : "text-muted-foreground text-xs"
                              }
                            >
                              {row.keysSold} keys
                            </Badge>
                          </TableCell>

                          {/* Gross Sales */}
                          <TableCell className="text-right font-mono text-xs">
                            {formatMoney(row.sales)}
                          </TableCell>

                          {/* Cost */}
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {formatMoney(row.cost)}
                          </TableCell>

                          {/* Gross Profit */}
                          <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                            {formatMoney(row.grossProfit)}
                          </TableCell>

                          {/* Developer Share (50%) */}
                          <TableCell className="text-right font-mono text-xs font-bold text-primary">
                            {formatMoney(row.developerShare)}
                          </TableCell>

                          {/* Owner Share (50%) */}
                          <TableCell className="text-right font-mono text-xs font-bold text-emerald-400">
                            {formatMoney(row.ownerShare)}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            {row.status === "PAID" ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold text-[11px] gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                PAID
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-amber-500/30 bg-amber-500/10 text-amber-400 font-semibold text-[11px]"
                              >
                                PENDING
                              </Badge>
                            )}
                          </TableCell>

                          {/* Paid At */}
                          <TableCell className="text-[11px] text-muted-foreground font-mono">
                            {mounted ? formatDateSafe(row.paidAt) : "—"}
                          </TableCell>

                          {/* Single Action */}
                          <TableCell className="text-right">
                            {row.status === "PENDING" && row.developerShare > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSingleDay(row.dateKey);
                                  setConfirmOpen(true);
                                }}
                                className="h-7 text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              >
                                Mark Paid
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">Settled</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Settlements Pagination Footer */}
                <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 text-xs text-muted-foreground">
                  <span>
                    Showing {settleData.rows.length} of {settleData.totalRows} days (Page {settleData.page} of {settleData.pageCount})
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={settlePage <= 1}
                      onClick={() => setSettlePage((p) => Math.max(1, p - 1))}
                      className="h-8 text-xs"
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={settlePage >= settleData.pageCount}
                      onClick={() => setSettlePage((p) => p + 1)}
                      className="h-8 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 2: STOCK INVENTORY & MATRIX */}
        {/* ========================================================= */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Product & Duration Matrix */}
          {summary?.productGroups && summary.productGroups.length > 0 && (
            <Card className="border-border/50 bg-card/40 backdrop-blur-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-semibold">
                    Special Batch Stock Matrix by Product
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Live unsold vs sold breakdown across all durations in this special batch
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead className="font-semibold">Product</TableHead>
                        <TableHead className="font-semibold">Duration / Plan</TableHead>
                        <TableHead className="text-center font-semibold">Available</TableHead>
                        <TableHead className="text-center font-semibold">Sold</TableHead>
                        <TableHead className="text-center font-semibold">Total</TableHead>
                        <TableHead className="text-right font-semibold">Realized Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.productGroups.map((grp) => (
                        <TableRow
                          key={`${grp.productId}-${grp.durationId}`}
                          className="border-border/30 hover:bg-muted/30"
                        >
                          <TableCell className="font-medium text-foreground">
                            {grp.productTitle}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs sm:text-sm">
                            {grp.durationLabel}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                grp.available > 0
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold"
                                  : "text-muted-foreground"
                              }
                            >
                              {grp.available}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                grp.sold > 0
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400 font-semibold"
                                  : "text-muted-foreground"
                              }
                            >
                              {grp.sold}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs font-semibold text-muted-foreground">
                            {grp.total}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-emerald-400">
                            {formatMoney(grp.realizedRevenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filter Toolbar */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-md p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search key code, buyer username, email..."
                  value={invSearch}
                  onChange={(e) => {
                    setInvSearch(e.target.value);
                    setInvPage(1);
                  }}
                  className="pl-9 h-9 bg-background/50 text-xs sm:text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter Chips */}
                <div className="flex rounded-lg bg-muted/40 p-1 border border-border/40">
                  <Button
                    size="sm"
                    variant={statusFilter === "all" ? "default" : "ghost"}
                    className="h-7 text-xs px-2.5"
                    onClick={() => {
                      setStatusFilter("all");
                      setInvPage(1);
                    }}
                  >
                    All ({summary?.totalKeys ?? 0})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "AVAILABLE" ? "default" : "ghost"}
                    className="h-7 text-xs px-2.5"
                    onClick={() => {
                      setStatusFilter("AVAILABLE");
                      setInvPage(1);
                    }}
                  >
                    Available ({summary?.availableKeys ?? 0})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "SOLD" ? "default" : "ghost"}
                    className="h-7 text-xs px-2.5"
                    onClick={() => {
                      setStatusFilter("SOLD");
                      setInvPage(1);
                    }}
                  >
                    Sold ({summary?.soldKeys ?? 0})
                  </Button>
                </div>

                {/* Product Filter */}
                {summary?.productGroups && summary.productGroups.length > 0 && (
                  <Select
                    value={productFilter}
                    onValueChange={(val) => {
                      setProductFilter(val);
                      setInvPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[180px] text-xs bg-background/50">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {Array.from(
                        new Set(summary.productGroups.map((p) => p.productId)),
                      ).map((pId) => {
                        const match = summary.productGroups.find((p) => p.productId === pId);
                        return (
                          <SelectItem key={pId} value={pId}>
                            {match?.productTitle ?? pId}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </Card>

          {/* Keys Table */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-md overflow-hidden">
            {invLoading ? (
              <div className="p-6">
                <AdminListSkeleton rows={8} />
              </div>
            ) : keys.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No special keys found"
                  description="No keys match your current filter or search criteria."
                />
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead className="font-semibold">Key Code</TableHead>
                        <TableHead className="font-semibold">Product & Plan</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Buyer / Delivery</TableHead>
                        <TableHead className="text-right font-semibold">Sale Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map((k) => (
                        <TableRow
                          key={k.id}
                          className="border-border/30 hover:bg-muted/30 transition-colors"
                        >
                          {/* Key Code */}
                          <TableCell className="font-mono text-xs sm:text-sm font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[200px] sm:max-w-[300px] select-all">
                                {k.code}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                                onClick={() => copyToClipboard(k.code, k.id)}
                              >
                                {copiedKeyId === k.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>

                          {/* Product & Duration */}
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-xs sm:text-sm text-foreground">
                                {k.productTitle}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {k.durationLabel}
                              </span>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            {k.status === "AVAILABLE" ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold text-[11px]"
                              >
                                AVAILABLE
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-amber-500/30 bg-amber-500/10 text-amber-400 font-semibold text-[11px]"
                              >
                                SOLD
                              </Badge>
                            )}
                          </TableCell>

                          {/* Buyer / Order Info */}
                          <TableCell className="text-xs">
                            {k.status === "SOLD" ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {k.buyerName || k.buyerEmail || "Customer"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {mounted ? formatDateSafe(k.soldAt) : "—"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">
                                In Stock
                              </span>
                            )}
                          </TableCell>

                          {/* Sale Price */}
                          <TableCell className="text-right font-mono font-semibold">
                            {k.salePrice !== null ? (
                              <span className="text-emerald-400 text-xs sm:text-sm">
                                {formatMoney(k.salePrice)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Inventory Pagination */}
                <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 text-xs text-muted-foreground">
                  <span>
                    Showing {keys.length} of {invData?.total ?? 0} keys (Page {invPage})
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={invPage <= 1}
                      onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                      className="h-8 text-xs"
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!invData?.hasMore}
                      onClick={() => setInvPage((p) => p + 1)}
                      className="h-8 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Settlement Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="flex max-h-[min(92dvh,560px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/40 bg-muted/20 px-6 py-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Banknote className="h-5 w-5" />
              <DialogTitle>Confirm Special Stock Settlement</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Mark {confirmKeys.length} special stock settlement {confirmKeys.length === 1 ? "day" : "days"} as paid. This ledger update does not touch customer wallets or order rows.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Selected Day(s):</span>
                <span className="font-semibold text-foreground font-mono">{confirmKeys.join(", ")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Developer Payout (50%):</span>
                <span className="font-bold text-primary font-mono text-base">{formatMoney(confirmDevAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Owner Retained (50%):</span>
                <span className="font-bold text-emerald-400 font-mono text-base">{formatMoney(confirmOwnerAmount)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Once marked as paid, the selected date records will be finalized with status <strong className="text-foreground">PAID</strong> and recorded with your admin ID snapshot.
            </p>
          </div>

          <DialogFooter className="border-t border-border/40 bg-muted/10 px-6 py-3 flex items-center justify-end gap-2 mx-0 mb-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={settling}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleMarkPaidSubmit}
              disabled={settling}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            >
              {settling ? "Marking Paid..." : "Confirm & Mark Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Special Keys Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border/40 bg-muted/20 px-6 py-4">
            <div className="flex items-center gap-2 text-primary">
              <Layers className="h-5 w-5" />
              <DialogTitle>Import Special Inventory Keys</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Keys imported here will follow the 50/50 profit split model between Developer and Owner.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm">
            {/* Duration Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Product & Duration</Label>
              <Select
                value={importDurationId}
                onValueChange={setImportDurationId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select product and plan..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {(catalogProducts ?? []).map((p) =>
                    (p.durations ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {p.title} — {d.version ? `${d.version} · ` : ""}
                        {d.label}
                      </SelectItem>
                    )),
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Tag */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Batch Tag / Label</Label>
              <Input
                placeholder="e.g. RES_BOT_BATCH_2"
                value={importBatchTag}
                onChange={(e) => setImportBatchTag(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Keys Textarea */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">License Keys (One per line)</Label>
              <Textarea
                placeholder="Paste keys here (one key per line)..."
                value={importRawKeys}
                onChange={(e) => setImportRawKeys(e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 bg-muted/10 px-6 py-3 flex items-center justify-end gap-2 mx-0 mb-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImportSubmit}
              disabled={importing}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {importing ? "Importing..." : "Upload Keys"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
