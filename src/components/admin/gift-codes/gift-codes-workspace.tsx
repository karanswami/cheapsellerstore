"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import {
  AdminGiftCodeDialog,
  emptyGiftCodeForm,
  type GiftCodeFormState,
} from "@/components/admin/gift-codes/admin-gift-code-dialog";
import { adminMutate } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";
import { localDateTimeToIso } from "@/lib/flash-sale-format";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronRight,
  Copy,
  Gift,
  Plus,
  Search,
  Ticket,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type GiftUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
};

type GiftCodeRow = {
  id: string;
  code: string;
  amount: number;
  status: "AVAILABLE" | "CLAIMED" | "DISABLED";
  note: string | null;
  assignedUser: GiftUser | null;
  claimedBy: GiftUser | null;
  claimedAt: string | null;
  transactionId: string | null;
  createdBy: { id: string; username: string; name: string };
  expiresAt: string | null;
  createdAt: string;
};

type StatusFilter = "all" | "AVAILABLE" | "CLAIMED" | "DISABLED";

function statusTone(status: GiftCodeRow["status"]) {
  if (status === "AVAILABLE") return "success" as const;
  if (status === "CLAIMED") return "info" as const;
  return "secondary" as const;
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GiftCodesWorkspace() {
  const [rows, setRows] = useState<GiftCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pendingLoad, setPendingLoad] = useState(false);
  const [storeEnabled, setStoreEnabled] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<GiftCodeFormState>(emptyGiftCodeForm);
  const [creating, setCreating] = useState(false);

  const [detail, setDetail] = useState<GiftCodeRow | null>(null);
  const [disabling, setDisabling] = useState(false);

  const load = useCallback(
    async (opts?: { page?: number; append?: boolean; q?: string; status?: StatusFilter }) => {
      const nextPage = opts?.page ?? 1;
      const q = opts?.q ?? query;
      const status = opts?.status ?? statusFilter;
      setPendingLoad(true);
      if (!opts?.append) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: "20",
          status,
        });
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/admin/gift-codes?${params}`, {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: {
            giftCodes: GiftCodeRow[];
            hasMore: boolean;
            total: number;
            page: number;
          };
          error?: { message: string };
        };
        if (!res.ok) {
          toast.error(json.error?.message ?? "Failed to load");
          return;
        }
        const data = json.data!;
        setRows((prev) =>
          opts?.append ? [...prev, ...data.giftCodes] : data.giftCodes,
        );
        setHasMore(data.hasMore);
        setTotal(data.total);
        setPage(data.page);
      } catch {
        toast.error("Network error");
      } finally {
        setLoading(false);
        setPendingLoad(false);
      }
    },
    [query, statusFilter],
  );

  useEffect(() => {
    void load({ page: 1 });
    void (async () => {
      try {
        const res = await fetch("/api/admin/settings", {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: { pagesEnabled?: { giftCodes?: boolean } };
        };
        if (res.ok) {
          setStoreEnabled(json.data?.pagesEnabled?.giftCodes === true);
        }
      } catch {
        /* ignore */
      }
    })();
    // initial only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(next: { q?: string; status?: StatusFilter }) {
    const q = next.q ?? query;
    const status = next.status ?? statusFilter;
    if (next.q != null) setQuery(next.q);
    if (next.status != null) setStatusFilter(next.status);
    void load({ page: 1, q, status });
  }

  async function handleCreate() {
    const amountUsd = Number(form.amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      toast.error("Enter a USD amount greater than 0.");
      return;
    }
    if (form.restrictUser && !form.assignedUsername.trim()) {
      toast.error("Enter a username to restrict this code.");
      return;
    }

    setCreating(true);
    const result = await adminMutate("/api/admin/gift-codes", {
      method: "POST",
      body: JSON.stringify({
        amountUsd,
        code: form.code.trim() || null,
        assignedUsername: form.restrictUser
          ? form.assignedUsername.trim().replace(/^@/, "")
          : null,
        note: form.note.trim() || null,
        expiresAt: form.expiresAt
          ? localDateTimeToIso(form.expiresAt)
          : null,
      }),
    });
    setCreating(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    const gift = (result.data as { giftCode?: GiftCodeRow })?.giftCode;
    toast.success(gift ? `Created ${gift.code}` : "Gift code created");
    setCreateOpen(false);
    setForm(emptyGiftCodeForm);
    void load({ page: 1 });
  }

  async function handleDisable() {
    if (!detail || detail.status !== "AVAILABLE") return;
    setDisabling(true);
    const result = await adminMutate(`/api/admin/gift-codes/${detail.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "disable" }),
    });
    setDisabling(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Gift code disabled");
    setDetail(null);
    void load({ page: 1 });
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Gift codes"
        description="Create USD wallet gift codes · open or user-locked · claim history"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setForm(emptyGiftCodeForm);
              setCreateOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Create
          </Button>
        }
      />

      {!storeEnabled ? (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border border-warning/35 bg-warning/10 px-3.5 py-3",
            "text-sm text-warning",
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Customer page is off</p>
            <p className="mt-0.5 text-xs text-warning/90">
              Settings → Pages enable → Gift codes. Customers cannot claim until
              you turn it on (supplier risk).
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ q: query });
            }}
            placeholder="Search code, note, username…"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => applyFilters({ q: query })}
        >
          Search
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["all", "All"],
            ["AVAILABLE", "Available"],
            ["CLAIMED", "Claimed"],
            ["DISABLED", "Disabled"],
          ] as const
        ).map(([value, label]) => (
          <FilterChip
            key={value}
            active={statusFilter === value}
            onClick={() => applyFilters({ status: value })}
          >
            {label}
          </FilterChip>
        ))}
      </div>

      <p className="text-xs text-muted-foreground tabular-nums">
        {total} code{total === 1 ? "" : "s"}
      </p>

      {loading ? (
        <AdminListSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <AdminEmptyState message="No gift codes yet. Create one to credit USD wallets." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
          <ul className="divide-y divide-border/50">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setDetail(row)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                    "hover:bg-muted/40 active:bg-muted/55",
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Ticket className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-sm font-semibold tracking-wide">
                        {row.code}
                      </span>
                      <Badge variant={statusTone(row.status)}>
                        {row.status === "AVAILABLE"
                          ? "Available"
                          : row.status === "CLAIMED"
                            ? "Claimed"
                            : "Disabled"}
                      </Badge>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      <span className="font-medium text-success">
                        {formatMoney(row.amount)}
                      </span>
                      {" · "}
                      {row.claimedBy
                        ? `Claimed by @${row.claimedBy.username}`
                        : row.assignedUser
                          ? `Locked to @${row.assignedUser.username}`
                          : "Open · first claimer"}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            disabled={pendingLoad}
            onClick={() => void load({ page: page + 1, append: true })}
          >
            {pendingLoad ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      <AdminGiftCodeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={form}
        onFormChange={setForm}
        pending={creating}
        onSubmit={() => void handleCreate()}
      />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {detail ? (
            <>
              <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
                <DialogHeader className="gap-1.5 pr-8 text-left">
                  <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Gift className="size-5" />
                  </div>
                  <DialogTitle className="font-mono text-lg tracking-wide">
                    {detail.code}
                  </DialogTitle>
                  <DialogDescription>
                    {formatMoney(detail.amount)} USD wallet credit
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
                <DetailRow label="Status">
                  <Badge variant={statusTone(detail.status)}>
                    {detail.status}
                  </Badge>
                </DetailRow>
                <DetailRow label="Amount">
                  <span className="font-semibold text-success">
                    {formatMoney(detail.amount)}
                  </span>
                </DetailRow>
                <DetailRow label="Assigned">
                  {detail.assignedUser ? (
                    <span>
                      @{detail.assignedUser.username}
                      <span className="text-muted-foreground">
                        {" "}
                        · {detail.assignedUser.email}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Open (first claimer)
                    </span>
                  )}
                </DetailRow>
                <DetailRow label="Claimed by">
                  {detail.claimedBy ? (
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        @{detail.claimedBy.username} · {detail.claimedBy.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {detail.claimedBy.email} · {detail.claimedBy.role}
                        {detail.claimedBy.banned ? " · Banned" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatWhen(detail.claimedAt)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not claimed</span>
                  )}
                </DetailRow>
                <DetailRow label="Created">
                  <span>
                    @{detail.createdBy.username} · {formatWhen(detail.createdAt)}
                  </span>
                </DetailRow>
                {detail.expiresAt ? (
                  <DetailRow label="Expires">
                    {formatWhen(detail.expiresAt)}
                  </DetailRow>
                ) : null}
                {detail.note ? (
                  <DetailRow label="Note">{detail.note}</DetailRow>
                ) : null}
                {detail.transactionId ? (
                  <DetailRow label="Ledger">
                    <span className="font-mono text-xs">
                      {detail.transactionId}
                    </span>
                  </DetailRow>
                ) : null}
              </div>

              <DialogFooter className="shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-5 py-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyCode(detail.code)}
                >
                  <Copy data-icon="inline-start" />
                  Copy code
                </Button>
                {detail.status === "AVAILABLE" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={disabling}
                    onClick={() => void handleDisable()}
                  >
                    {disabling ? "Disabling…" : "Disable"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDetail(null)}
                  >
                    Close
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
