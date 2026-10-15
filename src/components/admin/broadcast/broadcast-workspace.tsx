"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Broadcast = {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  audience: "ALL" | "USER" | "SELLER" | "ADMIN";
  active: boolean;
  createdAt: string;
};

type FormState = {
  title: string;
  message: string;
  actionUrl: string;
  audience: Broadcast["audience"];
  notify: boolean;
  sendWebPush: boolean;
};

const emptyForm: FormState = {
  title: "",
  message: "",
  actionUrl: "",
  audience: "ALL",
  notify: true,
  sendWebPush: true,
};

const AUDIENCE_LABEL: Record<Broadcast["audience"], string> = {
  ALL: "All users",
  USER: "Users",
  SELLER: "Sellers & resellers",
  ADMIN: "Admins",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BroadcastWorkspace() {
  const { data, loading, reload } = useAdminFetch<{
    broadcasts: Broadcast[];
    total: number;
  }>("/api/admin/broadcast?limit=50");

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Broadcast | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);

  const broadcasts = data?.broadcasts ?? [];
  const activeCount = useMemo(
    () => broadcasts.filter((b) => b.active).length,
    [broadcasts],
  );

  async function send() {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setPending(true);
    const result = await adminMutate("/api/admin/broadcast", {
      method: "POST",
      body: JSON.stringify({
        title: form.title.trim(),
        message: form.message.trim(),
        actionUrl: form.actionUrl.trim() || null,
        audience: form.audience,
        notify: form.notify,
        sendWebPush: form.sendWebPush,
        active: true,
      }),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const respData = result.data as { sent?: number; webPushSent?: number } | undefined;
    const sent = respData?.sent ?? 0;
    const webPushSent = respData?.webPushSent ?? 0;
    
    const parts: string[] = ["Published"];
    if (form.notify) parts.push(`inbox: ${sent}`);
    if (form.sendWebPush) parts.push(`push: ${webPushSent} devices`);
    
    toast.success(parts.join(" · "));
    setCreateOpen(false);
    setForm(emptyForm);
    void reload();
  }

  async function setActive(b: Broadcast, active: boolean) {
    setPending(true);
    const result = await adminMutate(`/api/admin/broadcast/${b.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(active ? "Activated" : "Deactivated");
    setSelected(null);
    void reload();
  }

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          title="Broadcast"
          description="Pinned announcements on the customer Broadcast page"
        />
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => {
            setForm(emptyForm);
            setCreateOpen(true);
          }}
        >
          <Plus data-icon="inline-start" />
          New broadcast
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {activeCount} active · {data?.total ?? broadcasts.length} total
      </p>

      {loading ? (
        <AdminListSkeleton />
      ) : broadcasts.length === 0 ? (
        <AdminEmptyState message="No broadcasts yet. Create one to pin an announcement." />
      ) : (
        <ul className="space-y-2">
          {broadcasts.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className="w-full space-y-1.5 rounded-xl bg-card px-3 py-3 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/30"
                onClick={() => setSelected(b)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{b.title}</p>
                  <Badge variant={b.active ? "default" : "outline"}>
                    {b.active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="secondary">
                    {AUDIENCE_LABEL[b.audience]}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {b.message}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatWhen(b.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <DialogShell
        open={createOpen}
        onOpenChange={setCreateOpen}
        icon={<Megaphone className="size-5" />}
        title="New broadcast"
        description="Pinned on /app/broadcast when active. Optionally notify users."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={pending} onClick={() => void send()}>
              {pending ? "Publishing…" : "Publish"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="bc-title">Title</Label>
          <Input
            id="bc-title"
            value={form.title}
            maxLength={120}
            onChange={(e) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-msg">Message</Label>
          <Textarea
            id="bc-msg"
            rows={5}
            maxLength={2000}
            value={form.message}
            onChange={(e) =>
              setForm((f) => ({ ...f, message: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-url">Action URL (optional)</Label>
          <Input
            id="bc-url"
            placeholder="/app/deposit or https://…"
            value={form.actionUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, actionUrl: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-aud">Audience</Label>
          <select
            id="bc-aud"
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:border-border dark:bg-input"
            value={form.audience}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                audience: e.target.value as Broadcast["audience"],
              }))
            }
          >
            <option value="ALL">All users</option>
            <option value="USER">Users</option>
            <option value="SELLER">Sellers and resellers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Notify users</p>
            <p className="text-xs text-muted-foreground">
              Also push to in-app notification inbox
            </p>
          </div>
          <Switch
            checked={form.notify}
            onCheckedChange={(v) => setForm((f) => ({ ...f, notify: v }))}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Send Web Push</p>
            <p className="text-xs text-muted-foreground">
              Deliver native push alert to subscribed browsers & devices
            </p>
          </div>
          <Switch
            checked={form.sendWebPush}
            onCheckedChange={(v) => setForm((f) => ({ ...f, sendWebPush: v }))}
          />
        </div>
      </DialogShell>

      <DialogShell
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        icon={<Megaphone className="size-5" />}
        title={selected?.title ?? "Broadcast"}
        description={
          selected
            ? `${AUDIENCE_LABEL[selected.audience]} · ${formatWhen(selected.createdAt)}`
            : undefined
        }
        size="lg"
        footer={
          selected ? (
            <>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Close
              </Button>
              {selected.active ? (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => void setActive(selected, false)}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  disabled={pending}
                  onClick={() => void setActive(selected, true)}
                >
                  Activate
                </Button>
              )}
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-3">
            <Badge variant={selected.active ? "default" : "outline"}>
              {selected.active ? "Active" : "Inactive"}
            </Badge>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {selected.message}
            </p>
            {selected.actionUrl ? (
              <p className="truncate text-xs text-muted-foreground">
                Link: {selected.actionUrl}
              </p>
            ) : null}
          </div>
        ) : null}
      </DialogShell>
    </main>
  );
}
