"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { copyToClipboard } from "@/lib/clipboard";
import { formatMoney, type Currency } from "@/lib/currencies";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type OrderSuccessItem = {
  id: string;
  productTitle: string;
  durationLabel: string;
  code: string | null;
  unitPrice: number;
  androidId?: string | null;
};

export type OrderSuccessProps = {
  orderId: string;
  total: number;
  currency: Currency;
  createdAt: string;
  items: OrderSuccessItem[];
};

function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Product + duration on one line, key on the next; blank line between entries. */
function formatKeysTxt(
  rows: { productTitle: string; durationLabel: string; code: string | null }[],
) {
  return rows
    .filter((r): r is typeof r & { code: string } => Boolean(r.code))
    .map((r) => `${r.productTitle} — ${r.durationLabel}\n${r.code}`)
    .join("\n\n");
}

export function OrderSuccess({
  orderId,
  total,
  currency,
  createdAt,
  items,
}: OrderSuccessProps) {
  const { clearCart, closeCart } = useCart();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    clearCart();
    closeCart();
  }, [clearCart, closeCart]);

  const codes = items.map((i) => i.code).filter((c): c is string => Boolean(c));

  async function copyCode(id: string, code: string) {
    const ok = await copyToClipboard(code);
    if (!ok) {
      toast.error("Could not copy key");
      return;
    }
    setCopiedId(id);
    toast.success("Key copied");
    window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
  }

  async function copyAll() {
    if (codes.length === 0) {
      toast.error("No keys to copy");
      return;
    }
    const ok = await copyToClipboard(codes.join("\n"));
    if (!ok) {
      toast.error("Could not copy keys");
      return;
    }
    setCopiedAll(true);
    toast.success(`Copied ${codes.length} key(s)`);
    window.setTimeout(() => setCopiedAll(false), 1600);
  }

  function downloadAll() {
    const content = formatKeysTxt(items);
    if (!content) {
      toast.error("No keys to download");
      return;
    }
    downloadTxt(`drip-order-${orderId.slice(0, 8)}.txt`, content);
    toast.success(`Downloaded ${codes.length} key(s)`);
  }

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-6 sm:py-10">
        <Card size="sm" variant="success">
          <CardHeader className="border-b border-border/40 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/15 text-success shadow-[0_0_24px_-4px_color-mix(in_oklab,var(--success)_40%,transparent)]">
              <CheckCircle2 className="size-7" />
            </span>
            <Badge variant="success" className="mx-auto mt-3 w-fit">
              Order fulfilled
            </Badge>
            <CardTitle className="mt-2 text-xl sm:text-2xl">
              Your keys are ready
            </CardTitle>
            <CardDescription>
              Paid {formatMoney(total, currency)} ·{" "}
              {new Date(createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void copyAll()}>
              {copiedAll ? (
                <Check data-icon="inline-start" />
              ) : (
                <Copy data-icon="inline-start" />
              )}
              Copy all
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={downloadAll}>
              <Download data-icon="inline-start" />
              Download .txt
            </Button>
          </CardContent>
        </Card>

        <Card size="sm" variant="list">
          <CardHeader className="border-b border-border/40 px-(--card-spacing) py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" />
                <CardTitle>License keys</CardTitle>
              </div>
              <Badge variant="secondary">
                {items.length} key{items.length === 1 ? "" : "s"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 py-4">
            {items.map((item, index) => (
              <div key={item.id}>
                {index > 0 ? <Separator className="mb-3" /> : null}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.productTitle}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">{item.durationLabel}</Badge>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatMoney(item.unitPrice, currency)}
                        </span>
                      </div>
                      {item.androidId && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground/70">Android ID:</span> {item.androidId}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm text-success">
                      {item.code ?? "—"}
                    </code>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      disabled={!item.code}
                      aria-label={
                        copiedId === item.id ? "Copied" : "Copy key"
                      }
                      onClick={() => {
                        if (item.code) void copyCode(item.id, item.code);
                      }}
                    >
                      {copiedId === item.id ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex-col gap-2 border-t sm:flex-row">
            <Button type="button" className="w-full sm:flex-1" asChild>
              <Link href="/app/keys">
                <KeyRound data-icon="inline-start" />
                My keys
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:flex-1"
              asChild
            >
              <Link href="/app">
                <ShoppingBag data-icon="inline-start" />
                Back to store
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Order ID{" "}
          <span className="font-mono tabular-nums">{orderId}</span>
        </p>
      </div>
    </main>
  );
}
