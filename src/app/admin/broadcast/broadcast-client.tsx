"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Megaphone, Plus, Send } from "lucide-react";
import { EmptyState, formatDate } from "@/components/app-ui";
import { Field, Pager, StatCard, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminList, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { BroadcastRow } from "@/lib/broadcasts";

const LIMIT = 20;
const AUDIENCE_LABEL: Record<string, string> = { ALL: "Everyone", USER: "Users", SELLER: "Sellers", ADMIN: "Admins" };

export function AdminBroadcastClient() {
  return (
    <Tabs defaultValue="broadcasts" className="space-y-4">
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
  );
}

function Broadcasts() {
  const [page, setPage] = useState(1);
  const list = useAdminList<BroadcastRow>("/api/admin/broadcast", "broadcasts", { page, limit: LIMIT });
  const [creating, setCreating] = useState(false);

  async function toggle(b: BroadcastRow, active: boolean) {
    try {
      await adminFetch(`/api/admin/broadcast/${b.id}`, { method: "PATCH", json: { active } });
      list.reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> New broadcast
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Megaphone} title="No broadcasts" hint="Announcements show on the customers' Broadcast page." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Visible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="max-w-md">
                    <p className="text-sm font-medium">{b.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{b.message}</p>
                    {b.actionUrl ? <p className="font-mono text-xs text-primary">{b.actionUrl}</p> : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{AUDIENCE_LABEL[b.audience] ?? b.audience}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(b.createdAt, true)}</TableCell>
                  <TableCell>
                    <Switch checked={b.active} onCheckedChange={(v) => toggle(b, v)} aria-label="Visible" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={LIMIT} total={list.total} onPage={setPage} loading={list.loading} />
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          {creating ? (
            <BroadcastForm
              onDone={() => {
                setCreating(false);
                setPage(1);
                list.reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BroadcastForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [audience, setAudience] = useState("ALL");
  const [notify, setNotify] = useState(true);
  const [sendWebPush, setSendWebPush] = useState(true);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const r = await adminFetch<{ sent: number; webPushSent: number }>("/api/admin/broadcast", {
        method: "POST",
        json: { title: title.trim(), message: message.trim(), actionUrl: actionUrl.trim() || null, audience, notify, sendWebPush, active: true },
      });
      toast.success(`Published. ${r.sent} notified, ${r.webPushSent} push.`);
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>New broadcast</DialogTitle>
        <DialogDescription>Published to the Broadcast page; optionally pushed to users right now.</DialogDescription>
      </DialogHeader>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </Field>
      <Field label="Message">
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={2000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Link (optional)">
          <Input value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} placeholder="/app/deposit" />
        </Field>
        <Field label="Audience">
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AUDIENCE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <ToggleRow label="In-app notification" hint="Adds it to every recipient's notifications." checked={notify} onChange={setNotify} />
      <ToggleRow label="Web push" hint="Pops up on subscribed devices." checked={sendWebPush} onChange={setSendWebPush} />
      <DialogFooter>
        <SubmitButton busy={busy} disabled={!title.trim() || !message.trim()} onClick={send}>
          <Send /> Publish
        </SubmitButton>
      </DialogFooter>
    </>
  );
}

function PushPanel() {
  const info = useAdminQuery<{ enabled: boolean; hasPublicKey: boolean; totalSubs: number; userSubs: number; guestSubs: number }>("/api/admin/push/broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const d = info.data;

  async function send() {
    setBusy(true);
    try {
      const r = await adminFetch<{ sent: number; totalSubs: number }>("/api/admin/push/broadcast", {
        method: "POST",
        json: { title: title.trim(), body: body.trim(), url: url.trim() || undefined },
      });
      toast.success(`Sent to ${r.sent} of ${r.totalSubs} devices.`);
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
    <div className="space-y-4">
      {d ? (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Subscribed devices" value={d.totalSubs} tone={d.enabled ? "success" : "warning"} hint={d.enabled ? "Push enabled" : "Push disabled"} />
          <StatCard label="Signed-in" value={d.userSubs} />
          <StatCard label="Guests" value={d.guestSubs} />
        </div>
      ) : (
        <TableSkeleton rows={2} />
      )}
      <div className="grid max-w-xl gap-4 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Sends a push notification to every subscribed device, with no in-app record.</p>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </Field>
        <Field label="Text">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={300} />
        </Field>
        <Field label="Opens (optional)">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/" />
        </Field>
        <div>
          <SubmitButton busy={busy} disabled={!title.trim() || !body.trim() || !d?.enabled} onClick={send}>
            <Send /> Send to all
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
