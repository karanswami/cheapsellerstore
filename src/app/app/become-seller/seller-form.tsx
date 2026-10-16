"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Panel } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FIELDS: { key: string; label: string; required?: boolean; placeholder?: string }[] = [
  { key: "fullName", label: "Full name", required: true },
  { key: "phone", label: "Phone / WhatsApp", required: true },
  { key: "country", label: "Country", required: true },
  { key: "telegram", label: "Telegram username", required: true, placeholder: "@username" },
  { key: "facebookUrl", label: "Facebook profile link", required: true, placeholder: "https://facebook.com/…" },
  { key: "sellingPlatform", label: "Where will you sell?", required: true, placeholder: "Telegram, Discord, website…" },
  { key: "followerCount", label: "Members / followers", required: true, placeholder: "e.g. 2,500" },
  { key: "experience", label: "Selling experience", placeholder: "e.g. 2 years" },
  { key: "youtubeUrl", label: "YouTube channel", placeholder: "https://" },
  { key: "telegramChannelUrl", label: "Telegram channel / group", placeholder: "https://t.me/…" },
  { key: "websiteUrl", label: "Website", placeholder: "https://" },
];

export function BecomeSellerForm({ lastStatus }: { lastStatus: string | null }) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    for (const f of FIELDS) if (f.required && !v[f.key]?.trim()) return toast.error(`${f.label} is required.`);
    if (reason.trim().length < 10) return toast.error("Tell us why you want to join (min 10 characters).");
    setBusy(true);
    try {
      const res = await fetch("/api/reseller-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not submit.");
      toast.success("Application submitted.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit.");
      setBusy(false);
    }
  }

  return (
    <Panel title="Seller application">
      {lastStatus === "REJECTED" ? <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">Your previous application was rejected — you can apply again.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {f.label}
              {f.required ? " *" : ""}
            </span>
            <Input value={v[f.key] ?? ""} onChange={(e) => setV((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
          </label>
        ))}
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Why do you want to join? *</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={2000} className="w-full rounded-lg border bg-input px-3 py-2 text-sm outline-none focus-visible:border-primary" />
        </label>
      </div>
      <Button onClick={submit} disabled={busy} className="mt-5">
        {busy ? <Loader2 className="animate-spin" /> : <Send />} Submit application
      </Button>
    </Panel>
  );
}
