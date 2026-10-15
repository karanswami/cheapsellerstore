"use client";

import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/components/auth/auth-provider";
import { CheckoutSkeleton } from "@/components/checkout/checkout-skeleton";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const { user, loading, openAuth } = useAuth();
  const { items, hydrated } = useCart();
  const router = useRouter();

  if (loading || !hydrated) {
    return <CheckoutSkeleton />;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md flex-1 px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Login to checkout</CardTitle>
            <CardDescription>
              Sign in to complete your purchase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              onSuccess={() => router.refresh()}
              onRequires2fa={() => openAuth("2fa", "/checkout")}
              onSwitchToRegister={() => openAuth("register", "/checkout")}
              onForgotPassword={() => openAuth("forgot", "/checkout")}
            />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16">
        <Card className="w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>Cart is empty</CardTitle>
            <CardDescription>
              Add a product before checking out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/app">Back to store</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <CheckoutView user={user} />;
}
