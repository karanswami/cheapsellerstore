"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Pencil, Plus, Trash2, Users, Zap } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { ConfirmDialog, Field, SubmitButton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { AudienceSelect, ScopeFields, type Audience, type Scope } from "@/components/admin/pickers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { flashDateTimeInput, flashDateTimeLabel, formatFlashCountdown, localDateTimeToIso } from "@/lib/flash-sale-format";
import { cn } from "@/lib/utils";
import { SectionHead, audienceText, useScopeLabel } from "./shared";

type Flash = {
  id: string;
  title: string;
  discountPercent: number;
  scope: Scope;
  targetRole: Audience;
  productId: string | null;
  durationId: string | null;
  active: boolean;
  bannerDescription: string | null;
  startsAt: string | null;
  expiresAt: string | null;
};

function status(s: Flash): { label: string; variant: "success" | "warning" | "muted" } {
  const now = Date.now();
  if (!s.active) return { label: "Off", variant: "muted" };
  if (s.expiresAt && new Date(s.expiresAt).getTime() < now) return { label: "Ended", variant: "muted" };
  if (s.startsAt && new Date(s.startsAt).getTime() > now) return { label: "Scheduled", variant: "warning" };
  return { label: "Live", variant: "success" };
}

const QUICK_ENDS = [
  { label: "6 hours", hours: 6 },
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
];

export function FlashSection() {
  const { data, loading, reload } = useAdminQuery<{ sales: Flash[] }>("/api/admin/flash-sales");
  const [editing, setEditing] = useState<Flash | "new" | null>(null);
  const [del, setDel] = useState<Flash | null>(null);
  const scopeLabel = useScopeLabel();
  const sales = data?.sales ?? [];

  async function toggle(s: Flash, active: boolean) {
    try {
      await adminFetch(`/api/admin/flash-sales/${s.id}`, { method: "PATCH", json: { active } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <SectionHead
        title="Flash sales"
        hint="Timed discount shown on products automatically."
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus /> New flash sale
          </Button>
        }
      />

      {loading && !data ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8">
          <EmptyState icon={Zap} title="No flash sales yet" hint="Run a timed discount on one product or the whole store." />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sales.map((s) => {
            const st = status(s);
            const left = st.label === "Live" ? formatFlashCountdown(s.expiresAt) : null;
            return (
              <div key={s.id} className={cn("overflow-hidden rounded-xl border bg-card", st.variant === "muted" && "opacity-60")}>
                <div className="flex items-center gap-3 bg-gradient-to-r from-warning/25 via-warning/10 to-transparent p-3.5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-warning text-black">
                    <Zap className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.bannerDescription || "No banner text"}</p>
                  </div>
                  <p className="font-display text-2xl font-bold tabular-nums">-{s.discountPercent}%</p>
                </div>
                <div className="space-y-3 p-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {left ? `Ends in ${left}` : s.expiresAt ? `Ends ${flashDateTimeLabel(s.expiresAt)}` : "No end date"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {scopeLabel(s.scope, s.productId, s.durationId)} · <Users className="mb-0.5 inline size-3" /> {audienceText(s.targetRole)}
                  </p>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Switch checked={s.active} onCheckedChange={(v) => toggle(s, v)} aria-label="On/Off" />
                      {s.active ? "On" : "Off"}
                    </label>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(s)} aria-label="Edit">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDel(s)} aria-label="Delete">
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
          {editing !== null ? (
            <FlashForm
              key={editing === "new" ? "new" : editing.id}
              sale={editing === "new" ? null : editing}
              onSaved={() => {
                setEditing(null);
                reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.title}"?`}
        description="Products go back to their normal price."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/flash-sales/${del!.id}`, { method: "DELETE" });
            toast.success("Flash sale deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function FlashForm({ sale, onSaved }: { sale: Flash | null; onSaved: () => void }) {
  const [title, setTitle] = useState(sale?.title ?? "");
  const [percent, setPercent] = useState(String(sale?.discountPercent ?? 20));
  const [endsAt, setEndsAt] = useState(flashDateTimeInput(sale?.expiresAt));
  const [banner, setBanner] = useState(sale?.bannerDescription ?? "");
  const [scope, setScope] = useState({ scope: sale?.scope ?? ("GLOBAL" as Scope), productId: sale?.productId ?? "", durationId: sale?.durationId ?? "" });
  const [audience, setAudience] = useState<Audience>(sale?.targetRole ?? "ALL");
  const [active, setActive] = useState(sale?.active ?? true);
  const [busy, setBusy] = useState(false);

  function endIn(hours: number) {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    setEndsAt(flashDateTimeInput(d));
  }

  async function save() {
    setBusy(true);
    try {
      await adminFetch(sale ? `/api/admin/flash-sales/${sale.id}` : "/api/admin/flash-sales", {
        method: sale ? "PATCH" : "POST",
        json: {
          title: title.trim(),
          discountPercent: Number(percent),
          expiresAt: localDateTimeToIso(endsAt),
          bannerDescription: banner.trim() || null,
          scope: scope.scope,
          productId: scope.scope === "GLOBAL" ? null : scope.productId || null,
          durationId: scope.scope === "DURATION" ? scope.durationId || null : null,
          targetRole: audience,
          active,
          ...(sale ? {} : { showBanner: true }),
        },
      });
      toast.success(sale ? "Flash sale saved." : "Flash sale created.");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{sale ? "Edit flash sale" : "New flash sale"}</DialogTitle>
        <DialogDescription>Matching products show the discount and a countdown while it is on.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekend Flash Sale" maxLength={120} />
          </Field>
          <Field label="Discount %">
            <Input type="number" min="1" max="100" value={percent} onChange={(e) => setPercent(e.target.value)} />
          </Field>
        </div>

        <Field label="Ends" hint="Empty = runs until you turn it off.">
          <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ENDS.map((q) => (
              <Button key={q.hours} type="button" variant="outline" size="sm" onClick={() => endIn(q.hours)}>
                +{q.label}
              </Button>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => setEndsAt("")}>
              No end
            </Button>
          </div>
        </Field>

        <Field label="Banner text" hint="Short line shown under the title on the storefront.">
          <Input value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="Limited time — grab it before it ends" maxLength={240} />
        </Field>

        <ScopeFields {...scope} onChange={setScope} />
        <AudienceSelect value={audience} onChange={setAudience} />
        <ToggleRow label="On" hint="Turn off to pause the sale." checked={active} onChange={setActive} />
      </div>

      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          {sale ? "Save changes" : "Create flash sale"}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
