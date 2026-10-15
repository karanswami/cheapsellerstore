"use client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Crown,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  Unlock,
  UserCheck,
  UserX,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type BulkTarget = "SELLERS" | "RESELLERS" | "ALL_SELLERS_AND_RESELLERS";

export type BulkActionKey =
  | "GRANT_ALL_CAPS"
  | "REVOKE_ALL_CAPS"
  | "ENABLE_CAN_CREATE"
  | "DISABLE_CAN_CREATE"
  | "ENABLE_CAN_MANAGE"
  | "DISABLE_CAN_MANAGE"
  | "ENABLE_CAN_FUND"
  | "DISABLE_CAN_FUND"
  | "ENABLE_DEPOSITS"
  | "DISABLE_DEPOSITS"
  | "ENABLE_API"
  | "DISABLE_API"
  | "MARK_VERIFIED"
  | "MARK_UNVERIFIED"
  | "WALLET_ADD"
  | "WALLET_DEDUCT"
  | "MASS_BAN"
  | "MASS_UNBAN"
  | "SEND_NOTIFICATION";

interface TargetStats {
  target: BulkTarget;
  totalMatching: number;
  activeCount: number;
  bannedCount: number;
  verifiedCount: number;
  canCreateCount: number;
  canManageCount: number;
  canFundCount: number;
  depositsEnabledCount: number;
  apiEnabledCount: number;
  totalWalletBalance: number;
}

const TARGET_OPTIONS: { id: BulkTarget; label: string; icon: string }[] = [
  { id: "SELLERS", label: "Sellers Only", icon: "👔" },
  { id: "RESELLERS", label: "Resellers Only", icon: "🤝" },
  { id: "ALL_SELLERS_AND_RESELLERS", label: "All Sellers & Resellers", icon: "🌐" },
];

