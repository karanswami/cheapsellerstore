"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Ban,
  BadgeCheck,
  ChevronRight,
  Code2,
  Copy,
  Dices,
  KeyRound,
  Crown,
  Gift,
  Handshake,
  Landmark,
  LogIn,
  Minus,
  Network,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  User as UserIcon,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Pager, SearchBox, StatCard, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { MICROCENTS_PER_USD, formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";

export type Role = "USER" | "SELLER" | "RESELLER" | "ADMIN";
export type UserRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  walletBalance: number;
  banned: boolean;
  banReason: string | null;
  resellerDiscount: number;
  canCreateResellers: boolean;
  canManageResellers: boolean;
  canFundResellers: boolean;
  apiEnabled: boolean;
  depositsEnabled: boolean;
  emailVerified: boolean;
  referralCode: string | null;
  createdAt: string;
  referredBy: { id?: string; username: string } | null;
};
type Activity = { id: string; kind: string; label: string; amount: number; meta: string; createdAt: string };
type Status = "ALL" | "VERIFIED" | "UNVERIFIED" | "BANNED";

const ROLE_META: Record<Role, { label: string; icon: LucideIcon; variant: "muted" | "default" | "warning" | "highlight"; hint: string }> = {
  USER: { label: "User", icon: UserIcon, variant: "muted", hint: "Retail customer" },
  SELLER: { label: "Seller", icon: Store, variant: "default", hint: "Wholesale pricing" },
  RESELLER: { label: "Reseller", icon: Handshake, variant: "warning", hint: "Under a seller" },
  ADMIN: { label: "Admin", icon: Crown, variant: "highlight", hint: "Full panel access" },
};
const ROLE_ORDER: Role[] = ["USER", "SELLER", "RESELLER", "ADMIN"];
const LIMIT = 20;

export function RoleBadge({ role }: { role: Role }) {
  const m = ROLE_META[role];
  return (
    <Badge variant={m.variant} shape="pill">
      <m.icon /> {m.label}
    </Badge>
  );
}

const ROLE_TILE: Record<Role, string> = {
  USER: "bg-muted text-muted-foreground",
  SELLER: "bg-primary/15 text-primary",
  RESELLER: "bg-warning/15 text-warning",
  ADMIN: "bg-highlight/15 text-highlight",
};

