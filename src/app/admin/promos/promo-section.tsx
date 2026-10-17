"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Copy, Dices, Pencil, Plus, Tag, Ticket, Trash2, Users } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, StatCard, SubmitButton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { AudienceSelect, ScopeFields, type Audience, type Scope } from "@/components/admin/pickers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { formatMoney, microcentsToUsd } from "@/lib/currencies";
import { flashDateTimeInput, flashDateTimeLabel, localDateTimeToIso } from "@/lib/flash-sale-format";
import { cn } from "@/lib/utils";
import { LIFECYCLE_BADGE, Segmented, ScheduleFields, SectionHead, audienceText, lifecycle, scheduleError, useScopeLabel, type Lifecycle } from "./shared";

type Promo = {
  id: string;
  code: string;
  discountPercent: number;
  discountAmount: number;
  scope: Scope;
  targetRole: Audience;
  productId: string | null;
  durationId: string | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  _count: { redemptions: number };
};

function discountText(p: Pick<Promo, "discountPercent" | "discountAmount">) {
  if (p.discountPercent > 0) return `${p.discountPercent}%`;
  return formatMoney(p.discountAmount);
}

const QUICK_ENDS = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
];

/** Exhausted codes read as "ended" even while still switched on. */
function promoLifecycle(p: Promo): Lifecycle {
  const lc = lifecycle(p);
  return lc === "live" && p.maxRedemptions && p._count.redemptions >= p.maxRedemptions ? "ended" : lc;
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function PromoSection() {
  const { data, loading, reload } = useAdminQuery<{ promos: Promo[] }>("/api/admin/promos");
  const [editing, setEditing] = useState<Promo | "new" | null>(null);
  const [del, setDel] = useState<Promo | null>(null);
  const scopeLabel = useScopeLabel();
  const [filter, setFilter] = useState<"all" | Lifecycle>("all");
  const all = data?.promos ?? [];
  const counts = { live: 0, scheduled: 0, ended: 0, off: 0 } as Record<Lifecycle, number>;
  let totalUses = 0;
  for (const p of all) {
    counts[promoLifecycle(p)]++;
    totalUses += p._count.redemptions;
  }
  const promos = filter === "all" ? all : all.filter((p) => promoLifecycle(p) === filter);

  async function toggle(p: Promo, active: boolean) {
    try {
      await adminFetch(`/api/admin/promos/${p.id}`, { method: "PATCH", json: { active } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function copy(code: string) {
    void navigator.clipboard?.writeText(code).then(() => toast.success(`Copied ${code}`));
  }

  return (
    <div className="space-y-4">
      <SectionHead
        title="Promo codes"
        hint="Codes customers type at checkout."
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus /> New promo
          </Button>
        }
      />

      {all.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Active codes" value={counts.live} icon={Ticket} tone="success" />
            <StatCard label="Scheduled" value={counts.scheduled} icon={Clock} tone="warning" />
            <StatCard label="Ended / used up" value={counts.ended} />
            <StatCard label="Total redemptions" value={totalUses} icon={Tag} />
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
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : promos.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8">
          <EmptyState
            icon={Tag}
            title={all.length ? "Nothing in this filter" : "No promo codes yet"}
            hint={all.length ? "Try another status." : "Create one — it takes about 10 seconds."}
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {promos.map((p) => {
            const used = p._count.redemptions;
            const pct = p.maxRedemptions ? Math.min(100, (used / p.maxRedemptions) * 100) : 0;
            const lc = promoLifecycle(p);
            const st = LIFECYCLE_BADGE[lc];
            const off = lc === "ended" || lc === "off";
            return (
              <div key={p.id} className={cn("flex overflow-hidden rounded-xl border bg-card transition-opacity", off && "opacity-60")}>
                <div className="flex w-28 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-dashed bg-primary/10 px-2 text-center">
                  <p className="font-display text-2xl font-bold leading-none text-primary">{discountText(p)}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">off</p>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => copy(p.code)}
                      className="group inline-flex min-w-0 items-center gap-1.5 font-mono text-base font-bold tracking-wide"
                      aria-label={`Copy ${p.code}`}
                    >
                      <span className="truncate">{p.code}</span>
                      <Copy className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                    <Switch checked={p.active} onCheckedChange={(v) => toggle(p, v)} aria-label="On/Off" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {lc === "scheduled"
                        ? `Starts ${flashDateTimeLabel(p.startsAt)}`
                        : p.expiresAt
                          ? `${lc === "ended" ? "Ended" : "Ends"} ${flashDateTimeLabel(p.expiresAt)}`
                          : "No end date"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {scopeLabel(p.scope, p.productId, p.durationId)} · <Users className="mb-0.5 inline size-3" /> {audienceText(p.targetRole)}
                  </p>
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                      <span>
                        Used {used}
                        {p.maxRedemptions ? ` / ${p.maxRedemptions}` : " · no cap"}
                      </span>
                      <span>{p.perUserLimit}× per user</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", pct >= 100 ? "bg-destructive" : "bg-primary")} style={{ width: `${p.maxRedemptions ? Math.max(pct, 2) : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} aria-label="Edit">
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDel(p)} aria-label="Delete">
                      <Trash2 />
                    </Button>
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
            <PromoForm
              key={editing === "new" ? "new" : editing.id}
              promo={editing === "new" ? null : editing}
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
        title={`Delete ${del?.code}?`}
        description="Past orders keep their discount."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/promos/${del!.id}`, { method: "DELETE" });
            toast.success("Promo deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function PromoForm({ promo, onSaved }: { promo: Promo | null; onSaved: () => void }) {
  const [code, setCode] = useState(promo?.code ?? "");
  const [kind, setKind] = useState<"percent" | "flat">(promo && promo.discountPercent <= 0 ? "flat" : "percent");
  const [value, setValue] = useState(
    promo ? String(promo.discountPercent > 0 ? promo.discountPercent : microcentsToUsd(promo.discountAmount)) : "10",
  );
  const [max, setMax] = useState(promo?.maxRedemptions ? String(promo.maxRedemptions) : "");
  const [perUser, setPerUser] = useState(String(promo?.perUserLimit ?? 1));
  const [scope, setScope] = useState({ scope: promo?.scope ?? ("GLOBAL" as Scope), productId: promo?.productId ?? "", durationId: promo?.durationId ?? "" });
  const [audience, setAudience] = useState<Audience>(promo?.targetRole ?? "ALL");
  const [active, setActive] = useState(promo?.active ?? true);
  const [startsAt, setStartsAt] = useState(flashDateTimeInput(promo?.startsAt));
  const [endsAt, setEndsAt] = useState(flashDateTimeInput(promo?.expiresAt));
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    const n = Number(value) || 0;
    if (!code.trim()) return toast.error("Enter a code or generate one.");
    if (n <= 0) return toast.error("Discount must be greater than zero.");
    if (kind === "percent" && n > 100) return toast.error("Percent can't exceed 100.");
    if (scope.scope === "PRODUCT" && !scope.productId) return toast.error("Pick a product.");
    if (scope.scope === "DURATION" && !scope.durationId) return toast.error("Pick a duration.");
    const err = scheduleError(startsAt, endsAt === flashDateTimeInput(promo?.expiresAt) ? "" : endsAt);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      await adminFetch(promo ? `/api/admin/promos/${promo.id}` : "/api/admin/promos", {
        method: promo ? "PATCH" : "POST",
        json: {
          code: code.trim(),
          discountPercent: kind === "percent" ? n : 0,
          discountAmount: kind === "flat" ? n : 0,
          maxRedemptions: max ? Number(max) : null,
          perUserLimit: Number(perUser) || 1,
          scope: scope.scope,
          productId: scope.scope === "GLOBAL" ? null : scope.productId || null,
          durationId: scope.scope === "DURATION" ? scope.durationId || null : null,
          targetRole: audience,
          active,
          startsAt: localDateTimeToIso(startsAt),
          expiresAt: localDateTimeToIso(endsAt),
          sendNotification: notify,
        },
      });
      toast.success(promo ? "Promo saved." : "Promo created.");
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
        <DialogTitle>{promo ? "Edit promo" : "New promo"}</DialogTitle>
        <DialogDescription>Customers enter this code at checkout.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <Field label="Code">
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="SUMMER20" className="font-mono" maxLength={64} />
            <Button type="button" variant="outline" size="icon" onClick={() => setCode(randomCode())} aria-label="Generate code" title="Generate">
              <Dices />
            </Button>
          </div>
        </Field>

        <Field label="Amount">
          <div className="flex gap-2">
            <Input type="number" min="0" step={kind === "percent" ? "1" : "0.01"} max={kind === "percent" ? 100 : undefined} value={value} onChange={(e) => setValue(e.target.value)} />
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: "percent", label: "%" },
                { value: "flat", label: "$" },
              ]}
            />
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Max uses" hint="Empty = unlimited.">
            <Input type="number" min="1" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Unlimited" />
          </Field>
          <Field label="Per-user limit" hint="Times one user can use it.">
            <Input type="number" min="1" value={perUser} onChange={(e) => setPerUser(e.target.value)} />
          </Field>
        </div>

        <ScheduleFields startsAt={startsAt} endsAt={endsAt} onStarts={setStartsAt} onEnds={setEndsAt} quickEnds={QUICK_ENDS} endHint="Empty = never expires." />
        <ScopeFields {...scope} onChange={setScope} />
        <AudienceSelect value={audience} onChange={setAudience} />
        <ToggleRow label="On" hint="Turn off to stop customers using this code." checked={active} onChange={setActive} />
        <ToggleRow label="Notify customers" hint="Send a notification to the audience when you save." checked={notify} onChange={setNotify} />
      </div>

      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          {promo ? "Save changes" : "Create promo"}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
