"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, ExternalLink, Eye, Globe, Megaphone, Send, ShieldCheck, Sparkles, Store, Users, type LucideIcon } from "lucide-react";
import { ConfirmDialog, Field, SubmitButton, ToggleRow, adminFetch, errMsg } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type Audience = "ALL" | "USER" | "SELLER" | "ADMIN";

export const AUDIENCES: Record<Audience, { label: string; hint: string; icon: LucideIcon; badge: "default" | "highlight" | "warning" | "destructive" }> = {
  ALL: { label: "Everyone", hint: "All active accounts", icon: Globe, badge: "default" },
  USER: { label: "Customers", hint: "Regular users", icon: Users, badge: "highlight" },
  SELLER: { label: "Sellers", hint: "Sellers & resellers", icon: Store, badge: "warning" },
  ADMIN: { label: "Admins", hint: "Staff only", icon: ShieldCheck, badge: "destructive" },
};

export type Draft = { title: string; message: string; actionUrl: string; audience: Audience };

export const EMPTY_DRAFT: Draft = { title: "", message: "", actionUrl: "", audience: "ALL" };

const TEMPLATES: { label: string; icon: string; draft: Draft }[] = [
  {
    label: "New stock",
    icon: "📦",
    draft: { title: "Fresh stock just landed", message: "New keys are now available in the store. Grab yours before they sell out.", actionUrl: "/app/products", audience: "ALL" },
  },
  {
    label: "Price drop",
    icon: "🏷️",
    draft: { title: "Prices just dropped", message: "We lowered prices on selected products. Check the store for the new rates.", actionUrl: "/app/products", audience: "ALL" },
  },
  {
    label: "Maintenance",
    icon: "🛠️",
    draft: { title: "Scheduled maintenance", message: "The store will be briefly unavailable while we run maintenance. Orders and deposits already in progress are safe.", actionUrl: "", audience: "ALL" },
  },
  {
    label: "Deposit bonus",
    icon: "💸",
    draft: { title: "Deposit bonus is live", message: "Add funds today and get extra balance on top. Limited time only.", actionUrl: "/app/deposit", audience: "USER" },
  },
  {
    label: "Seller notice",
    icon: "🤝",
    draft: { title: "Update for sellers", message: "There is a change to the seller program. Please review the details in your dashboard.", actionUrl: "/app", audience: "SELLER" },
  },
];

const TITLE_MAX = 120;
const MESSAGE_MAX = 2000;

function Counter({ value, max }: { value: number; max: number }) {
  return <span className={cn("text-xs tabular-nums", value > max * 0.9 ? "text-warning" : "text-muted-foreground")}>{value}/{max}</span>;
}

/** What the customer sees on their Broadcast page. */
export function BroadcastPreview({ draft }: { draft: Draft }) {
  const aud = AUDIENCES[draft.audience];
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Megaphone className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="solid" shape="pill">
              <Sparkles /> New
            </Badge>
            <Badge variant={aud.badge} shape="pill">
              {aud.label}
            </Badge>
            <span className="text-xs text-muted-foreground">just now</span>
          </div>
          <p className="mt-1.5 break-words font-display text-base font-semibold leading-snug">{draft.title || "Your title appears here"}</p>
          <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">{draft.message || "Write a message and it will show up exactly like this on the customer Broadcast page."}</p>
          {draft.actionUrl ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Take me there <ExternalLink className="size-3.5" />
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Approximation of the OS web-push toast. */
export function PushPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-card p-3 shadow-lg shadow-black/20">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
        <BellRing className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cheap Seller Store · now</p>
        <p className="truncate text-sm font-semibold">{title || "Notification title"}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{body || "Notification text shows up here."}</p>
      </div>
    </div>
  );
}

