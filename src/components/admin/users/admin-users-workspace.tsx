"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
} from "@/components/admin/admin-page-header";
import { AdminCreateSubsellerDialog } from "@/components/admin/users/admin-create-subseller-dialog";
import { AdminUserDetailSheet } from "@/components/admin/users/admin-user-detail-sheet";
import type {
  AdminUserActivityItem,
  AdminUserRow,
} from "@/components/admin/users/admin-user-types";
import { AdminWalletDialog } from "@/components/admin/users/admin-wallet-dialog";
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
import { formatMoney } from "@/lib/currencies";
import { roleBadge, type UserRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { AdminBulkSellersDialog } from "@/components/admin/sellers/admin-bulk-sellers-dialog";
import { ChevronRight, UserRound, Users, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type { AdminUserRow } from "@/components/admin/users/admin-user-types";

type ListFilter =
  | "all"
  | "users"
  | "sellers"
  | "resellers"
  | "admins"
  | "verified"
  | "unverified"
  | "banned";

const PAGE_SIZE = 10;

const LIST_FILTERS: { id: ListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "users", label: "Users" },
  { id: "sellers", label: "Sellers" },
  { id: "resellers", label: "Resellers" },
  { id: "admins", label: "Admins" },
  { id: "verified", label: "Verified" },
  { id: "unverified", label: "Unverified" },
  { id: "banned", label: "Banned" },
];

function matchesListFilter(user: AdminUserRow, filter: ListFilter) {
  switch (filter) {
    case "users":
      return user.role === "USER";
    case "sellers":
      return user.role === "SELLER";
    case "resellers":
      return user.role === "RESELLER";
    case "admins":
      return user.role === "ADMIN";
    case "verified":
      return user.emailVerified;
    case "unverified":
      return !user.emailVerified;
    case "banned":
      return user.banned;
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

function joinedShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminUsersWorkspace() {
  const router = useRouter();
  const { data, loading, reload } = useAdminFetch<{ users: AdminUserRow[] }>(
    "/api/admin/users",
  );

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<ListFilter>("all");
  const [page, setPage] = useState(0);
  const [openUser, setOpenUser] = useState<AdminUserRow | null>(null);
  const [walletUser, setWalletUser] = useState<AdminUserRow | null>(null);
  const [activity, setActivity] = useState<AdminUserActivityItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [createMinFundingUsd, setCreateMinFundingUsd] = useState(5);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    initialUsd: "5",
  });

  const users = data?.users ?? [];

  const stats = useMemo(() => {
    const total = users.length;
    const sellers = users.filter((u) => u.role === "SELLER").length;
    const resellers = users.filter((u) => u.role === "RESELLER").length;
    return { total, sellers, resellers };
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (!matchesListFilter(u, roleFilter)) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageIndex = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    pageIndex * PAGE_SIZE,
    pageIndex * PAGE_SIZE + PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [query, roleFilter]);

  async function openDetail(user: AdminUserRow) {
    setOpenUser(user);
    setDetailLoading(true);
    setActivity([]);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: { user: AdminUserRow; activity: AdminUserActivityItem[] };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to load user");
        return;
      }
      if (json.data) {
        setOpenUser(json.data.user);
        setActivity(json.data.activity);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDetailLoading(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setPending(true);
    try {
      const result = await adminMutate(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!result.ok) {
        toast.error(result.message);
        return false;
      }
      const payload = result.data as { user?: AdminUserRow } | null;
      toast.success("User updated");
      void reload();
      if (payload?.user) {
        if (openUser?.id === id) {
          setOpenUser({ ...openUser, ...payload.user });
        }
        if (walletUser?.id === id) {
          setWalletUser({ ...walletUser, ...payload.user });
        }
      } else if (openUser?.id === id) {
        await openDetail({ ...openUser, id });
      }
      router.refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  async function setStatus(
    user: AdminUserRow,
    banned: boolean,
    banReason?: string | null,
  ) {
    if (user.banned === banned && banReason === undefined) return;
    setStatusPendingId(user.id);
    try {
      const body: { banned: boolean; banReason?: string | null } = { banned };
      if (banned) {
        body.banReason = banReason ?? null;
      }
      const result = await adminMutate(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const payload = result.data as { user?: AdminUserRow } | undefined;
      toast.success(banned ? "Account banned — API keys revoked" : "Account activated");
      void reload();
      if (openUser?.id === user.id) {
        setOpenUser({
          ...openUser,
          banned,
          banReason: banned
            ? (payload?.user?.banReason ?? banReason ?? null)
            : null,
        });
      }
      router.refresh();
    } finally {
      setStatusPendingId(null);
    }
  }

  async function saveBanReason(banReason: string | null) {
    if (!openUser || !openUser.banned) return;
    if ((openUser.banReason ?? null) === banReason) return;
    setStatusPendingId(openUser.id);
    try {
      const result = await adminMutate(`/api/admin/users/${openUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ banReason }),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Ban reason saved");
      void reload();
      setOpenUser({ ...openUser, banReason });
      router.refresh();
    } finally {
      setStatusPendingId(null);
    }
  }

  async function saveWallet(payload: { amount: number; note?: string }) {
    if (!walletUser) return false;
    const ok = await patch(walletUser.id, {
      walletAdjust: {
        amount: payload.amount,
        note: payload.note,
      },
    });
    return ok;
  }

  async function loginAs() {
    if (!openUser) return;
    setPending(true);
    try {
      const result = await adminMutate(
        `/api/admin/users/${openUser.id}/impersonate`,
        { method: "POST", body: "{}" },
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Logged in as @${openUser.username}`);
      window.location.href = "/app";
    } finally {
      setPending(false);
    }
  }

  async function deleteUser() {
    if (!openUser) return false;
    setPending(true);
    try {
      const result = await adminMutate(`/api/admin/users/${openUser.id}`, {
        method: "DELETE",
      });
      if (!result.ok) {
        toast.error(result.message);
        return false;
      }
      toast.success(`Account @${openUser.username} deleted (history kept)`);
      setOpenUser(null);
      setWalletUser(null);
      void reload();
      router.refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  async function createReseller() {
    const initialUsd = Number(createForm.initialUsd);
    if (!Number.isFinite(initialUsd) || initialUsd < createMinFundingUsd) {
      toast.error(`Initial funding must be at least $${createMinFundingUsd}`);
      return;
    }
    setPending(true);
    try {
      const result = await adminMutate("/api/admin/resellers/create", {
        method: "POST",
        body: JSON.stringify({
          username: createForm.username,
          email: createForm.email,
          password: createForm.password,
          name: createForm.name || undefined,
          initialUsd,
        }),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Reseller created");
      setCreateOpen(false);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        name: "",
        initialUsd: String(createMinFundingUsd),
      });
      void reload();
    } finally {
      setPending(false);
    }
  }

  async function openCreateReseller() {
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      const json = (await res.json()) as {
        data?: { resellerCreateMinFunding?: number };
      };
      const minUsd =
        typeof json.data?.resellerCreateMinFunding === "number"
          ? json.data.resellerCreateMinFunding
          : 5;
      setCreateMinFundingUsd(minUsd);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        name: "",
        initialUsd: String(minUsd),
      });
    } catch {
      /* keep last known min */
    }
    setCreateOpen(true);
  }

  return (
    <main className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Accounts Desk
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Users &amp; roles
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Roles, seller caps, verification, and wallets — all in one
            desk.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className="w-full sm:w-auto gap-1.5 border-primary/40 hover:bg-primary/10 hover:text-primary"
            onClick={() => setBulkOpen(true)}
          >
            <Zap className="size-4 text-primary" />
            One-Click Sellers
          </Button>

          <Button className="w-full sm:w-auto" onClick={() => void openCreateReseller()}>
            Create reseller
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Card variant="stat" size="sm" className="py-2.5">
          <CardHeader className="gap-0 px-3 py-0">
            <CardDescription className="flex items-center gap-1 text-[10px] uppercase">
              <Users className="size-3" />
              Total
            </CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">
              {stats.total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card variant="stat" size="sm" className="py-2.5">
          <CardHeader className="gap-0 px-3 py-0">
            <CardDescription className="flex items-center gap-1 text-[10px] uppercase">
              <UserRound className="size-3" />
              Sellers
            </CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">
              {stats.sellers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card variant="stat" size="sm" className="py-2.5">
          <CardHeader className="gap-0 px-3 py-0">
            <CardDescription className="flex items-center gap-1 text-[10px] uppercase">
              <UserRound className="size-3" />
              Resellers
            </CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">
              {stats.resellers}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Search username, email or role…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10"
        />
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LIST_FILTERS.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={roleFilter === f.id ? "default" : "outline"}
              className="h-8 shrink-0 rounded-full px-3 text-xs"
              onClick={() => setRoleFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <AdminListSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <AdminEmptyState message="No users found." />
      ) : (
        <>
          <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {pageRows.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => void openDetail(u)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 sm:px-4"
                >
                  <Avatar size="default" className="bg-primary/15">
                    <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                      {initials(u.name, u.username)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        @{u.username}
                      </p>
                      <Badge variant="secondary" className="shrink-0">
                        {roleBadge(u.role)}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={u.banned ? "destructive" : "outline"}
                        className={cn(
                          !u.banned &&
                            "border-success/30 bg-success/10 text-success",
                        )}
                      >
                        {u.banned ? "Banned" : "Active"}
                      </Badge>
                      {u.emailVerified ? (
                        <Badge
                          variant="outline"
                          className="border-success/30 bg-success/10 text-[10px] text-success"
                        >
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Unverified
                        </Badge>
                      )}
                      {u.role === "SELLER" && u.canCreateResellers ? (
                        <Badge variant="outline" className="text-[10px]">
                          Create
                        </Badge>
                      ) : null}
                      {u.role === "SELLER" && u.canManageResellers ? (
                        <Badge variant="outline" className="text-[10px]">
                          Manage
                        </Badge>
                      ) : null}
                      {u.role === "SELLER" && u.canFundResellers ? (
                        <Badge variant="outline" className="text-[10px]">
                          Fund
                        </Badge>
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">
                        {u.name} · {joinedShort(u.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-sm font-semibold tabular-nums text-success">
                      {formatMoney(u.walletBalance)}
                    </p>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            {filtered.length} account{filtered.length === 1 ? "" : "s"}
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

      <AdminUserDetailSheet
        user={openUser}
        activity={activity}
        detailLoading={detailLoading}
        pending={pending}
        statusPending={openUser ? statusPendingId === openUser.id : false}
        onOpenChange={(open) => {
          if (!open) setOpenUser(null);
        }}
        onStatusChange={(banned, banReason) => {
          if (openUser) void setStatus(openUser, banned, banReason);
        }}
        onBanReasonSave={(banReason) => {
          void saveBanReason(banReason);
        }}
        onRoleChange={(role: UserRole) => {
          if (openUser) void patch(openUser.id, { role });
        }}
        onCanCreateChange={(value) => {
          if (openUser)
            void patch(openUser.id, { canCreateResellers: value });
        }}
        onCanManageChange={(value) => {
          if (openUser)
            void patch(openUser.id, { canManageResellers: value });
        }}
        onCanFundChange={(value) => {
          if (openUser)
            void patch(openUser.id, { canFundResellers: value });
        }}
        onApiEnabledChange={(value) => {
          if (openUser) void patch(openUser.id, { apiEnabled: value });
        }}
        onDepositsEnabledChange={(value) => {
          if (openUser) void patch(openUser.id, { depositsEnabled: value });
        }}
        onVerifiedChange={(value) => {
          if (openUser) void patch(openUser.id, { emailVerified: value });
        }}
        onLoginAs={() => void loginAs()}
        onOpenWallet={() => {
          if (openUser) setWalletUser(openUser);
        }}
        onDelete={deleteUser}
      />

      <AdminWalletDialog
        open={Boolean(walletUser)}
        onOpenChange={(open) => {
          if (!open) setWalletUser(null);
        }}
        username={walletUser?.username ?? ""}
        currentBalance={walletUser?.walletBalance ?? 0}
        pending={pending}
        onSubmit={saveWallet}
      />

      <AdminCreateSubsellerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={createForm}
        onFormChange={setCreateForm}
        pending={pending}
        onSubmit={() => void createReseller()}
        minFundingUsd={createMinFundingUsd}
      />

      <AdminBulkSellersDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSuccess={() => void reload()}
      />
    </main>
  );
}
