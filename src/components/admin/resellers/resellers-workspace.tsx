"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
} from "@/components/admin/admin-page-header";
import {
  ResellerReviewDialog,
  statusBadgeClass,
  statusLabel,
} from "@/components/admin/resellers/reseller-review-dialog";
import type {
  ResellerRequestRow,
  ResellerRequestStatus,
} from "@/components/admin/resellers/reseller-types";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { AdminBulkSellersDialog } from "@/components/admin/sellers/admin-bulk-sellers-dialog";
import {
  ChevronRight,
  Clock3,
  Search,
  Store,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type StatusFilter = "all" | ResellerRequestStatus;
type BalanceFilter = "all" | "empty" | "low" | "mid" | "high";

const PAGE_SIZE = 10;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
];

const BALANCE_FILTERS: { id: BalanceFilter; label: string }[] = [
  { id: "all", label: "Any balance" },
  { id: "empty", label: "$0" },
  { id: "low", label: "Under $10" },
  { id: "mid", label: "$10–$100" },
  { id: "high", label: "$100+" },
];

const LOW_MAX = usdToMicrocents(10);
const MID_MAX = usdToMicrocents(100);

function matchesBalance(balance: number, filter: BalanceFilter) {
  switch (filter) {
    case "empty":
      return balance <= 0;
    case "low":
      return balance > 0 && balance < LOW_MAX;
    case "mid":
      return balance >= LOW_MAX && balance < MID_MAX;
    case "high":
      return balance >= MID_MAX;
    default:
      return true;
  }
}

function pageItems(
  pageIndex: number,
  pageCount: number,
): (number | "ellipsis")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }
  const items: (number | "ellipsis")[] = [0];
  const start = Math.max(1, pageIndex - 1);
  const end = Math.min(pageCount - 2, pageIndex + 1);
  if (start > 1) items.push("ellipsis");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pageCount - 2) items.push("ellipsis");
  items.push(pageCount - 1);
  return items;
}

function initials(name: string, username: string) {
  const source = name.trim() || username.trim();
  return (source[0] ?? "?").toUpperCase();
}

function appliedShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ResellersWorkspace() {
  const { data, loading, reload } = useAdminFetch<{
    requests: ResellerRequestRow[];
  }>("/api/admin/resellers");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<ResellerRequestRow | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const requests = data?.requests ?? [];

  const stats = useMemo(() => {
    const pendingCount = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const wallets = requests.reduce(
      (sum, r) => sum + (r.user.walletBalance ?? 0),
      0,
    );
    return { pendingCount, approved, wallets };
  }, [requests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!matchesBalance(r.user.walletBalance ?? 0, balanceFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.user.username.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.telegram.toLowerCase().includes(q) ||
        r.sellingPlatform.toLowerCase().includes(q)
      );
    });
  }, [requests, query, statusFilter, balanceFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageIndex = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    pageIndex * PAGE_SIZE,
    pageIndex * PAGE_SIZE + PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [query, statusFilter, balanceFilter]);

  async function act(
    id: string,
    action: "approve" | "reject",
    adminNote?: string,
  ) {
    setPending(true);
    try {
      const result = await adminMutate(`/api/admin/resellers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, adminNote }),
      });
      if (!result.ok) {
        toast.error(result.message);
        return false;
      }
      toast.success(
        action === "approve" ? "Reseller approved" : "Application rejected",
      );
      void reload();
      return true;
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Reseller desk
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reseller applications
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Review Become a Seller requests, manage active accounts, or apply
            one-click updates to all sellers.
          </p>
        </div>

        <Button
          onClick={() => setBulkOpen(true)}
          className="w-full sm:w-auto gap-2 shadow-sm shadow-primary/25"
        >
          <Zap className="size-4" />
          One-Click — All Sellers
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card size="sm" className="py-2.5">
          <CardHeader className="gap-0 px-3 py-0">
            <CardDescription className="flex items-center gap-1 text-[10px] uppercase">
              <Clock3 className="size-3" />
              Pending
            </CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">
              {stats.pendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="py-2.5">
          <CardHeader className="gap-0 px-3 py-0">
            <CardDescription className="flex items-center gap-1 text-[10px] uppercase">
              <Store className="size-3" />
              Approved
            </CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">
              {stats.approved}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="py-2.5">
          <CardHeader className="gap-0 px-3 py-0">
            <CardDescription className="flex items-center gap-1 text-[10px] uppercase">
              <Wallet className="size-3" />
              Wallets
            </CardDescription>
            <CardTitle className="truncate text-base tabular-nums sm:text-xl">
              {formatMoney(stats.wallets)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, @user, email, country…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 pl-9"
          />
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={statusFilter === f.id ? "default" : "outline"}
              className="h-8 shrink-0 rounded-full px-3 text-xs"
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BALANCE_FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={balanceFilter === f.id ? "secondary" : "outline"}
              className="h-8 shrink-0 rounded-full px-3 text-xs"
              onClick={() => setBalanceFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <AdminListSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <AdminEmptyState message="No reseller applications match your filters." />
      ) : (
        <>
          <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {pageRows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpen(r)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 sm:px-4"
                >
                  <Avatar size="default" className="bg-primary/15">
                    <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                      {initials(r.fullName, r.user.username)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {r.fullName}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0",
                          statusBadgeClass(r.status),
                        )}
                      >
                        {statusLabel(r.status)}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      @{r.user.username} · {r.user.email}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.country ? (
                        <Badge variant="outline" className="text-[10px]">
                          {r.country}
                        </Badge>
                      ) : null}
                      {r.followerCount ? (
                        <Badge variant="outline" className="text-[10px]">
                          {r.followerCount} reach
                        </Badge>
                      ) : null}
                      {r.user.banned ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Banned
                        </Badge>
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">
                        {appliedShort(r.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-sm font-semibold tabular-nums text-success">
                      {formatMoney(r.user.walletBalance)}
                    </p>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            {filtered.length} application{filtered.length === 1 ? "" : "s"}
            {pageCount > 1
              ? ` · page ${pageIndex + 1} of ${pageCount}`
              : null}
          </p>

          {pageCount > 1 ? (
            <Pagination className="mx-0 w-auto justify-center sm:justify-start">
              <PaginationContent>
                <PaginationItem>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pageIndex <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                </PaginationItem>
                {pageItems(pageIndex, pageCount).map((item, idx) =>
                  item === "ellipsis" ? (
                    <PaginationItem key={`e-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <Button
                        type="button"
                        size="icon"
                        variant={pageIndex === item ? "outline" : "ghost"}
                        onClick={() => setPage(item)}
                        aria-current={
                          pageIndex === item ? "page" : undefined
                        }
                      >
                        {item + 1}
                      </Button>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pageIndex >= pageCount - 1}
                    onClick={() =>
                      setPage((p) => Math.min(pageCount - 1, p + 1))
                    }
                  >
                    Next
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </>
      )}

      <ResellerReviewDialog
        request={open}
        pending={pending}
        onOpenChange={(o) => {
          if (!o) setOpen(null);
        }}
        onApprove={async (adminNote) => {
          if (!open) return false;
          return act(open.id, "approve", adminNote);
        }}
        onReject={async (adminNote) => {
          if (!open) return false;
          return act(open.id, "reject", adminNote);
        }}
      />

      <AdminBulkSellersDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSuccess={() => void reload()}
      />
    </main>
  );
}
