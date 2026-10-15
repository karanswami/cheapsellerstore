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
import { UserPlus } from "lucide-react";

export type CreateSubSellerForm = {
  username: string;
  email: string;
  password: string;
  name: string;
  initialUsd: string;
};

export function CreateSubSellerDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  pending,
  onSubmit,
  minFundingUsd = 5,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateSubSellerForm;
  onFormChange: (next: CreateSubSellerForm) => void;
  pending: boolean;
  onSubmit: () => void;
  minFundingUsd?: number;
}) {
  const minLabel = minFundingUsd.toFixed(minFundingUsd % 1 === 0 ? 0 : 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,640px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 border-b border-border bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <UserPlus className="size-5" />
            </div>
            <DialogTitle className="text-lg">Add reseller</DialogTitle>
            <DialogDescription>
              Create a reseller account and fund at least ${minLabel} from your
              wallet.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-1.5">
            <Label htmlFor="sub-username">Username</Label>
            <Input
              id="sub-username"
              value={form.username}
              onChange={(e) =>
                onFormChange({ ...form, username: e.target.value })
              }
              placeholder="seller_username"
              className="h-10"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-email">Email</Label>
            <Input
              id="sub-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                onFormChange({ ...form, email: e.target.value })
              }
              placeholder="seller@email.com"
              className="h-10"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-password">Password</Label>
            <Input
              id="sub-password"
              type="password"
              value={form.password}
              onChange={(e) =>
                onFormChange({ ...form, password: e.target.value })
              }
              placeholder="••••••••"
              className="h-10"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-name">Display name (optional)</Label>
            <Input
              id="sub-name"
              value={form.name}
              onChange={(e) =>
                onFormChange({ ...form, name: e.target.value })
              }
              placeholder="Display name"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-balance">Initial balance (USD)</Label>
            <Input
              id="sub-balance"
              type="number"
              min={minFundingUsd}
              step="0.01"
              value={form.initialUsd}
              onChange={(e) =>
                onFormChange({ ...form, initialUsd: e.target.value })
              }
              className="h-10 tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Minimum funding is ${minLabel} — transferred from your wallet.
            </p>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={onSubmit}>
            {pending ? "Creating…" : "Create reseller"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
