"use client";

import type {
  AdminUserActivityItem,
  AdminUserRow,
} from "@/components/admin/users/admin-user-types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/currencies";
import { roleBadge, type UserRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  CalendarDays,
  LogIn,
  Mail,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

const BAN_REASON_MAX = 500;

const ROLES: UserRole[] = ["USER", "SELLER", "RESELLER", "ADMIN"];

function initials(name: string, username: string) {
  const source = name.trim() || username.trim();
  return (source[0] ?? "?").toUpperCase();
}

export function AdminUserDetailSheet({
  user,
  activity,
  detailLoading,
  pending,
  statusPending,
  onOpenChange,
  onStatusChange,
  onBanReasonSave,
  onRoleChange,
  onCanCreateChange,
  onCanManageChange,
  onCanFundChange,
  onApiEnabledChange,
  onDepositsEnabledChange,
  onVerifiedChange,
  onLoginAs,
  onOpenWallet,
  onDelete,
}: {
  user: AdminUserRow | null;
  activity: AdminUserActivityItem[];
  detailLoading: boolean;
  pending: boolean;
  statusPending: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (banned: boolean, banReason?: string | null) => void;
  onBanReasonSave: (banReason: string | null) => void;
  onRoleChange: (role: UserRole) => void;
  onCanCreateChange: (value: boolean) => void;
  onCanManageChange: (value: boolean) => void;
  onCanFundChange: (value: boolean) => void;
  onApiEnabledChange: (value: boolean) => void;
  onDepositsEnabledChange: (value: boolean) => void;
  onVerifiedChange: (value: boolean) => void;
  onLoginAs: () => void;
  onOpenWallet: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBan, setConfirmBan] = useState(false);
  const [banDraft, setBanDraft] = useState("");

  useEffect(() => {
    setConfirmDelete(false);
    setConfirmBan(false);
    setBanDraft(user?.banReason ?? "");
  }, [user?.id, user?.banReason]);

  async function handleDelete() {
    const ok = await onDelete();
    if (ok) setConfirmDelete(false);
  }

  function handleStatusSelect(value: string) {
    if (value === "banned" && !user?.banned) {
      setBanDraft("");
      setConfirmBan(true);
      return;
    }
    if (value === "active" && user?.banned) {
      setConfirmBan(false);
      onStatusChange(false);
    }
  }

  function confirmBanNow() {
    const reason = banDraft.trim() || null;
    setConfirmBan(false);
    onStatusChange(true, reason);
  }

  const canDelete =
    user != null && user.role !== "ADMIN" && !user.email.endsWith("@deleted.local");

  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {user ? (
          <>
            <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
              <DialogHeader className="gap-3 p-0 pr-8 text-left">
                <div className="flex items-start gap-3">
                  <Avatar size="lg" className="bg-primary/15">
                    <AvatarFallback className="bg-primary/20 text-base font-semibold text-primary">
                      {initials(user.name, user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-1.5">
                    <DialogTitle className="truncate text-lg">
                      {user.name || `@${user.username}`}
                    </DialogTitle>
                    <DialogDescription className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-foreground">
                        @{user.username}
                      </span>
                      <Badge variant="secondary">{roleBadge(user.role)}</Badge>
                      <Badge
                        variant={user.banned ? "destructive" : "outline"}
                        className={cn(
                          !user.banned &&
                            "border-success/30 bg-success/10 text-success",
                        )}
                      >
                        {user.email.endsWith("@deleted.local")
                          ? "Deleted"
                          : user.banned
                            ? "Banned"
                            : "Active"}
                      </Badge>
                      {user.emailVerified ? (
                        <Badge
                          variant="outline"
                          className="gap-0.5 border-success/30 bg-success/10 text-success"
                        >
                          <BadgeCheck className="size-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unverified</Badge>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={onOpenWallet}
                disabled={pending}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    <Wallet className="size-3.5" />
                    Wallet balance
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
                    {formatMoney(user.walletBalance)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tap to add or cut balance
                  </p>
                </div>
                <span className="rounded-lg bg-primary/15 px-2.5 py-1.5 text-xs font-medium text-primary">
                  Edit
                </span>
              </button>

              <div className="space-y-2.5 rounded-xl border border-border px-3.5 py-3 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate text-foreground">{user.email}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="size-3.5 shrink-0" />
                  <span className="truncate text-foreground">
                    {user.name || "—"}
                    {user.referredBy
                      ? ` · ref @${user.referredBy.username}`
                      : ""}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0" />
                  <span className="text-foreground">
                    Joined{" "}
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border p-3.5">
                <div className="space-y-1.5">
                  <Label>Account status</Label>
                  <Select
                    value={user.banned ? "banned" : "active"}
                    disabled={pending || statusPending || confirmBan}
                    onValueChange={handleStatusSelect}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {confirmBan ? (
                  <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-sm font-medium text-destructive">
                      Ban this account?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Login, checkout, and API keys are blocked. Wallet and
                      order history stay intact. Pending deposits cannot be
                      credited until unban.
                    </p>
                    <Label htmlFor="ban-reason-new" className="text-xs">
                      Reason (admin only, optional)
                    </Label>
                    <Textarea
                      id="ban-reason-new"
                      value={banDraft}
                      maxLength={BAN_REASON_MAX}
                      rows={3}
                      disabled={pending || statusPending}
                      placeholder="e.g. chargeback, fraud, abuse…"
                      onChange={(e) => setBanDraft(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={pending || statusPending}
                        onClick={() => setConfirmBan(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        disabled={pending || statusPending}
                        onClick={confirmBanNow}
                      >
                        Confirm ban
                      </Button>
                    </div>
                  </div>
                ) : null}

                {user.banned && !confirmBan ? (
                  <div className="space-y-2">
                    <Label htmlFor="ban-reason-edit">Ban reason</Label>
                    <Textarea
                      id="ban-reason-edit"
                      value={banDraft}
                      maxLength={BAN_REASON_MAX}
                      rows={3}
                      disabled={pending || statusPending}
                      placeholder="Admin-only note…"
                      onChange={(e) => setBanDraft(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      disabled={
                        pending ||
                        statusPending ||
                        (banDraft.trim() || null) === (user.banReason ?? null)
                      }
                      onClick={() =>
                        onBanReasonSave(banDraft.trim() || null)
                      }
                    >
                      Save reason
                    </Button>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={user.role}
                    disabled={pending}
                    onValueChange={(v) => onRoleChange(v as UserRole)}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleBadge(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {user.role === "SELLER" ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Seller features
                    </p>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Create resellers</p>
                        <p className="text-xs text-muted-foreground">
                          Open seller panel create dialog
                        </p>
                      </div>
                      <Switch
                        checked={user.canCreateResellers}
                        disabled={pending}
                        onCheckedChange={onCanCreateChange}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Manage resellers</p>
                        <p className="text-xs text-muted-foreground">
                          Status on/off and delete
                        </p>
                      </div>
                      <Switch
                        checked={user.canManageResellers}
                        disabled={pending}
                        onCheckedChange={onCanManageChange}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Fund resellers</p>
                        <p className="text-xs text-muted-foreground">
                          Add or remove balance
                        </p>
                      </div>
                      <Switch
                        checked={user.canFundResellers}
                        disabled={pending}
                        onCheckedChange={onCanFundChange}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Platform API</p>
                    <p className="text-xs text-muted-foreground">
                      Per-user override (role allowlist still applies)
                    </p>
                  </div>
                  <Switch
                    checked={user.apiEnabled !== false}
                    disabled={pending}
                    onCheckedChange={onApiEnabledChange}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Self-serve deposits</p>
                    <p className="text-xs text-muted-foreground">
                      {user.role === "RESELLER"
                        ? "Off by default — resellers top up via their seller"
                        : "Allow Cashfree / Binance / manual top-ups"}
                    </p>
                  </div>
                  <Switch
                    checked={user.depositsEnabled}
                    disabled={pending}
                    onCheckedChange={onDepositsEnabledChange}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Trust
                  </p>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Email verified</p>
                      <p className="text-xs text-muted-foreground">
                        Verified badge on public profiles
                      </p>
                    </div>
                    <Switch
                      checked={user.emailVerified}
                      disabled={pending}
                      onCheckedChange={onVerifiedChange}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Recent activity</p>
                {detailLoading ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Loading…
                  </p>
                ) : activity.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                    No activity yet.
                  </p>
                ) : (
                  <ul className="max-h-40 space-y-1.5 overflow-y-auto sm:max-h-48">
                    {activity.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-lg border border-border px-3 py-2 text-xs"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{a.label}</span>
                          <span className="shrink-0 tabular-nums">
                            {formatMoney(a.amount)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground">
                          {a.meta} ·{" "}
                          {new Date(a.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {canDelete ? (
                !confirmDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={pending}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-3.5" />
                      Delete user
                    </Button>
                  ) : (
                  <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
                    <p className="text-sm font-medium text-destructive">
                      Delete @{user.username}?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Soft-deletes the account (login removed). Orders and
                      wallet history stay linked so you can still see who
                      purchased. This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={pending}
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="flex-1"
                        disabled={pending}
                        onClick={() => void handleDelete()}
                      >
                        {pending ? "Deleting…" : "Confirm delete"}
                      </Button>
                    </div>
                  </div>
                )
              ) : null}
            </div>

            {user.role !== "ADMIN" &&
            !user.email.endsWith("@deleted.local") ? (
              <div className="shrink-0 border-t border-border/40 bg-muted/30 p-4">
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={pending}
                  onClick={onLoginAs}
                >
                  <LogIn className="size-3.5" />
                  Login as user
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
