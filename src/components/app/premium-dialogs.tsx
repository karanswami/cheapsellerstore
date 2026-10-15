"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import { canChangeUsername } from "@/lib/premium-utils";
import type { SafeUser } from "@/types/user";
import {
  AtSign,
  Crown,
  Gift,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

type PurchaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceUsd: number;
  walletBalance: number;
  onPurchased: (user: SafeUser) => void;
};

export function PremiumPurchaseDialog({
  open,
  onOpenChange,
  priceUsd,
  walletBalance,
  onPurchased,
}: PurchaseDialogProps) {
  const [pending, setPending] = useState(false);
  const priceMicro = usdToMicrocents(priceUsd);
  const canAfford = walletBalance >= priceMicro;

  async function onConfirm() {
    setPending(true);
    try {
      const res = await fetch("/api/premium/purchase", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: { user: SafeUser };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.user) {
        toast.error(json.error?.message ?? "Could not unlock Premium.");
        return;
      }
      onPurchased(json.data.user);
      onOpenChange(false);
      toast.success("Premium unlocked · email verified");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Crown className="size-5" />}
      title="Unlock VIP Lifetime"
      description="One-time wallet purchase. Unlocks 0% API fees, 300 RPM rate limit, free Platform API keys, custom subdomain storefront, gold verified badge, and VIP priority support."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !canAfford}
            onClick={() => void onConfirm()}
          >
            {pending ? "Unlocking…" : `Pay ${formatMoney(priceMicro)}`}
          </Button>
        </>
      }
    >
      <div className="space-y-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Price</span>
          <span className="font-medium tabular-nums">
            {formatMoney(priceMicro)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Your wallet</span>
          <span className="font-medium tabular-nums">
            {formatMoney(walletBalance)}
          </span>
        </div>
      </div>
      {!canAfford ? (
        <p className="text-sm text-destructive">
          Not enough balance. Deposit more, then unlock VIP.
        </p>
      ) : (
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Included VIP lifetime perks:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>💎 <span className="text-emerald-400 font-medium">0% Platform API Fee</span> (0% surcharge on key purchases)</li>
            <li>🚀 <span className="text-foreground font-medium">300 RPM rate limit</span> elevated high-speed throughput tier</li>
            <li>🔑 <span className="text-foreground font-medium">Free Platform API key</span> slot for automation &amp; bot integrations</li>
            <li>🌐 <span className="text-foreground font-medium">Custom Subdomain</span> (<code className="text-primary font-mono text-[11px]">username.dripclientofficial.dev</code>)</li>
            <li>👑 <span className="text-amber-300 font-medium">Gold Verified Badge</span> &amp; lifetime email/account trust seal</li>
            <li>⚡ <span className="text-foreground font-medium">VIP Priority Support</span> queue for key &amp; deposit tickets</li>
            <li>🎨 <span className="text-foreground font-medium">Full Storefront Customization</span> (Cyber themes, tiles, custom handle &amp; invite code)</li>
          </ul>
        </div>
      )}
    </DialogShell>
  );
}

type UsernameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SafeUser;
  onUpdated: (user: SafeUser) => void;
};

export function UsernameChangeDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: UsernameDialogProps) {
  const [username, setUsername] = useState(user.username);
  const [pending, setPending] = useState(false);
  const cooldown = canChangeUsername(user.usernameChangedAt);

  useEffect(() => {
    if (!open) return;
    setUsername(user.username);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only seed
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/premium/username", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const json = (await res.json()) as {
        data?: { user: SafeUser };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.user) {
        toast.error(json.error?.message ?? "Could not change username.");
        return;
      }
      onUpdated(json.data.user);
      onOpenChange(false);
      toast.success("Username updated");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<AtSign className="size-5" />}
      title="Change username"
      description="Your public profile URL uses this handle. 30-day cooldown after each change."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="username-form"
            disabled={pending || !cooldown.ok}
          >
            {pending ? "Saving…" : "Save username"}
          </Button>
        </>
      }
    >
      <form id="username-form" onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="premium-username">Username</Label>
          <Input
            id="premium-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_]+"
            required
            disabled={!cooldown.ok}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            3–32 characters · a-z, 0-9, underscore
          </p>
        </div>
        {!cooldown.ok && cooldown.nextAt ? (
          <p className="text-sm text-muted-foreground">
            Next change available{" "}
            {cooldown.nextAt.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            .
          </p>
        ) : null}
      </form>
    </DialogShell>
  );
}

type ReferralCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SafeUser;
  onUpdated: (user: SafeUser) => void;
};

export function CustomReferralDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: ReferralCodeDialogProps) {
  const [code, setCode] = useState(user.referralCode ?? "");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(user.referralCode ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only seed
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/premium/referral-code", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: code }),
      });
      const json = (await res.json()) as {
        data?: { user: SafeUser };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.user) {
        toast.error(json.error?.message ?? "Could not set referral code.");
        return;
      }
      onUpdated(json.data.user);
      onOpenChange(false);
      toast.success("Referral code updated");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Gift className="size-5" />}
      title="Custom referral code"
      description="Vanity invite code used in your share link."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" form="referral-code-form" disabled={pending}>
            {pending ? "Saving…" : "Save code"}
          </Button>
        </>
      }
    >
      <form id="referral-code-form" onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="premium-ref">Referral code</Label>
          <Input
            id="premium-ref"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            minLength={4}
            maxLength={16}
            pattern="[a-zA-Z0-9_]+"
            required
            className="h-11 uppercase"
          />
          <p className="text-xs text-muted-foreground">
            4–16 characters · letters, numbers, underscore
          </p>
        </div>
      </form>
    </DialogShell>
  );
}

type PurchasedProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  rating: number | null;
};

type FeaturedProductsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SafeUser;
  onUpdated: (user: SafeUser) => void;
};

export function FeaturedProductsDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: FeaturedProductsDialogProps) {
  const [products, setProducts] = useState<PurchasedProduct[]>([]);
  const [selected, setSelected] = useState<string[]>(user.featuredProducts);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(user.featuredProducts);
    setLoading(true);
    void fetch("/api/premium/purchased-products", { credentials: "include" })
      .then(async (res) => {
        const json = (await res.json()) as {
          data?: { products: PurchasedProduct[] };
          error?: { message?: string };
        };
        if (!res.ok) {
          toast.error(json.error?.message ?? "Could not load products.");
          setProducts([]);
          return;
        }
        setProducts(json.data?.products ?? []);
      })
      .catch(() => {
        toast.error("Network error. Try again.");
        setProducts([]);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only seed + fetch
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) {
        toast.message("You can feature up to 6 products");
        return prev;
      }
      return [...prev, id];
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredProducts: selected }),
      });
      const json = (await res.json()) as {
        data?: { user: SafeUser };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.user) {
        toast.error(json.error?.message ?? "Could not save featured products.");
        return;
      }
      onUpdated(json.data.user);
      onOpenChange(false);
      toast.success("Featured products updated");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<ShoppingBag className="size-5" />}
      title="Featured products"
      description="Show up to 6 products you have purchased on your public profile."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" form="featured-form" disabled={pending || loading}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="featured-form" onSubmit={onSubmit} className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading purchases…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Buy a product first, then feature it here.
          </p>
        ) : (
          products.map((product) => {
            const on = selected.includes(product.id);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggle(product.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                  on
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/50",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="size-4 text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {product.name}
                </span>
                <span
                  className={cn(
                    "size-4 shrink-0 rounded-full border",
                    on ? "border-primary bg-primary" : "border-muted-foreground/40",
                  )}
                  aria-hidden
                />
              </button>
            );
          })
        )}
      </form>
    </DialogShell>
  );
}
