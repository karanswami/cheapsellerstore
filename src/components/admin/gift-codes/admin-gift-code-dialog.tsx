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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Gift, UserRound } from "lucide-react";

export type GiftCodeFormState = {
  amountUsd: string;
  code: string;
  restrictUser: boolean;
  assignedUsername: string;
  note: string;
  expiresAt: string;
};

export const emptyGiftCodeForm: GiftCodeFormState = {
  amountUsd: "10",
  code: "",
  restrictUser: false,
  assignedUsername: "",
  note: "",
  expiresAt: "",
};

export function AdminGiftCodeDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: GiftCodeFormState;
  onFormChange: (next: GiftCodeFormState) => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  function patch<K extends keyof GiftCodeFormState>(
    key: K,
    value: GiftCodeFormState[K],
  ) {
    onFormChange({ ...form, [key]: value });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Gift className="size-5" />
            </div>
            <DialogTitle className="text-lg">Create gift code</DialogTitle>
            <DialogDescription>
              Credits USD wallet balance (Binance USD). Leave user blank for
              first-claimer, or lock to one username.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="gift-amount">Amount (USD)</Label>
            <Input
              id="gift-amount"
              type="number"
              inputMode="decimal"
              min={0.01}
              step="0.01"
              value={form.amountUsd}
              onChange={(e) => patch("amountUsd", e.target.value)}
              placeholder="10.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift-code">Code (optional)</Label>
            <Input
              id="gift-code"
              value={form.code}
              onChange={(e) => patch("code", e.target.value.toUpperCase())}
              placeholder="Auto-generate if empty"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <p className="text-[11px] text-muted-foreground">
              Letters and numbers only. Blank → CHEAP-XXXX-XXXX.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <UserRound className="size-3.5 text-primary" aria-hidden />
                Restrict to one user
              </p>
              <p className="text-[11px] text-muted-foreground">
                Off = anyone can claim (first wins)
              </p>
            </div>
            <Switch
              checked={form.restrictUser}
              onCheckedChange={(v) => patch("restrictUser", v)}
            />
          </div>

          {form.restrictUser ? (
            <div className="space-y-2">
              <Label htmlFor="gift-user">Username</Label>
              <Input
                id="gift-user"
                value={form.assignedUsername}
                onChange={(e) => patch("assignedUsername", e.target.value)}
                placeholder="@username"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="gift-expires">Expires (optional)</Label>
            <Input
              id="gift-expires"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => patch("expiresAt", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift-note">Note (optional)</Label>
            <Textarea
              id="gift-note"
              value={form.note}
              onChange={(e) => patch("note", e.target.value)}
              placeholder="Internal note — VIP top-up, contest prize…"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-5 py-3 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={pending}>
            {pending ? "Creating…" : "Create code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
