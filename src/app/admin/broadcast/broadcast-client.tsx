"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BellRing,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Megaphone,
  Plus,
  Radio,
  Send,
  Smartphone,
  Users,
} from "lucide-react";
import { EmptyState, formatDate } from "@/components/app-ui";
import {
  Chips,
  ConfirmDialog,
  Field,
  Pager,
  SearchBox,
  StatCard,
  SubmitButton,
  TableSkeleton,
  adminFetch,
  errMsg,
  useAdminList,
  useAdminQuery,
} from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BroadcastRow } from "@/lib/broadcasts";
import { cn } from "@/lib/utils";
import {
  AUDIENCES,
  BroadcastComposer,
  BroadcastPreview,
  EMPTY_DRAFT,
  PushPreview,
  type Audience,
  type Draft,
} from "./broadcast-composer";

type PushInfo = {
  enabled: boolean;
  hasPublicKey: boolean;
  totalSubs: number;
  userSubs: number;
  guestSubs: number;
};

const LIMIT = 50;
type StatusFilter = "all" | "live" | "hidden";
type AudienceFilter = "all" | Audience;

function ago(iso: string) {
  const s = Math.max(
    1,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : formatDate(iso);
}

export function AdminBroadcastClient() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tabs defaultValue="broadcasts" className="space-y-5">
        <TabsList>
          <TabsTrigger value="broadcasts">
            <Megaphone className="size-4" /> Broadcasts
          </TabsTrigger>
          <TabsTrigger value="push">
            <BellRing className="size-4" /> Web push
          </TabsTrigger>
        </TabsList>
        <TabsContent value="broadcasts">
          <Broadcasts />
        </TabsContent>
        <TabsContent value="push">
          <PushPanel />
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}

