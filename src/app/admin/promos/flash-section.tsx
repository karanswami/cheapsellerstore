"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Pencil, Plus, Trash2, Users, Zap } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, StatCard, SubmitButton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { AudienceSelect, ScopeFields, type Audience, type Scope } from "@/components/admin/pickers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { flashDateTimeInput, flashDateTimeLabel, formatFlashCountdown, localDateTimeToIso } from "@/lib/flash-sale-format";
import { cn } from "@/lib/utils";
import { LIFECYCLE_BADGE, ScheduleFields, SectionHead, audienceText, lifecycle, scheduleError, useScopeLabel, type Lifecycle } from "./shared";

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
  const [filter, setFilter] = useState<"all" | Lifecycle>("all");
  const all = data?.sales ?? [];
  const counts = { live: 0, scheduled: 0, ended: 0, off: 0 } as Record<Lifecycle, number>;
  for (const s of all) counts[lifecycle(s)]++;
  const sales = filter === "all" ? all : all.filter((s) => lifecycle(s) === filter);

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

      {all.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Live now" value={counts.live} icon={Zap} tone="success" />
            <StatCard label="Scheduled" value={counts.scheduled} icon={Clock} tone="warning" />
            <StatCard label="Ended" value={counts.ended} />
            <StatCard label="Paused" value={counts.off} />
          </div>
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { v: "all", label: "All", count: all.length },
              { v: "live", label: "Live", count: counts.live },
              { v: "scheduled", label: "Scheduled", count: counts.scheduled },
              { v: "ended", label: "Ended", count: counts.ended },
              { v: "off", label: "Off", count: counts.off },
            ]}
          />
        </>
      ) : null}

      {loading && !data ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8">
          <EmptyState
            icon={Zap}
            title={all.length ? "Nothing in this filter" : "No flash sales yet"}
            hint={all.length ? "Try another status." : "Run a timed discount on one product or the whole store."}
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sales.map((s) => {
            const lc = lifecycle(s);
            const st = LIFECYCLE_BADGE[lc];
            const left = lc === "live" ? formatFlashCountdown(s.expiresAt) : null;
            return (
              <div key={s.id} className={cn("overflow-hidden rounded-xl border bg-card", (lc === "ended" || lc === "off") && "opacity-60")}>
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
                      {lc === "scheduled"
                        ? `Starts ${flashDateTimeLabel(s.startsAt)}`
                        : left
                          ? `Ends in ${left}`
                          : s.expiresAt
                            ? `${lc === "ended" ? "Ended" : "Ends"} ${flashDateTimeLabel(s.expiresAt)}`
                            : "No end date"}
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
  const [startsAt, setStartsAt] = useState(flashDateTimeInput(sale?.startsAt));
  const [endsAt, setEndsAt] = useState(flashDateTimeInput(sale?.expiresAt));
  const [notify, setNotify] = useState(false);
  const [banner, setBanner] = useState(sale?.bannerDescription ?? "");
  const [scope, setScope] = useState({ scope: sale?.scope ?? ("GLOBAL" as Scope), productId: sale?.productId ?? "", durationId: sale?.durationId ?? "" });
  const [audience, setAudience] = useState<Audience>(sale?.targetRole ?? "ALL");
  const [active, setActive] = useState(sale?.active ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    const pct = Number(percent);
    if (!title.trim()) return toast.error("Give the sale a title.");
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) return toast.error("Discount must be between 1 and 100%.");
    if (scope.scope === "PRODUCT" && !scope.productId) return toast.error("Pick a product.");
    if (scope.scope === "DURATION" && !scope.durationId) return toast.error("Pick a duration.");
    // Editing an already-ended sale is allowed as long as the end isn't moved into a contradiction.
    const err = scheduleError(startsAt, endsAt === flashDateTimeInput(sale?.expiresAt) ? "" : endsAt);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      await adminFetch(sale ? `/api/admin/flash-sales/${sale.id}` : "/api/admin/flash-sales", {
        method: sale ? "PATCH" : "POST",
        json: {
          title: title.trim(),
          discountPercent: pct,
          startsAt: localDateTimeToIso(startsAt),
          expiresAt: localDateTimeToIso(endsAt),
          bannerDescription: banner.trim() || null,
          scope: scope.scope,
          productId: scope.scope === "GLOBAL" ? null : scope.productId || null,
          durationId: scope.scope === "DURATION" ? scope.durationId || null : null,
          targetRole: audience,
          active,
          sendNotification: notify,
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

        <ScheduleFields startsAt={startsAt} endsAt={endsAt} onStarts={setStartsAt} onEnds={setEndsAt} quickEnds={QUICK_ENDS} />

        <Field label="Banner text" hint="Short line shown under the title on the storefront.">
          <Input value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="Limited time — grab it before it ends" maxLength={240} />
        </Field>

        <ScopeFields {...scope} onChange={setScope} />
        <AudienceSelect value={audience} onChange={setAudience} />
        <ToggleRow label="On" hint="Turn off to pause the sale." checked={active} onChange={setActive} />
        <ToggleRow label="Notify customers" hint="Send a notification to the audience when you save." checked={notify} onChange={setNotify} />
      </div>

      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          {sale ? "Save changes" : "Create flash sale"}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