export function BroadcastComposer({ initial, pushEnabled, onDone }: { initial: Draft; pushEnabled: boolean; onDone: () => void }) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [notify, setNotify] = useState(true);
  const [sendWebPush, setSendWebPush] = useState(pushEnabled);
  const [publishLive, setPublishLive] = useState(true);
  const [confirm, setConfirm] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const valid = draft.title.trim().length > 0 && draft.message.trim().length > 0;
  const aud = AUDIENCES[draft.audience];

  async function send() {
    try {
      const r = await adminFetch<{ sent: number; webPushSent: number }>("/api/admin/broadcast", {
        method: "POST",
        json: {
          title: draft.title.trim(),
          message: draft.message.trim(),
          actionUrl: draft.actionUrl.trim() || null,
          audience: draft.audience,
          notify,
          sendWebPush: sendWebPush && pushEnabled,
          active: publishLive,
        },
      });
      toast.success(publishLive ? `Published to ${aud.label.toLowerCase()}. ${r.sent} notified, ${r.webPushSent} pushed.` : "Saved as hidden draft.");
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Megaphone className="size-5 text-primary" /> New broadcast
        </DialogTitle>
        <DialogDescription>Compose on the left, check the live preview on the right.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Templates</span>
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setDraft(t.draft)}
            className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="grid content-start gap-4">
          <Field label="Audience">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(AUDIENCES) as Audience[]).map((k) => {
                const a = AUDIENCES[k];
                const on = draft.audience === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set("audience", k)}
                    className={cn("rounded-xl border p-3 text-left transition-colors", on ? "border-primary bg-primary/10" : "hover:bg-accent")}
                  >
                    <a.icon className={cn("size-4", on ? "text-primary" : "text-muted-foreground")} />
                    <p className="mt-2 text-sm font-semibold">{a.label}</p>
                    <p className="text-[11px] leading-tight text-muted-foreground">{a.hint}</p>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Title">
            <Input value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={TITLE_MAX} placeholder="Short and clear" />
            <div className="flex justify-end">
              <Counter value={draft.title.length} max={TITLE_MAX} />
            </div>
          </Field>

          <Field label="Message">
            <Textarea value={draft.message} onChange={(e) => set("message", e.target.value)} rows={6} maxLength={MESSAGE_MAX} placeholder="What do your customers need to know?" />
            <div className="flex justify-end">
              <Counter value={draft.message.length} max={MESSAGE_MAX} />
            </div>
          </Field>

          <Field label="Button link (optional)" hint="Internal path like /app/deposit or a full https:// link.">
            <Input value={draft.actionUrl} onChange={(e) => set("actionUrl", e.target.value)} placeholder="/app/deposit" />
          </Field>
        </div>

        <div className="grid content-start gap-4">
          <div className="grid gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Eye className="size-3.5" /> Broadcast page
            </p>
            <BroadcastPreview draft={draft} />
          </div>
          {sendWebPush && pushEnabled ? (
            <div className="grid gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <BellRing className="size-3.5" /> Web push
              </p>
              <PushPreview title={draft.title} body={draft.message.slice(0, 200)} />
            </div>
          ) : null}
          <div className="grid gap-2">
            <ToggleRow label="Visible on Broadcast page" hint="Off saves it as a hidden draft." checked={publishLive} onChange={setPublishLive} />
            <ToggleRow label="In-app notification" hint="Adds it to each recipient's bell." checked={notify} onChange={setNotify} />
            <ToggleRow
              label="Web push"
              hint={pushEnabled ? "Pops up on subscribed devices." : "Push is disabled in Settings."}
              checked={sendWebPush && pushEnabled}
              onChange={(v) => pushEnabled && setSendWebPush(v)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Sending to <b className="text-foreground">{aud.label}</b>. This cannot be recalled once pushed.
        </p>
        <SubmitButton disabled={!valid} onClick={() => setConfirm(true)}>
          <Send /> Review & publish
        </SubmitButton>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={publishLive ? `Send to ${aud.label.toLowerCase()}?` : "Save hidden draft?"}
        description={
          <span className="grid gap-1">
            <span className="font-medium text-foreground">{draft.title.trim()}</span>
            <span>
              {publishLive ? "Visible on the Broadcast page" : "Hidden from customers"}
              {notify ? ", in-app notification" : ""}
              {sendWebPush && pushEnabled ? ", web push" : ""}.
            </span>
          </span>
        }
        confirmLabel={publishLive ? "Send now" : "Save draft"}
        onConfirm={send}
      />
    </>
  );
}
