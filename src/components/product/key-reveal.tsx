"use client";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function KeyReveal({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!code) return;
    const ok = await copyToClipboard(code);
    if (!ok) {
      toast.error("Could not copy key");
      return;
    }
    setCopied(true);
    toast.success("Key copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-sm text-success">
        {code || "—"}
      </code>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Copy key"
        onClick={copy}
        disabled={!code}
      >
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}
