"use client";

import {
  CheckoutOrderItems,
  CheckoutTotals,
} from "@/components/checkout/order-details";
import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { formatMoney, Currency } from "@/lib/currencies";
import type { SafeUser } from "@/types/user";
import {
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

/**
 * Wallet-gated checkout — balance from User.walletBalance (live via AuthProvider).
 */
type CheckoutViewProps = {
  user: SafeUser;
};

export function CheckoutView({ user: serverUser }: CheckoutViewProps) {
  const { user: liveUser } = useAuth();
  const user = liveUser ?? serverUser;
  const { items, subtotal, discount, total, promo, stockOk, stockReady, refreshStock, updateAndroidId } =
    useCart();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (items.length > 0) void refreshStock();
  }, [items.length, refreshStock]);

  const walletBalance = user.walletBalance;
  const currency = Currency.USD;
  const canPay = walletBalance >= total && total > 0 && stockOk;
  const shortfall = Math.max(0, total - walletBalance);

  async function placeOrder() {
    const ok = await refreshStock();
    if (!ok) {
      const message = "One or more items are out of stock.";
      setError(message);
      toast.error(message, {
        description: "Pick another product or try again later.",
      });
      return;
    }

    const missingAndroidId = items.find((i) => i.requiresAndroidId && (!i.androidId || i.androidId.trim() === ""));
    if (missingAndroidId) {
      const idLabel = (missingAndroidId.deviceIdName || "").trim() || "Android ID";
      const message = `${idLabel} is required for device-bound items.`;
      setError(message);
      toast.error(`Missing ${idLabel}`, {
        description: `Please enter ${idLabel} for ${missingAndroidId.title}.`,
      });
      return;
    }
    if (walletBalance < total || total <= 0) {
      const message = "Deposit wallet balance to checkout.";
      setError(message);
      toast.error("Insufficient wallet balance", {
        description: "Deposit funds before placing an order.",
      });
      return;
    }

    setError(null);
    setPending(true);
    const loadingId = toast.loading("Placing your order…");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: items.map((i) => ({
            durationId: i.durationId,
            quantity: i.quantity,
            ...(i.requiresAndroidId ? { androidId: i.androidId } : {}),
          })),
          ...(promo?.code ? { promoCode: promo.code } : {}),
        }),
      });
      const json = (await res.json()) as {
        data?: { orderId: string; accessToken: string };
        error?: { code: string; message: string };
      };
      if (!res.ok) {
        const message = json.error?.message ?? "Checkout failed.";
        setError(message);
        toast.error(message, { id: loadingId });
        setPending(false);
        void refreshStock();
        return;
      }
      toast.success("Order placed", {
        id: loadingId,
        description: "Your keys are ready.",
      });
      // Keep pending UI until navigate; checkout clears on the success page.
      router.replace(
        `/order/${json.data!.orderId}?token=${json.data!.accessToken}`,
      );
    } catch {
      const message = "Network error. Try again.";
      setError(message);
      toast.error(message, { id: loadingId });
      setPending(false);
    }
  }

  if (pending) {
    return (
      <main className="flex-1">
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-6 sm:py-10">
          <Card size="sm">
            <CardHeader className="items-center text-center border-b">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="size-6 animate-pulse" />
              </span>
              <CardTitle className="mt-2">Claiming your keys…</CardTitle>
              <CardDescription>
                Debiting wallet and delivering licenses. Do not close this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                This usually takes a second.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const flashSaved = items.reduce((sum, item) => {
    if (item.listPrice != null && item.listPrice > item.unitPrice) {
      return sum + (item.listPrice - item.unitPrice) * item.quantity;
    }
    return sum;
  }, 0);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label="Back to store"
            onClick={() => router.push("/app")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            Checkout
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
          <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-lg font-bold">
                Your order
              </h2>
              <Badge variant="secondary">
                {items.length} item{items.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <CheckoutOrderItems items={items} updateAndroidId={updateAndroidId} />
            <Separator />
            <CheckoutTotals
              subtotal={subtotal}
              discount={discount}
              total={total}
              currency={currency}
              promoCode={promo?.code}
              flashSaved={flashSaved}
            />
          </section>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-border bg-[image:var(--gradient-card)] p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Wallet className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Wallet balance</p>
                  <p className="font-heading text-2xl font-extrabold tabular-nums">
                    {formatMoney(walletBalance, currency)}
                  </p>
                </div>
                <Badge variant={canPay ? "success" : "warning"}>
                  {canPay ? "Enough" : "Low"}
                </Badge>
              </div>
              <div className="mt-4">
                {canPay ? (
                  <p className="text-sm text-muted-foreground">
                    You have enough to pay for this order.
                  </p>
                ) : !stockReady ? (
                  <p className="text-sm text-muted-foreground">Checking stock…</p>
                ) : !stockOk ? (
                  <Alert variant="warning">
                    <AlertCircle />
                    <AlertTitle>Out of stock</AlertTitle>
                    <AlertDescription>
                      This item is sold out. Choose another product before
                      paying.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="warning">
                    <AlertCircle />
                    <AlertTitle>Deposit required</AlertTitle>
                    <AlertDescription>
                      Add {formatMoney(shortfall, currency)} to your wallet to pay.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Checkout failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {canPay ? (
                <Button
                  type="button"
                  size="lg"
                  disabled={pending}
                  onClick={placeOrder}
                  className="h-12 w-full rounded-full text-base font-bold"
                >
                  Pay {formatMoney(total, currency)}
                </Button>
              ) : !stockOk ? (
                <Button type="button" size="lg" asChild className="h-12 w-full rounded-full">
                  <Link href="/app">Back to store</Link>
                </Button>
              ) : user.depositsEnabled ? (
                <Button type="button" size="lg" asChild className="h-12 w-full rounded-full text-base font-bold">
                  <Link href="/app/deposit">
                    <Wallet data-icon="inline-start" className="size-4" />
                    Add funds
                  </Link>
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {user.role === "RESELLER"
                    ? "Not enough balance. Ask your seller to top up your wallet."
                    : "Not enough balance. Self-serve deposits are disabled on this account."}
                </p>
              )}
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-success" />
                Keys appear right after payment
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
