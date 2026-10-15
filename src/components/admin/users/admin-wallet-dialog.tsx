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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const QUICK_AMOUNTS = [5, 10, 25, 50, 100] as const;

type WalletMode = "add" | "cut";

export function AdminWalletDialog({
  open,
  onOpenChange,
  username,
  currentBalance,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  currentBalance: number;
  pending: boolean;
  onSubmit: (payload: { amount: number; note?: string }) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<WalletMode>("add");
  const [amount, setAmount] = useState("10");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setMode("add");
      setAmount("10");
      setNote("");
    }
  }, [open]);

  const parsed = Number(amount);
  const signedUsd =
    Number.isFinite(parsed) && parsed > 0
      ? mode === "add"
        ? parsed
        : -parsed
      : 0;

  const nextBalance = useMemo(() => {
    if (!signedUsd) return currentBalance;
    return currentBalance + usdToMicrocents(signedUsd);
  }, [currentBalance, signedUsd]);

  const invalidCut =
    mode === "cut" &&
    Number.isFinite(parsed) &&
    parsed > 0 &&
    nextBalance < 0;

  async function handleSubmit() {
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    if (invalidCut) return;
    const ok = await onSubmit({
      amount: signedUsd,
      note: note.trim() || undefined,
    });
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92dvh,640px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Wallet className="size-5" />
            </div>
            <DialogTitle className="text-lg">Adjust wallet</DialogTitle>
            <DialogDescription>
              Add or cut balance for{" "}
              <span className="font-medium text-foreground">@{username}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Current balance
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
              {formatMoney(currentBalance)}
            </p>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as WalletMode)}>
            <TabsList className="grid h-10 w-full grid-cols-2">
              <TabsTrigger value="add" className="gap-1.5">
                <ArrowUpRight className="size-3.5" />
                Add balance
              </TabsTrigger>
              <TabsTrigger value="cut" className="gap-1.5">
                <ArrowDownLeft className="size-3.5" />
                Cut balance
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="wallet-amount">Amount (USD)</Label>
            <Input
              id="wallet-amount"
              type="number"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
              className="h-11 text-base tabular-nums"
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

          <div className="space-y-2">
            <Label htmlFor="wallet-note">Note (optional)</Label>
            <Input
              id="wallet-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                mode === "add" ? "Bonus credit…" : "Correction / refund…"
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">After adjustment</p>
              <p
                className={`text-lg font-semibold tabular-nums ${
                  invalidCut ? "text-destructive" : "text-foreground"
                }`}
              >
                {formatMoney(nextBalance)}
              </p>
            </div>
            <BadgePreview
              mode={mode}
              amount={Number.isFinite(parsed) && parsed > 0 ? parsed : 0}
            />
          </div>
          {invalidCut ? (
            <p className="text-xs text-destructive">
              Cut exceeds current wallet balance.
            </p>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              pending ||
              !Number.isFinite(parsed) ||
              parsed <= 0 ||
              invalidCut
            }
            variant={mode === "cut" ? "destructive" : "default"}
            onClick={() => void handleSubmit()}
          >
            {pending
              ? "Saving…"
              : mode === "add"
                ? "Add balance"
                : "Cut balance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BadgePreview({ mode, amount }: { mode: WalletMode; amount: number }) {
  if (!amount) {
    return (
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
        No change
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
        mode === "add"
          ? "bg-success/15 text-success"
          : "bg-destructive/15 text-destructive"
      }`}
    >
      {mode === "add" ? "+" : "−"}${amount.toFixed(2)}
    </span>
  );
}