/** Icon tile + label + hint, used for the role dropdown trigger and items. */
function RoleOption({ role, current }: { role: Role; current?: boolean }) {
  const m = ROLE_META[role];
  return (
    <span className="flex min-w-0 items-center gap-3 text-left">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", ROLE_TILE[role])}>
        <m.icon className="size-4" />
      </span>
      <span className="grid min-w-0 leading-tight">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {m.label}
          {current ? <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">current</span> : null}
        </span>
        <span className="truncate text-xs text-muted-foreground">{m.hint}</span>
      </span>
    </span>
  );
}

export function StatusChip({ user }: { user: UserRow }) {
  if (user.banned)
    return (
      <Badge variant="destructive" shape="pill">
        <Ban /> Banned
      </Badge>
    );
  if (user.emailVerified)
    return (
      <Badge variant="success" shape="pill">
        <BadgeCheck /> Verified
      </Badge>
    );
  return (
    <Badge variant="muted" shape="pill">
      Unverified
    </Badge>
  );
}

export const hasResellerSystem = (u: UserRow) => u.canCreateResellers && u.canManageResellers && u.canFundResellers;

/** Small icon chips summarising what the account can do. */
export function AccessChips({ user }: { user: UserRow }) {
  const chips: { key: string; icon: LucideIcon; label: string; on: boolean }[] = [
    { key: "api", icon: Code2, label: "API", on: user.apiEnabled },
    { key: "dep", icon: ArrowDownToLine, label: "Deposit", on: user.depositsEnabled },
  ];
  if (user.role === "SELLER") chips.push({ key: "res", icon: Network, label: "Resellers", on: hasResellerSystem(user) });
  return (
    <div className="flex flex-wrap items-center gap-1">
      {chips.map((c) => (
        <Badge
          key={c.key}
          variant={c.on ? "success" : "outline"}
          shape="pill"
          className={cn(!c.on && "text-muted-foreground line-through decoration-muted-foreground/50")}
          title={`${c.label} ${c.on ? "on" : "off"}`}
        >
          <c.icon /> {c.label}
        </Badge>
      ))}
    </div>
  );
}

export function AdminUsersClient() {
  const { data, loading, reload } = useAdminQuery<{ users: UserRow[] }>("/api/admin/users");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"ALL" | Role>("ALL");
  const [status, setStatus] = useState<Status>("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const users = useMemo(() => data?.users ?? [], [data]);
  const stats = useMemo(() => {
    const byRole: Record<Role, number> = { USER: 0, SELLER: 0, RESELLER: 0, ADMIN: 0 };
    let banned = 0;
    let verified = 0;
    let float = 0;
    for (const u of users) {
      byRole[u.role]++;
      if (u.banned) banned++;
      if (u.emailVerified) verified++;
      float += u.walletBalance;
    }
    return { byRole, banned, verified, float };
  }, [users]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users.filter(
      (u) =>
        (role === "ALL" || u.role === role) &&
        (status === "ALL" ||
          (status === "BANNED" && u.banned) ||
          (status === "VERIFIED" && u.emailVerified && !u.banned) ||
          (status === "UNVERIFIED" && !u.emailVerified && !u.banned)) &&
        (!s || `${u.name} ${u.username} ${u.email} ${u.referralCode ?? ""}`.toLowerCase().includes(s)),
    );
  }, [users, q, role, status]);
  const pageRows = filtered.slice((page - 1) * LIMIT, page * LIMIT);
  const selected = users.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Accounts" value={users.length} hint={`${stats.verified} verified`} icon={Users} />
        <StatCard label="Sellers" value={stats.byRole.SELLER} hint={`${stats.byRole.RESELLER} resellers`} icon={Store} />
        <StatCard label="Wallet float" value={formatMoney(stats.float)} hint="Sum of all balances" icon={Wallet} tone="success" />
        <StatCard label="Banned" value={stats.banned} hint={stats.banned ? "Blocked from the store" : "Nobody banned"} icon={ShieldAlert} tone={stats.banned ? "destructive" : "default"} />
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Chips
            value={role}
            onChange={(v) => {
              setRole(v);
              setPage(1);
            }}
            options={[
              { v: "ALL", label: "All roles", count: users.length },
              ...ROLE_ORDER.map((r) => ({ v: r, label: `${ROLE_META[r].label}s`, count: stats.byRole[r] })),
            ]}
          />
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Name, username, email, code…"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</span>
          <Chips
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { v: "ALL", label: "Any" },
              { v: "VERIFIED", label: "Verified" },
              { v: "UNVERIFIED", label: "Unverified" },
              { v: "BANNED", label: "Banned", count: stats.banned },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : pageRows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="No users found" hint="Try another role, status or search." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-full">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden lg:table-cell">Access</TableHead>
                <TableHead className="text-right">Wallet</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((u) => (
                <TableRow key={u.id} className={cn("group cursor-pointer", u.banned && "bg-destructive/[0.04]")} onClick={() => setSelectedId(u.id)}>
                  <TableCell className="w-full max-w-0">
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <div className="relative shrink-0">
                        <UserAvatar seed={u.username} className={cn("size-9", u.banned && "opacity-50 grayscale")} />
                        {u.emailVerified && !u.banned ? (
                          <BadgeCheck className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-card text-success" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                          <span className="hidden truncate sm:inline">{u.name}</span>
                          <span className="truncate sm:font-normal sm:text-muted-foreground">@{u.username}</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid gap-1">
                      <RoleBadge role={u.role} />
                      {u.role === "RESELLER" && u.referredBy ? <span className="hidden text-[11px] text-muted-foreground sm:block">of @{u.referredBy.username}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <AccessChips user={u} />
                  </TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", u.walletBalance === 0 && "text-muted-foreground")}>{formatMoney(u.walletBalance)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <StatusChip user={u} />
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">{formatDate(u.createdAt)}</TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={LIMIT} total={filtered.length} onPage={setPage} />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-xl grid-cols-[minmax(0,1fr)] gap-0 overflow-x-hidden p-0">
          {selected ? (
            <UserManage
              key={selected.id}
              user={selected}
              onChanged={reload}
              onDeleted={() => {
                setSelectedId(null);
                reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Switch row inside a grouped settings card. */
function AccessRow({
  icon: Icon,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", checked ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch className="mt-1" checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const BAN_REASONS = ["Fraud / chargeback", "Abuse", "Policy violation", "Resale of keys"];

function ActionRow({ icon: Icon, title, hint, action, tone }: { icon: LucideIcon; title: string; hint: string; action: React.ReactNode; tone?: "danger" }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", tone === "danger" && "text-destructive")}>{title}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      {action}
    </div>
  );
}

const ACTIVITY_ICON: Record<string, LucideIcon> = { order: ShoppingBag, deposit: ArrowDownToLine, transaction: ArrowLeftRight };
const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

export function UserManage({
  user,
  team,
  onOpenUser,
  onChanged,
  onDeleted,
}: {
  user: UserRow;
  /** Resellers under this seller (enables the Team tab). */
  team?: UserRow[];
  onOpenUser?: (id: string) => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const detail = useAdminQuery<{ activity: Activity[] }>(`/api/admin/users/${user.id}`);
  const [role, setRole] = useState<Role>(user.role);
  const [mode, setMode] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [banReason, setBanReason] = useState("");
  const [delOpen, setDelOpen] = useState(false);
  const [panel, setPanel] = useState<"pw" | "ban" | null>(null);
  const [pwInput, setPwInput] = useState("");
  const [pwResult, setPwResult] = useState<{ password: string; generated: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(label: string, body: Record<string, unknown>, okMsg = "Saved.") {
    setBusy(label);
    try {
      await adminFetch(`/api/admin/users/${user.id}`, { method: "PATCH", json: body });
      toast.success(okMsg);
      onChanged();
      detail.reload();
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword(password?: string) {
    setBusy("pw");
    try {
      const res = await adminFetch<{ password: string; generated: boolean }>(`/api/admin/users/${user.id}/password`, { method: "POST", json: password ? { password } : {} });
      setPwResult(res);
      setPwInput("");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function impersonate() {
    setBusy("imp");
    try {
      await adminFetch(`/api/admin/users/${user.id}/impersonate`, { method: "POST" });
      window.location.href = "/app";
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(null);
    }
  }

  const wholesale = user.role === "SELLER" || user.role === "RESELLER";
  const isAdmin = user.role === "ADMIN";
  const amt = Math.abs(Number(amount)) || 0;
  const signed = mode === "credit" ? amt : -amt;
  const nextBalance = user.walletBalance + Math.round(signed * MICROCENTS_PER_USD);
  const activity = detail.data?.activity ?? [];

  return (
    <>
      {/* Header */}
      <div className="relative border-b bg-gradient-to-br from-primary/10 via-transparent to-transparent px-5 pb-3 pt-4 sm:px-6">
        <div className="flex items-start gap-4 pr-6">
          <UserAvatar seed={user.username} className={cn("size-12 shrink-0 rounded-xl ring-2 ring-background", user.banned && "opacity-60 grayscale")} />
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-xl">{user.name}</DialogTitle>
            <DialogDescription className="truncate">
              @{user.username} · {user.email}
            </DialogDescription>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <RoleBadge role={user.role} />
              <StatusChip user={user} />
              {user.referralCode ? (
                <Badge variant="outline" shape="pill" className="font-mono">
                  <Gift /> {user.referralCode}
                </Badge>
              ) : null}
              {user.referredBy ? (
                <Badge variant="muted" shape="pill">
                  {user.role === "RESELLER" ? "Seller" : "Referred by"} @{user.referredBy.username}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 divide-x rounded-xl border bg-card">
          <div className="px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Wallet</p>
            <p className="truncate font-display text-lg font-bold tabular-nums">{formatMoney(user.walletBalance)}</p>
          </div>
          <div className="px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Activity</p>
            <p className="font-display text-lg font-bold tabular-nums">{detail.data ? activity.length : "—"}</p>
          </div>
          <div className="px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Joined</p>
            <p className="truncate text-sm font-semibold leading-7">{formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <Tabs defaultValue="access" className="min-w-0 px-5 pb-5 pt-3 sm:px-6">
        <TabsList className={cn("grid", team ? "grid-cols-5" : "grid-cols-4")}>
          <TabsTrigger value="access" className="justify-center">
            <ShieldCheck /> <span className="hidden sm:inline">Access</span>
          </TabsTrigger>
          {team ? (
            <TabsTrigger value="team" className="justify-center">
              <Network /> <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="wallet" className="justify-center">
            <Wallet /> <span className="hidden sm:inline">Wallet</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="justify-center">
            <ArrowLeftRight /> <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="justify-center">
            <UserCheck /> <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[18rem] min-w-0">
          {/* Access */}
          <TabsContent value="access" className="mt-4 grid gap-5">
            <section>
              <SectionTitle>Role</SectionTitle>
              <div className="flex gap-2">
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger className="h-14! w-full min-w-0 rounded-xl px-3">
                    <SelectValue className="line-clamp-none! min-w-0">
                      <RoleOption role={role} current={role === user.role} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_ORDER.map((r) => (
                      <SelectItem key={r} value={r} className="rounded-lg py-2 pl-2">
                        <RoleOption role={r} current={r === user.role} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <SubmitButton className="h-14 rounded-xl px-5" busy={busy === "role"} disabled={role === user.role} onClick={() => patch("role", { role }, "Role updated.")}>
                  Save
                </SubmitButton>
              </div>
              {role !== user.role ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {ROLE_META[user.role].label} → <b className="text-foreground">{ROLE_META[role].label}</b>.{" "}
                  <button type="button" className="font-medium text-primary hover:underline" onClick={() => setRole(user.role)}>
                    Undo
                  </button>
                </p>
              ) : null}
            </section>

            <section>
              <SectionTitle>Permissions</SectionTitle>
              <div className="divide-y overflow-hidden rounded-xl border">
                {user.role === "SELLER" ? (
                  <AccessRow
                    icon={Network}
                    label="Reseller system"
                    hint="Create resellers, fund / reclaim, suspend and delete them."
                    checked={hasResellerSystem(user)}
                    disabled={busy === "f"}
                    onChange={(v) => patch("f", { resellerGate: v })}
                  />
                ) : null}
                {user.role === "SELLER"
                  ? (
                      [
                        { key: "canCreateResellers", icon: Plus, label: "Create resellers", hint: "Can add new reseller accounts." },
                        { key: "canManageResellers", icon: UserCheck, label: "Manage resellers", hint: "Suspend, unsuspend and delete their resellers." },
                        { key: "canFundResellers", icon: Wallet, label: "Fund resellers", hint: "Send and reclaim wallet balance." },
                      ] as const
                    ).map((c) => (
                      <AccessRow key={c.key} icon={c.icon} label={c.label} hint={c.hint} checked={user[c.key]} disabled={busy === "f"} onChange={(v) => patch("f", { [c.key]: v })} />
                    ))
                  : null}
                <AccessRow
                  icon={Code2}
                  label={wholesale ? "Developer API" : "Platform API"}
                  hint={wholesale ? "API keys, webhooks and orders over the Platform API." : "Allow API keys for this account."}
                  checked={user.apiEnabled}
                  disabled={busy === "f"}
                  onChange={(v) => patch("f", { apiEnabled: v })}
                />
                <AccessRow
                  icon={Landmark}
                  label={user.role === "RESELLER" ? "Own deposit access" : "Deposits"}
                  hint={
                    user.role === "RESELLER"
                      ? `Independent reseller: ${user.referredBy ? `@${user.referredBy.username}` : "their seller"} can no longer suspend or delete them, or reclaim money they deposit themselves.`
                      : "Allow this user to self-deposit."
                  }
                  checked={user.depositsEnabled}
                  disabled={busy === "f"}
                  onChange={(v) => patch("f", { depositsEnabled: v })}
                />
                <AccessRow
                  icon={BadgeCheck}
                  label="Email verified"
                  hint="Mark the email address as confirmed."
                  checked={user.emailVerified}
                  disabled={busy === "f"}
                  onChange={(v) => patch("f", { emailVerified: v })}
                />
              </div>
            </section>
          </TabsContent>

          {/* Team */}
          {team ? (
            <TabsContent value="team" className="mt-4 min-w-0">
              {team.length === 0 ? (
                <EmptyState icon={Network} title="No resellers yet" hint="Resellers this seller creates will be listed here." />
              ) : (
                <ul className="max-h-[22rem] divide-y overflow-y-auto overflow-x-hidden rounded-xl border">
                  {team.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => onOpenUser?.(r.id)} className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40">
                        <UserAvatar seed={r.username} className={cn("size-9 shrink-0", r.banned && "opacity-50 grayscale")} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">@{r.username}</p>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            <Badge variant={r.depositsEnabled ? "highlight" : "muted"} shape="pill">
                              {r.depositsEnabled ? "Independent" : "Seller-funded"}
                            </Badge>
                            {r.banned ? (
                              <Badge variant="destructive" shape="pill">
                                <Ban /> Banned
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(r.walletBalance)}</span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          ) : null}

          {/* Wallet */}
          <TabsContent value="wallet" className="mt-4 grid gap-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1">
              {(["credit", "debit"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
                    mode === m ? (m === "credit" ? "bg-success/15 text-success shadow-sm" : "bg-destructive/15 text-destructive shadow-sm") : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "credit" ? <Plus className="size-4" /> : <Minus className="size-4" />} {m === "credit" ? "Add funds" : "Deduct funds"}
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="adj-amount">Amount (USD)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
                <Input id="adj-amount" type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 pl-7 text-lg font-semibold tabular-nums" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_AMOUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmount(String(n))}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", amt === n ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                  >
                    ${n}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="adj-note">Note</Label>
              <Input id="adj-note" placeholder="Shown in the user's history (optional)" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} maxLength={200} />
            </div>

            <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm tabular-nums">
                <span className="text-muted-foreground">{formatMoney(user.walletBalance)}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
                <span className={cn("font-semibold", amt > 0 && (mode === "credit" ? "text-success" : "text-destructive"), nextBalance < 0 && "text-destructive")}>{formatMoney(nextBalance)}</span>
              </div>
              <SubmitButton
                variant={mode === "debit" ? "destructive" : "default"}
                busy={busy === "wallet"}
                disabled={!amt}
                onClick={async () => {
                  const ok = await patch("wallet", { walletAdjust: { amount: signed, note: adjustNote.trim() || undefined } }, "Wallet adjusted.");
                  if (ok) {
                    setAmount("");
                    setAdjustNote("");
                  }
                }}
              >
                {mode === "credit" ? <Plus /> : <Minus />} {mode === "credit" ? "Add" : "Deduct"} {amt ? `$${amt.toFixed(2)}` : ""}
              </SubmitButton>
            </div>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity" className="mt-4 min-w-0">
            {detail.loading && !detail.data ? (
              <TableSkeleton rows={5} />
            ) : activity.length === 0 ? (
              <EmptyState icon={ArrowLeftRight} title="No activity yet" hint="Orders, deposits and wallet movements show up here." />
            ) : (
              <ul className="max-h-[22rem] min-w-0 divide-y overflow-y-auto overflow-x-hidden rounded-xl border">
                {activity.map((a) => {
                  const Icon = ACTIVITY_ICON[a.kind] ?? ArrowLeftRight;
                  const isTx = a.kind === "transaction";
                  return (
                    <li key={a.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium capitalize">{a.label.toLowerCase().replaceAll("_", " ")}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(a.createdAt, true)}
                          {isTx && a.meta ? ` · ${a.meta}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn("text-sm font-semibold tabular-nums", isTx && a.amount < 0 && "text-destructive", isTx && a.amount > 0 && "text-success")}>
                          {isTx && a.amount > 0 ? "+" : ""}
                          {formatMoney(a.amount)}
                        </span>
                        {!isTx ? <StatusBadge status={a.meta} /> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          {/* Account */}
          <TabsContent value="account" className="mt-4">
            <div className="divide-y overflow-hidden rounded-xl border">
              {/* Password */}
              <div>
                <ActionRow
                  icon={KeyRound}
                  title="Password"
                  hint="Set a new one or generate a random password."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setPanel(panel === "pw" ? null : "pw")}>
                      {panel === "pw" ? "Close" : "Reset"}
                    </Button>
                  }
                />
                {panel === "pw" ? (
                  <div className="grid gap-3 border-t bg-muted/30 px-4 py-3">
                    {pwResult ? (
                      <div className="grid gap-2">
                        <p className="text-xs text-muted-foreground">
                          {pwResult.generated ? "New password generated." : "Password updated."} Copy it now, it won&apos;t be shown again.
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 truncate rounded-lg border bg-card px-3 py-2 font-mono text-sm font-semibold">{pwResult.password}</code>
                          <Button
                            size="icon"
                            variant="secondary"
                            aria-label="Copy password"
                            onClick={() => navigator.clipboard.writeText(pwResult.password).then(() => toast.success("Copied."), () => toast.error("Copy failed."))}
                          >
                            <Copy />
                          </Button>
                        </div>
                        <Button size="sm" variant="ghost" className="w-fit" onClick={() => setPwResult(null)}>
                          Reset again
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Input type="text" autoComplete="off" placeholder="New password (min 6 characters)" value={pwInput} onChange={(e) => setPwInput(e.target.value)} maxLength={128} />
                        <div className="flex flex-wrap gap-2">
                          <SubmitButton size="sm" busy={busy === "pw"} disabled={pwInput.length < 6} onClick={() => resetPassword(pwInput)}>
                            Set password
                          </SubmitButton>
                          <SubmitButton size="sm" variant="secondary" busy={busy === "pw"} onClick={() => resetPassword()}>
                            <Dices /> Generate random
                          </SubmitButton>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {!isAdmin && !user.banned ? (
                <ActionRow
                  icon={LogIn}
                  title="Login as user"
                  hint="See exactly what they see."
                  action={
                    <SubmitButton size="sm" variant="secondary" busy={busy === "imp"} onClick={impersonate}>
                      Login as
                    </SubmitButton>
                  }
                />
              ) : null}

              {!isAdmin ? (
                <div>
                  <ActionRow
                    icon={Ban}
                    tone="danger"
                    title={user.banned ? "Banned" : "Ban account"}
                    hint={user.banned ? user.banReason || "No reason given." : "Signs them out and blocks the store and API."}
                    action={
                      user.banned ? (
                        <SubmitButton size="sm" variant="secondary" busy={busy === "ban"} onClick={() => patch("ban", { banned: false, banReason: null }, "User unbanned.")}>
                          Unban
                        </SubmitButton>
                      ) : (
                        <Button size="sm" variant="destructive" onClick={() => setPanel(panel === "ban" ? null : "ban")}>
                          {panel === "ban" ? "Close" : "Ban"}
                        </Button>
                      )
                    }
                  />
                  {panel === "ban" && !user.banned ? (
                    <div className="grid gap-3 border-t bg-destructive/5 px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {BAN_REASONS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setBanReason(r)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                              banReason === r ? "border-destructive bg-destructive/15 text-destructive" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <Input placeholder="Or write a reason (shown to the user)" value={banReason} onChange={(e) => setBanReason(e.target.value)} maxLength={300} />
                      <SubmitButton size="sm" variant="destructive" className="w-fit" busy={busy === "ban"} onClick={() => patch("ban", { banned: true, banReason: banReason.trim() || null }, "User banned.")}>
                        <Ban /> Confirm ban
                      </SubmitButton>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!isAdmin ? (
                <ActionRow
                  icon={Trash2}
                  tone="danger"
                  title="Delete account"
                  hint="Anonymised and locked out. Orders are kept."
                  action={
                    <Button size="sm" variant="destructive" onClick={() => setDelOpen(true)}>
                      Delete
                    </Button>
                  }
                />
              ) : (
                <p className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                  <Crown className="size-4 shrink-0 text-highlight" /> Admins can&apos;t be impersonated, banned or deleted. Change the role first.
                </p>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <ConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title={`Delete @${user.username}?`}
        description="The account is anonymised and can no longer sign in. Order history is kept."
        confirmLabel="Delete account"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
            toast.success("Account deleted.");
            onDeleted();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </>
  );
}