function Broadcasts() {
  const [page, setPage] = useState(1);
  const list = useAdminList<BroadcastRow>(
    "/api/admin/broadcast",
    "broadcasts",
    { page, limit: LIMIT }
  );
  const push = useAdminQuery<PushInfo>("/api/admin/push/broadcast");
  const [composer, setComposer] = useState<Draft | null>(null);
  const [detail, setDetail] = useState<BroadcastRow | null>(null);
  const [hiding, setHiding] = useState<BroadcastRow | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [q, setQ] = useState("");

  const stats = useMemo(() => {
    const live = list.items.filter((b) => b.active).length;
    return {
      live,
      hidden: list.items.length - live,
      last: list.items[0]?.createdAt,
    };
  }, [list.items]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.items.filter(
      (b) =>
        (status === "all" || (status === "live") === b.active) &&
        (audience === "all" || b.audience === audience) &&
        (!needle ||
          b.title.toLowerCase().includes(needle) ||
          b.message.toLowerCase().includes(needle))
    );
  }, [list.items, status, audience, q]);

  async function setActive(b: BroadcastRow, active: boolean) {
    try {
      await adminFetch(`/api/admin/broadcast/${b.id}`, {
        method: "PATCH",
        json: { active },
      });
      toast.success(
        active ? "Broadcast is live again." : "Broadcast hidden from customers."
      );
      setDetail((d) => (d && d.id === b.id ? { ...d, active } : d));
      list.reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function reuse(b: BroadcastRow) {
    setDetail(null);
    setComposer({
      title: b.title,
      message: b.message,
      actionUrl: b.actionUrl ?? "",
      audience: b.audience,
    });
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-lg">
              <Radio className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight">
                Broadcast studio
              </h2>
              <p className="mt-0.5 max-w-lg text-sm text-muted-foreground">
                Reach customers and sellers instantly: announcement page, in-app
                bell and web push, all from one place.
              </p>
            </div>
          </div>
          <Button size="lg" onClick={() => setComposer(EMPTY_DRAFT)}>
            <Plus /> New broadcast
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total"
          value={list.total}
          icon={Megaphone}
          hint="All time"
        />
        <StatCard
          label="Live"
          value={stats.live}
          icon={Eye}
          tone="success"
          hint="Visible to customers"
        />
        <StatCard
          label="Hidden"
          value={stats.hidden}
          icon={EyeOff}
          tone="warning"
          hint="Drafts / retired"
        />
        <StatCard
          label="Push devices"
          value={push.data ? push.data.totalSubs : "…"}
          icon={Smartphone}
          tone={push.data?.enabled ? "success" : "warning"}
          hint={
            push.data
              ? push.data.enabled
                ? "Push enabled"
                : "Push disabled"
              : undefined
          }
        />
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Search title or message"
            />
          </div>
          <Chips
            value={status}
            onChange={setStatus}
            options={[
              { v: "all", label: "All" },
              { v: "live", label: `Live (${stats.live})` },
              { v: "hidden", label: `Hidden (${stats.hidden})` },
            ]}
          />
        </div>
        <Chips
          value={audience}
          onChange={setAudience}
          options={[
            { v: "all", label: "Any audience" },
            ...(Object.keys(AUDIENCES) as Audience[]).map((k) => ({
              v: k,
              label: AUDIENCES[k].label,
            })),
          ]}
        />
      </div>

      {list.loading && list.items.length === 0 ? (
        <TableSkeleton rows={4} />
      ) : shown.length === 0 ? (
        <div className="rounded-xl border bg-card p-6">
          <EmptyState
            icon={Megaphone}
            title={
              list.items.length === 0 ? "No broadcasts yet" : "Nothing matches"
            }
            hint={
              list.items.length === 0
                ? "Send your first announcement to every customer in seconds."
                : "Try a different filter or search."
            }
          />
        </div>
      ) : (
        <div className="grid gap-3">
          {shown.map((b) => {
            const a = AUDIENCES[b.audience];
            return (
              <article
                key={b.id}
                className={cn(
                  "group flex gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40",
                  !b.active && "opacity-70"
                )}
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    b.active
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <a.icon className="size-4" />
                </span>
                <button
                  type="button"
                  onClick={() => setDetail(b)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={a.badge} shape="pill">
                      {a.label}
                    </Badge>
                    <Badge
                      variant={b.active ? "success" : "muted"}
                      shape="pill"
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          b.active ? "bg-success" : "bg-muted-foreground"
                        )}
                      />
                      {b.active ? "Live" : "Hidden"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {ago(b.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate font-display text-base font-semibold group-hover:text-primary">
                    {b.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {b.message}
                  </p>
                  {b.actionUrl ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 font-mono text-xs text-primary">
                      <ExternalLink className="size-3" /> {b.actionUrl}
                    </p>
                  ) : null}
                </button>
                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Switch
                          checked={b.active}
                          onCheckedChange={(v) =>
                            v ? setActive(b, true) : setHiding(b)
                          }
                          aria-label="Visible to customers"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {b.active ? "Hide from customers" : "Make live"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => reuse(b)}
                        aria-label="Reuse as new broadcast"
                      >
                        <Copy />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reuse as new</TooltipContent>
                  </Tooltip>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pager
        page={page}
        pageSize={LIMIT}
        total={list.total}
        onPage={setPage}
        loading={list.loading}
      />

      <Dialog
        open={composer !== null}
        onOpenChange={(o) => !o && setComposer(null)}
      >
        <DialogContent
          className="max-w-5xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {composer ? (
            <BroadcastComposer
              initial={composer}
              pushEnabled={Boolean(push.data?.enabled)}
              onDone={() => {
                setComposer(null);
                setPage(1);
                list.reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
      >
        <DialogContent className="max-w-xl">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>Broadcast details</DialogTitle>
                <DialogDescription>
                  Sent {formatDate(detail.createdAt, true)} to{" "}
                  {AUDIENCES[detail.audience].label.toLowerCase()}.
                </DialogDescription>
              </DialogHeader>
              <BroadcastPreview
                draft={{
                  title: detail.title,
                  message: detail.message,
                  actionUrl: detail.actionUrl ?? "",
                  audience: detail.audience,
                }}
              />
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">
                    {detail.active
                      ? "Live on the Broadcast page"
                      : "Hidden from customers"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Notifications and push already delivered stay delivered.
                  </p>
                </div>
                <Switch
                  checked={detail.active}
                  onCheckedChange={(v) =>
                    v ? setActive(detail, true) : setHiding(detail)
                  }
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => reuse(detail)}>
                  <Copy /> Reuse as new
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={hiding !== null}
        onOpenChange={(o) => !o && setHiding(null)}
        title="Hide this broadcast?"
        description="It disappears from the customer Broadcast page. You can make it live again any time."
        confirmLabel="Hide"
        onConfirm={async () => {
          if (hiding) await setActive(hiding, false);
        }}
      />
    </div>
  );
}

function PushPanel() {
  const info = useAdminQuery<PushInfo>("/api/admin/push/broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const d = info.data;

  async function send() {
    setBusy(true);
    try {
      const r = await adminFetch<{ sent: number; totalSubs: number }>(
        "/api/admin/push/broadcast",
        {
          method: "POST",
          json: {
            title: title.trim(),
            body: body.trim(),
            url: url.trim() || undefined,
          },
        }
      );
      toast.success(`Delivered to ${r.sent} of ${r.totalSubs} devices.`);
      setTitle("");
      setBody("");
      setUrl("");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {d ? (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Subscribed devices"
            value={d.totalSubs}
            icon={Smartphone}
            tone={d.enabled ? "success" : "warning"}
            hint={d.enabled ? "Push enabled" : "Push disabled"}
          />
          <StatCard label="Signed-in" value={d.userSubs} icon={Users} />
          <StatCard label="Guests" value={d.guestSubs} icon={Users} />
        </div>
      ) : (
        <TableSkeleton rows={2} />
      )}

      <div className="grid gap-6 rounded-xl border bg-card p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="grid content-start gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Quick push</h3>
            <p className="text-sm text-muted-foreground">
              Straight to every subscribed device. No Broadcast page entry, no
              in-app record.
            </p>
          </div>
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </Field>
          <Field label="Text">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={300}
            />
            <div className="flex justify-end text-xs tabular-nums text-muted-foreground">
              {body.length}/300
            </div>
          </Field>
          <Field label="Opens (optional)">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/"
            />
          </Field>
          <div>
            <SubmitButton
              busy={busy}
              disabled={!title.trim() || !body.trim() || !d?.enabled}
              onClick={() => setConfirm(true)}
            >
              <Send /> Send to all devices
            </SubmitButton>
            {d && !d.enabled ? (
              <p className="mt-2 text-xs text-warning">
                Web push is disabled. Enable it in Settings first.
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid content-start gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <PushPreview title={title} body={body} />
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Push to ${d?.totalSubs ?? 0} devices?`}
        description={
          <span className="font-medium text-foreground">{title.trim()}</span>
        }
        confirmLabel="Send push"
        onConfirm={send}
      />
    </div>
  );
}
