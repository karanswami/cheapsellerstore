"use client";

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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type SubSellerRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  walletBalance: number;
  banned: boolean;
  createdAt: string;
};

type WalletMode = "add" | "cut";

const QUICK_AMOUNTS = [5, 10, 25, 50] as const;

export function SubSellerDetailDialog({
  sub,
  open,
  onOpenChange,
  canManage,
  canFund,
  pending,
  onToggleStatus,
  onAdjustBalance,
  onDelete,
}: {
  sub: SubSellerRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  canFund: boolean;
  pending: boolean;
  onToggleStatus: (banned: boolean) => Promise<boolean>;
  onAdjustBalance: (amountUsd: number) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const [mode, setMode] = useState<WalletMode>("add");
  const [amount, setAmount] = useState("5");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("add");
      setAmount("5");
      setConfirmDelete(false);
    }
  }, [open, sub?.id]);

  const parsed = Number(amount);
  const signedUsd =
    Number.isFinite(parsed) && parsed > 0
      ? mode === "add"
        ? parsed
        : -parsed
      : 0;

  const nextBalance = useMemo(() => {
    if (!sub || !signedUsd) return sub?.walletBalance ?? 0;
    return sub.walletBalance + usdToMicrocents(signedUsd);
  }, [sub, signedUsd]);

  const invalidCut =
    mode === "cut" &&
    Number.isFinite(parsed) &&
    parsed > 0 &&
    nextBalance < 0;

  async function handleFund() {
    if (!signedUsd || invalidCut) return;
    const ok = await onAdjustBalance(signedUsd);
    if (ok) onOpenChange(false);
  }

  async function handleDelete() {
    const ok = await onDelete();
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {sub ? (
          <>
            <div className="shrink-0 border-b border-border bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
              <DialogHeader className="gap-1.5 pr-8 text-left">
                <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <UserRound className="size-5" />
                </div>
                <DialogTitle className="text-lg truncate">
                  {sub.name || `@${sub.username}`}
                </DialogTitle>
                <DialogDescription>
                  @{sub.username} · {sub.email}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <Wallet className="size-3.5" />
                  Wallet balance
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
                  {formatMoney(sub.walletBalance)}
                </p>
              </div>

              {canManage ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Account status</p>
                    <p className="text-xs text-muted-foreground">
                      {sub.banned
                        ? "Off — cannot sign in"
                        : "On — active account"}
                    </p>
                  </div>
                  <Switch
                    checked={!sub.banned}
                    disabled={pending}
                    onCheckedChange={(on) => void onToggleStatus(!on)}
                  />
                </div>
              ) : null}

              {canFund ? (
                <div className="space-y-3 rounded-xl border border-border p-3.5">
                  <p className="text-sm font-medium">Adjust balance</p>
                  <Tabs
                    value={mode}
                    onValueChange={(v) => setMode(v as WalletMode)}
                  >
                    <TabsList className="grid h-10 w-full grid-cols-2">
                      <TabsTrigger value="add" className="gap-1.5">
                        <ArrowUpRight className="size-3.5" />
                        Add
                      </TabsTrigger>
                      <TabsTrigger value="cut" className="gap-1.5">
                        <ArrowDownLeft className="size-3.5" />
                        Remove
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="space-y-2">
                    <Label htmlFor="sub-fund-amount">Amount (USD)</Label>
                    <Input
                      id="sub-fund-amount"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-10 tabular-nums"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_AMOUNTS.map((q) => (
                        <Button
                          key={q}
                          type="button"
                          size="sm"
                          variant={amount === String(q) ? "default" : "outline"}
                          onClick={() => setAmount(String(q))}
                        >
                          ${q}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">After</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        invalidCut ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {formatMoney(nextBalance)}
                    </span>
                  </div>
                  {invalidCut ? (
                    <p className="text-xs text-destructive">
                      Remove exceeds reseller balance.
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    className="w-full"
                    disabled={
                      pending ||
                      !Number.isFinite(parsed) ||
                      parsed <= 0 ||
                      invalidCut
                    }
                    variant={mode === "cut" ? "destructive" : "default"}
                    onClick={() => void handleFund()}
                  >
                    {pending
                      ? "Saving…"
                      : mode === "add"
                        ? "Add balance"
                        : "Remove balance"}
                  </Button>
                </div>
              ) : null}

              {canManage ? (
                <>
                  <Separator />
                  {!confirmDelete ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={pending}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete reseller
                    </Button>
                  ) : (
                    <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
                      <p className="text-sm font-medium text-destructive">
                        Delete @{sub.username}?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Remaining balance returns to your wallet. This cannot be
                        undone.
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
                  )}
                </>
              ) : null}

              {!canManage && !canFund ? (
                <p className="text-center text-sm text-muted-foreground">
                  No manage or fund permissions on this account.
                </p>
              ) : null}
            </div>

            <DialogFooter className="mx-0 mb-0 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