export function AdminBulkSellersDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [target, setTarget] = useState<BulkTarget>("SELLERS");
  const [activeTab, setActiveTab] = useState<
    "caps" | "access" | "perks" | "wallet" | "status" | "notify"
  >("caps");
  const [selectedAction, setSelectedAction] = useState<BulkActionKey>("GRANT_ALL_CAPS");

  // Form states
  const [walletAmount, setWalletAmount] = useState("5");
  const [walletNote, setWalletNote] = useState("One-Click Seller Bonus");
  const [banReason, setBanReason] = useState("Administrative policy update");
  const [notifyTitle, setNotifyTitle] = useState("Important Announcement for Sellers");
  const [notifyMessage, setNotifyMessage] = useState(
    "Hello Seller, new updates and catalog additions are now live on Cheap Seller.",
  );
  const [notifyUrl, setNotifyUrl] = useState("/app");

  // Stats & API execution states
  const [stats, setStats] = useState<TargetStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  // Fetch live target statistics
  useEffect(() => {
    if (!open) {
      setConfirmStep(false);
      return;
    }

    let isMounted = true;
    setStatsLoading(true);

    fetch(`/api/admin/sellers/bulk-action?target=${target}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data?.stats) {
          setStats(json.data.stats);
        }
      })
      .catch(() => {
        // quiet error fallback
      })
      .finally(() => {
        if (isMounted) setStatsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, target]);

  function getActionDescription(): {
    title: string;
    details: string;
    actionPayload: {
      action: string;
      booleanValue?: boolean;
      amountUsd?: number;
      note?: string;
      banReason?: string;
      notificationTitle?: string;
      notificationMessage?: string;
      notificationActionUrl?: string;
    };
  } {
    switch (selectedAction) {
      case "GRANT_ALL_CAPS":
        return {
          title: "Grant All Capabilities",
          details:
            "Enables 'Can Create Resellers', 'Can Manage Resellers', and 'Can Fund Resellers' for all matched accounts.",
          actionPayload: { action: "GRANT_ALL_CAPS" },
        };
      case "REVOKE_ALL_CAPS":
        return {
          title: "Revoke All Capabilities",
          details:
            "Disables all seller sub-reseller permissions (Create, Manage, Fund) for all matched accounts.",
          actionPayload: { action: "REVOKE_ALL_CAPS" },
        };
      case "ENABLE_CAN_CREATE":
        return {
          title: "Enable 'Can Create Resellers'",
          details: "Allows matched sellers to create child sub-reseller accounts.",
          actionPayload: { action: "SET_CAN_CREATE_RESELLERS", booleanValue: true },
        };
      case "DISABLE_CAN_CREATE":
        return {
          title: "Disable 'Can Create Resellers'",
          details: "Prevents matched sellers from creating new sub-reseller accounts.",
          actionPayload: { action: "SET_CAN_CREATE_RESELLERS", booleanValue: false },
        };
      case "ENABLE_CAN_MANAGE":
        return {
          title: "Enable 'Can Manage Resellers'",
          details: "Allows matched sellers to edit/ban child sub-resellers.",
          actionPayload: { action: "SET_CAN_MANAGE_RESELLERS", booleanValue: true },
        };
      case "DISABLE_CAN_MANAGE":
        return {
          title: "Disable 'Can Manage Resellers'",
          details: "Prevents matched sellers from managing child sub-resellers.",
          actionPayload: { action: "SET_CAN_MANAGE_RESELLERS", booleanValue: false },
        };
      case "ENABLE_CAN_FUND":
        return {
          title: "Enable 'Can Fund Resellers'",
          details: "Allows matched sellers to add/cut wallet balance for child sub-resellers.",
          actionPayload: { action: "SET_CAN_FUND_RESELLERS", booleanValue: true },
        };
      case "DISABLE_CAN_FUND":
        return {
          title: "Disable 'Can Fund Resellers'",
          details: "Prevents matched sellers from adjusting child sub-reseller balances.",
          actionPayload: { action: "SET_CAN_FUND_RESELLERS", booleanValue: false },
        };
      case "ENABLE_DEPOSITS":
        return {
          title: "Enable Self-Serve Deposits",
          details: "Allows matched accounts to use automated/manual deposit rails.",
          actionPayload: { action: "SET_DEPOSITS_ENABLED", booleanValue: true },
        };
      case "DISABLE_DEPOSITS":
        return {
          title: "Disable Self-Serve Deposits",
          details: "Restricts matched accounts from self-serve deposit rails (seller-funded only).",
          actionPayload: { action: "SET_DEPOSITS_ENABLED", booleanValue: false },
        };
      case "ENABLE_API":
        return {
          title: "Enable Platform API Access",
          details: "Grants access to developer API keys and automated ordering.",
          actionPayload: { action: "SET_API_ENABLED", booleanValue: true },
        };
      case "DISABLE_API":
        return {
          title: "Disable Platform API Access",
          details: "Blocks automated Platform API access for matched accounts.",
          actionPayload: { action: "SET_API_ENABLED", booleanValue: false },
        };
      case "MARK_VERIFIED":
        return {
          title: "Mark Email Verified",
          details: "Sets email verification status to true for all matched accounts.",
          actionPayload: { action: "SET_EMAIL_VERIFIED", booleanValue: true },
        };
      case "MARK_UNVERIFIED":
        return {
          title: "Mark Email Unverified",
          details: "Sets email verification status to false for all matched accounts.",
          actionPayload: { action: "SET_EMAIL_VERIFIED", booleanValue: false },
        };
      case "WALLET_ADD": {
        const amt = Math.abs(parseFloat(walletAmount) || 0);
        return {
          title: `Add +$${amt.toFixed(2)} USD Credit`,
          details: `Credits $${amt.toFixed(2)} USD to the wallet balance of every matched account with a transaction ledger note.`,
          actionPayload: {
            action: "WALLET_ADJUST",
            amountUsd: amt,
            note: walletNote || "One-Click Seller Bonus",
          },
        };
      }
      case "WALLET_DEDUCT": {
        const amt = Math.abs(parseFloat(walletAmount) || 0);
        return {
          title: `Deduct -$${amt.toFixed(2)} USD`,
          details: `Deducts $${amt.toFixed(2)} USD from the wallet balance of every matched account.`,
          actionPayload: {
            action: "WALLET_ADJUST",
            amountUsd: -amt,
            note: walletNote || "One-Click Seller Debit",
          },
        };
      }
      case "MASS_BAN":
        return {
          title: "Mass Account Suspension (Ban)",
          details: `Suspends all matched accounts and revokes all active API keys. Reason: "${banReason}".`,
          actionPayload: {
            action: "MASS_BAN",
            banReason: banReason || "Bulk administrative suspension",
          },
        };
      case "MASS_UNBAN":
        return {
          title: "Mass Account Reactivation (Unban)",
          details: "Unbans and restores normal access for all matched accounts.",
          actionPayload: { action: "MASS_UNBAN" },
        };
      case "SEND_NOTIFICATION":
        return {
          title: `Dispatch Notification: "${notifyTitle}"`,
          details:
            "Sends an in-app inbox notification & Web Push to all matched accounts simultaneously.",
          actionPayload: {
            action: "SEND_NOTIFICATION",
            notificationTitle: notifyTitle,
            notificationMessage: notifyMessage,
            notificationActionUrl: notifyUrl || undefined,
          },
        };
    }
  }

  async function handleExecute() {
    const desc = getActionDescription();
    setSubmitting(true);

    try {
      const res = await adminMutate("/api/admin/sellers/bulk-action", {
        method: "POST",
        body: JSON.stringify({
          target,
          ...desc.actionPayload,
        }),
      });

      if (!res.ok) {
        toast.error(res.message || "Failed to execute bulk action");
        return;
      }

      const payload = res.data as
        | { summary?: string; affectedCount?: number }
        | null
        | undefined;

      toast.success(
        payload?.summary ||
          `One-Click action applied to ${payload?.affectedCount ?? "all"} accounts!`,
      );
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch {
      toast.error("Network error while executing action");
    } finally {
      setSubmitting(false);
    }
  }

  const currentDesc = getActionDescription();
  const countBadge = stats?.totalMatching ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(94dvh,750px)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* Header */}
        <div className="border-b border-border/40 bg-muted/30 px-5 py-4">
          <DialogHeader className="gap-1.5">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-[0_0_12px_rgba(16, 185, 129,0.25)]">
                <Zap className="size-5" />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  One-Click — All Sellers
                  <Badge
                    variant="outline"
                    className="border-primary/40 bg-primary/10 text-[10px] font-semibold text-primary uppercase"
                  >
                    Bulk Engine
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Apply batch permissions, wallet adjustments, or updates to all
                  sellers simultaneously in one action.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {/* 1. Target Audience Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Select Target Audience
              </Label>
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[11px] font-medium">
                {statsLoading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Users className="size-3 text-primary" />
                )}
                <span>
                  {countBadge} {countBadge === 1 ? "account" : "accounts"} targeted
                </span>
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {TARGET_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTarget(opt.id);
                    setConfirmStep(false);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all",
                    target === opt.id
                      ? "border-primary bg-primary/15 text-foreground shadow-[0_0_15px_rgba(16, 185, 129,0.15)] ring-1 ring-primary/40"
                      : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:bg-muted/40",
                  )}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Target Live Info Summary */}
            {stats && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <CheckCircle2 className="size-3 text-success" /> {stats.activeCount} Active
                </span>
                {stats.bannedCount > 0 && (
                  <span className="flex items-center gap-1 font-medium text-destructive">
                    <UserX className="size-3" /> {stats.bannedCount} Banned
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BadgeCheck className="size-3 text-success" /> {stats.verifiedCount} Verified
                </span>
                <span className="ml-auto font-medium tabular-nums text-success">
                  Wallets: {formatMoney(stats.totalWalletBalance)}
                </span>
              </div>
            )}
          </div>

          {/* 2. Action Category Tabs */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              2. Choose Action to Apply
            </Label>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: "caps", label: "Capabilities", icon: ShieldCheck },
                { id: "access", label: "Access & Rail", icon: CreditCard },
                { id: "perks", label: "Perks & Badges", icon: Crown },
                { id: "wallet", label: "Mass Wallet", icon: Wallet },
                { id: "status", label: "Status (Ban)", icon: UserX },
                { id: "notify", label: "Broadcast", icon: Send },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <Button
                    key={t.id}
                    type="button"
                    size="sm"
                    variant={activeTab === t.id ? "default" : "outline"}
                    className={cn(
                      "h-8 shrink-0 rounded-full px-3 text-xs gap-1.5",
                      activeTab === t.id && "shadow-sm shadow-primary/20",
                    )}
                    onClick={() => {
                      setActiveTab(t.id as typeof activeTab);
                      setConfirmStep(false);
                    }}
                  >
                    <Icon className="size-3.5" />
                    {t.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 3. Action Selection Body */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            {/* CAPABILITIES TAB */}
            {activeTab === "caps" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Bulk control sub-reseller creation, management, and funding capabilities.
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAction("GRANT_ALL_CAPS")}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      selectedAction === "GRANT_ALL_CAPS"
                        ? "border-success bg-success/15 ring-1 ring-success"
                        : "border-border/40 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/20 text-success">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Grant All Capabilities</p>
                      <p className="text-[11px] text-muted-foreground">Create + Manage + Fund</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAction("REVOKE_ALL_CAPS")}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      selectedAction === "REVOKE_ALL_CAPS"
                        ? "border-destructive bg-destructive/15 ring-1 ring-destructive"
                        : "border-border/40 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive">
                      <Lock className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Revoke All Capabilities</p>
                      <p className="text-[11px] text-muted-foreground">Strip all sub-reseller caps</p>
                    </div>
                  </button>
                </div>

                <div className="space-y-1.5 pt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Individual Permissions
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="space-y-1 rounded-lg border border-border/40 p-2.5">
                      <p className="text-[11px] font-semibold">Can Create Resellers</p>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant={selectedAction === "ENABLE_CAN_CREATE" ? "default" : "outline"}
                          className="h-7 flex-1 text-[10px]"
                          onClick={() => setSelectedAction("ENABLE_CAN_CREATE")}
                        >
                          Enable
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedAction === "DISABLE_CAN_CREATE" ? "destructive" : "outline"}
                          className="h-7 flex-1 text-[10px]"
                          onClick={() => setSelectedAction("DISABLE_CAN_CREATE")}
                        >
                          Disable
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1 rounded-lg border border-border/40 p-2.5">
                      <p className="text-[11px] font-semibold">Can Manage Resellers</p>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant={selectedAction === "ENABLE_CAN_MANAGE" ? "default" : "outline"}
                          className="h-7 flex-1 text-[10px]"
                          onClick={() => setSelectedAction("ENABLE_CAN_MANAGE")}
                        >
                          Enable
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedAction === "DISABLE_CAN_MANAGE" ? "destructive" : "outline"}
                          className="h-7 flex-1 text-[10px]"
                          onClick={() => setSelectedAction("DISABLE_CAN_MANAGE")}
                        >
                          Disable
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1 rounded-lg border border-border/40 p-2.5">
                      <p className="text-[11px] font-semibold">Can Fund Resellers</p>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant={selectedAction === "ENABLE_CAN_FUND" ? "default" : "outline"}
                          className="h-7 flex-1 text-[10px]"
                          onClick={() => setSelectedAction("ENABLE_CAN_FUND")}
                        >
                          Enable
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedAction === "DISABLE_CAN_FUND" ? "destructive" : "outline"}
                          className="h-7 flex-1 text-[10px]"
                          onClick={() => setSelectedAction("DISABLE_CAN_FUND")}
                        >
                          Disable
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ACCESS & RAILS TAB */}
            {activeTab === "access" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Configure payment rail self-deposits and developer Platform API access.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2 rounded-xl border border-border/40 p-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-4 text-primary" />
                      <p className="text-xs font-semibold">Self-Serve Deposits</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Whether accounts can top-up via UPI/QRIS/Binance/Manual rails directly.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selectedAction === "ENABLE_DEPOSITS" ? "default" : "outline"}
                        className="h-8 flex-1 text-xs"
                        onClick={() => setSelectedAction("ENABLE_DEPOSITS")}
                      >
                        Enable for all
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedAction === "DISABLE_DEPOSITS" ? "destructive" : "outline"}
                        className="h-8 flex-1 text-xs"
                        onClick={() => setSelectedAction("DISABLE_DEPOSITS")}
                      >
                        Disable for all
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-border/40 p-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-4 text-primary" />
                      <p className="text-xs font-semibold">Platform API Access</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Allow access to developer API keys, automated purchases, and SDKs.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selectedAction === "ENABLE_API" ? "default" : "outline"}
                        className="h-8 flex-1 text-xs"
                        onClick={() => setSelectedAction("ENABLE_API")}
                      >
                        Enable for all
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedAction === "DISABLE_API" ? "destructive" : "outline"}
                        className="h-8 flex-1 text-xs"
                        onClick={() => setSelectedAction("DISABLE_API")}
                      >
                        Disable for all
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PERKS & BADGES TAB */}
            {activeTab === "perks" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Grant or revoke email verification badges.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2 rounded-xl border border-border/40 p-3">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-success" />
                      <p className="text-xs font-semibold">Email Verification</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Mark email as verified or unverified across all targeted sellers.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selectedAction === "MARK_VERIFIED" ? "default" : "outline"}
                        className="h-8 flex-1 text-xs"
                        onClick={() => setSelectedAction("MARK_VERIFIED")}
                      >
                        Mark Verified
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedAction === "MARK_UNVERIFIED" ? "destructive" : "outline"}
                        className="h-8 flex-1 text-xs"
                        onClick={() => setSelectedAction("MARK_UNVERIFIED")}
                      >
                        Mark Unverified
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MASS WALLET TAB */}
            {activeTab === "wallet" && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Mass deposit bonus credit or deduct wallet funds across all targeted accounts.
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={selectedAction === "WALLET_ADD" ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setSelectedAction("WALLET_ADD")}
                    >
                      + Add Credit
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedAction === "WALLET_DEDUCT" ? "destructive" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setSelectedAction("WALLET_DEDUCT")}
                    >
                      - Deduct Funds
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-3.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="bulk-wallet-amount" className="text-xs">
                        Amount (USD per seller)
                      </Label>
                      <Input
                        id="bulk-wallet-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="5.00"
                        value={walletAmount}
                        onChange={(e) => setWalletAmount(e.target.value)}
                        className="h-9 tabular-nums"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulk-wallet-note" className="text-xs">
                        Transaction Note
                      </Label>
                      <Input
                        id="bulk-wallet-note"
                        placeholder="e.g. Festival seller bonus"
                        value={walletNote}
                        onChange={(e) => setWalletNote(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-2">
                    <span>Total batch pool required:</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      ${((parseFloat(walletAmount) || 0) * (stats?.totalMatching ?? 0)).toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STATUS / BAN TAB */}
            {activeTab === "status" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Mass suspend or reactivate targeted accounts in a single click.
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={selectedAction === "MASS_BAN" ? "destructive" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setSelectedAction("MASS_BAN")}
                    >
                      Mass Ban
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedAction === "MASS_UNBAN" ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setSelectedAction("MASS_UNBAN")}
                    >
                      Mass Unban
                    </Button>
                  </div>
                </div>

                {selectedAction === "MASS_BAN" && (
                  <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="size-4" />
                      <p className="text-xs font-semibold">Mass Suspension Warning</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Banning will revoke all active API keys and block store logins for {stats?.totalMatching ?? 0} accounts.
                    </p>
                    <div className="space-y-1">
                      <Label htmlFor="bulk-ban-reason" className="text-xs">
                        Reason for Suspension (Audit Log)
                      </Label>
                      <Input
                        id="bulk-ban-reason"
                        placeholder="Reason for suspension"
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                )}

                {selectedAction === "MASS_UNBAN" && (
                  <div className="rounded-xl border border-success/30 bg-success/10 p-3.5">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="size-4" />
                      <p className="text-xs font-semibold">Account Restoration</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Will restore access and clear suspension status for all currently banned accounts in the selected target group.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* NOTIFY / BROADCAST TAB */}
            {activeTab === "notify" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Send a direct announcement to the in-app chat inbox and push notifications of all targeted sellers.
                </p>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="notify-title" className="text-xs">
                      Notification Title
                    </Label>
                    <Input
                      id="notify-title"
                      placeholder="Title"
                      value={notifyTitle}
                      onChange={(e) => setNotifyTitle(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="notify-message" className="text-xs">
                      Message Content
                    </Label>
                    <Textarea
                      id="notify-message"
                      rows={3}
                      placeholder="Enter announcement message..."
                      value={notifyMessage}
                      onChange={(e) => setNotifyMessage(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="notify-url" className="text-xs">
                      Action URL (Optional)
                    </Label>
                    <Input
                      id="notify-url"
                      placeholder="/app or /app/seller"
                      value={notifyUrl}
                      onChange={(e) => setNotifyUrl(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Action Summary Box */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 size-4 text-primary shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  Selected: {currentDesc.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {currentDesc.details}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="border-t border-border/40 bg-muted/20 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (confirmStep) {
                setConfirmStep(false);
              } else {
                onOpenChange(false);
              }
            }}
          >
            {confirmStep ? "Back" : "Cancel"}
          </Button>

          {!confirmStep ? (
            <Button
              type="button"
              disabled={submitting || (stats?.totalMatching ?? 0) === 0}
              onClick={() => setConfirmStep(true)}
              className="gap-1.5 shadow-sm shadow-primary/25"
            >
              <Zap className="size-3.5" />
              Preview &amp; Apply
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submitting}
              variant={
                selectedAction === "MASS_BAN" ||
                selectedAction === "REVOKE_ALL_CAPS" ||
                selectedAction === "WALLET_DEDUCT"
                  ? "destructive"
                  : "default"
              }
              onClick={() => void handleExecute()}
              className="gap-1.5 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Applying to {stats?.totalMatching ?? 0} accounts…
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Confirm &amp; Execute on {stats?.totalMatching ?? 0} Sellers
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
