"use client";

import { formatPayAmount } from "@/components/app/deposit-method-meta";
import styles from "@/components/app/deposit-ui.module.css";
import { useSiteIcons } from "@/components/theme/site-icons-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import type { PublicManualDepositMethod } from "@/types/manual-deposit";
import {
  defaultManualCurrencyMeta,
  resolveManualMethodLogoSrc,
} from "@/types/manual-deposit";
import { cn } from "@/lib/utils";
import { Copy, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "@/lib/toast";

type ManualDepositDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: PublicManualDepositMethod | null;
  amount: number;
  usdEstimate: number | null;
  onSubmitted: () => void;
};

export function ManualDepositDialog({
  open,
  onOpenChange,
  method,
  amount,
  usdEstimate,
  onSubmitted,
}: ManualDepositDialogProps) {
  const { getIcon } = useSiteIcons();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setPreview(null);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (!next && !pending) reset();
    onOpenChange(next);
  }

  function copyText(label: string, value: string) {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }

  function onFileChange(next: File | null) {
    setFile(next);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function submit() {
    if (!method || !file) {
      toast.error("Upload your payment screenshot to continue.");
      return;
    }

    setPending(true);
    toast.loading("Uploading proof…", { id: "manual-dep" });
    try {
      const form = new FormData();
      form.append("file", file);
      const upRes = await fetch("/api/support/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const upJson = (await upRes.json()) as {
        data?: { upload: { url: string } };
        error?: { message: string };
      };
      if (!upRes.ok || !upJson.data?.upload?.url) {
        toast.error(upJson.error?.message ?? "Could not upload image", {
          id: "manual-dep",
        });
        return;
      }

      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          manualMethodKey: method.id,
          amount,
          proofImage: upJson.data.upload.url,
        }),
      });
      const json = (await res.json()) as {
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Deposit failed", { id: "manual-dep" });
        return;
      }

      toast.success("Submitted — awaiting admin review", { id: "manual-dep" });
      reset();
      onOpenChange(false);
      onSubmitted();
    } finally {
      setPending(false);
    }
  }

  if (!method) return null;

  const symbol =
    method.currencySymbol?.trim() ||
    defaultManualCurrencyMeta(method.currency).currencySymbol;
  const logoSrc = resolveManualMethodLogoSrc(method, getIcon);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt=""
                className="size-8 shrink-0 rounded-lg object-contain ring-1 ring-border"
              />
              {method.name}
            </DialogTitle>
            <DialogDescription>
              Pay the exact amount, upload your screenshot, then submit for admin
              review.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="rounded-xl bg-primary/[0.06] px-3.5 py-3 ring-1 ring-primary/20">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Amount to pay
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatPayAmount(amount, method.currency, symbol)}
            </p>
            {usdEstimate != null && usdEstimate > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                ≈ {formatMoney(usdToMicrocents(usdEstimate))} wallet credit
              </p>
            ) : null}
          </div>

          {method.qrUrl ? (
            <div className="space-y-2 rounded-xl bg-muted/25 px-3 py-3 ring-1 ring-foreground/8">
              <div className="mx-auto flex size-40 items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-foreground/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={method.qrUrl}
                  alt="Payment QR"
                  className="size-full object-contain"
                />
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                Scan to pay with {method.name}
              </p>
            </div>
          ) : null}

          {method.accountNumber ? (
            <div className="rounded-xl bg-muted/25 px-3.5 py-3 ring-1 ring-foreground/8">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Account number
                </p>
                <button
                  type="button"
                  onClick={() => copyText("Account", method.accountNumber!)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
                >
                  <Copy className="size-3" />
                  Copy
                </button>
              </div>
              <p className="mt-1.5 break-all font-mono text-sm font-semibold">
                {method.accountNumber}
              </p>
            </div>
          ) : null}

          {method.instructions ? (
            <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
              {method.instructions}
            </p>
          ) : null}

          <div className="space-y-2 rounded-xl border border-dashed border-border/40 bg-muted/25 p-3">
            <p className="text-xs font-medium">Payment screenshot (required)</p>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Proof preview"
                className="mx-auto max-h-32 w-auto max-w-full rounded-lg object-contain ring-1 ring-foreground/10"
              />
            ) : (
              <p className="text-center text-[11px] text-muted-foreground">
                Upload a clear screenshot of your successful payment.
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={cn(
                styles.glowBtnOutline,
                "flex h-11 w-full items-center justify-center gap-2 text-sm",
              )}
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" />
              {file ? "Replace screenshot" : "Choose screenshot"}
            </button>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-3.5 sm:px-5">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={pending || !file}
            onClick={() => void submit()}
          >
            {pending ? (
              <>
                <Spinner className="size-4" />
                Submitting…
              </>
            ) : (
              "Submit deposit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
