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

export function AdminCreateSubsellerDialog({
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b border-border/40 bg-muted/40 px-5 py-4">
          <DialogHeader className="gap-1.5">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <UserPlus className="size-5" />
            </div>
            <DialogTitle className="text-lg">Create reseller</DialogTitle>
            <DialogDescription>
              New reseller is attached to your admin account for
              referral and commission.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3.5 px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-username">Username</Label>
            <Input
              id="create-username"
              value={form.username}
              onChange={(e) =>
                onFormChange({ ...form, username: e.target.value })
              }
              placeholder="seller_username"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                onFormChange({ ...form, email: e.target.value })
              }
              placeholder="seller@email.com"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-password">Password</Label>
            <Input
              id="create-password"
              type="password"
              value={form.password}
              onChange={(e) =>
                onFormChange({ ...form, password: e.target.value })
              }
              placeholder="••••••••"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-name">Display name (optional)</Label>
            <Input
              id="create-name"
              value={form.name}
              onChange={(e) =>
                onFormChange({ ...form, name: e.target.value })
              }
              placeholder="Display name"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-balance">Initial balance USD</Label>
            <Input
              id="create-balance"
              type="number"
              min={minFundingUsd}
              value={form.initialUsd}
              onChange={(e) =>
                onFormChange({ ...form, initialUsd: e.target.value })
              }
              className="h-10 tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Minimum funding is ${minLabel}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={onSubmit}
          >
            {pending ? "Creating…" : "Create reseller"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
