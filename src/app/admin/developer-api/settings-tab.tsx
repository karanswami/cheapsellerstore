"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Crown, FlaskConical, Gauge, Globe, Handshake, KeyRound, Power, Store, User, type LucideIcon } from "lucide-react";
import { ConfirmDialog, Field, SubmitButton, TableSkeleton, adminFetch, errMsg } from "@/components/admin/kit";
import { Panel } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Roles = { user: boolean; seller: boolean; reseller: boolean; admin: boolean };
export type ApiSettings = {
  platformEnabled: boolean;
  allowedRoles: Roles;
  defaultRateLimitRpm: number;
  publicRateLimitRpm: number;
  burstLimit: number;
  maxKeysPerUser: number;
  sandboxEnabled: boolean;
};

const ROLES: { key: keyof Roles; label: string; hint: string; icon: LucideIcon }[] = [
  { key: "user", label: "Customers", hint: "Regular store accounts", icon: User },
  { key: "seller", label: "Sellers", hint: "Approved sellers", icon: Store },
  { key: "reseller", label: "Resellers", hint: "Reseller accounts", icon: Handshake },
  { key: "admin", label: "Admins", hint: "Staff accounts", icon: Crown },
];

const PRESETS = [
  { label: "Conservative", rpm: 60, burst: 5 },
  { label: "Standard", rpm: 120, burst: 10 },
  { label: "High volume", rpm: 300, burst: 25 },
];

export function SettingsTab({ data, onSaved }: { data: ApiSettings | null; onSaved: (s: ApiSettings) => void }) {
  return data ? <SettingsForm initial={data} onSaved={onSaved} /> : <TableSkeleton rows={6} />;
}

function SettingsForm({ initial, onSaved }: { initial: ApiSettings; onSaved: (s: ApiSettings) => void }) {
  const [saved, setSaved] = useState(initial);
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const roleCount = Object.values(s.allowedRoles).filter(Boolean).length;

  async function save() {
    setBusy(true);
    try {
      const next = await adminFetch<ApiSettings>("/api/admin/seller-api/settings", {
        method: "PATCH",
        json: s,
      });
      setSaved(next);
      setS(next);
      onSaved(next);
      toast.success("API settings saved.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const num = (k: "defaultRateLimitRpm" | "publicRateLimitRpm" | "burstLimit" | "maxKeysPerUser") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS({ ...s, [k]: Number(e.target.value) });

  return (
    <div className="space-y-5 pb-20">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Access"
          icon={Power}
          action={<Badge variant={s.platformEnabled ? "success" : "destructive"} shape="pill">{s.platformEnabled ? "Live" : "Paused"}</Badge>}
          className="space-y-3"
        >
          <SwitchCard
            icon={Power}
            title="Platform API"
            hint="Master switch for every /api/v1 endpoint. Pausing rejects all developer requests."
            checked={s.platformEnabled}
            onChange={(v) => (v ? setS({ ...s, platformEnabled: true }) : setConfirmPause(true))}
          />
          <SwitchCard
            icon={FlaskConical}
            title="Sandbox keys"
            hint="Let developers create test keys that return demo data and never spend balance."
            checked={s.sandboxEnabled}
            onChange={(v) => setS({ ...s, sandboxEnabled: v })}
          />
        </Panel>

        <Panel title="Who can use the API" icon={KeyRound} action={<span className="text-xs text-muted-foreground">{roleCount} of 4 roles</span>}>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => {
              const on = s.allowedRoles[r.key];
              return (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setS({ ...s, allowedRoles: { ...s.allowedRoles, [r.key]: !on } })}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    on ? "border-primary/50 bg-primary/10" : "hover:bg-accent",
                  )}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", on ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                    <r.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{r.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.hint}</span>
                  </span>
                  <span className={cn("grid size-5 place-items-center rounded-full border", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                    {on ? <Check className="size-3" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {roleCount === 0 ? <p className="mt-3 text-xs font-medium text-warning">No role is allowed, so nobody can create or use keys.</p> : null}
        </Panel>
      </div>

      <Panel
        title="Rate limits"
        icon={Gauge}
        action={
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const active = s.defaultRateLimitRpm === p.rpm && s.burstLimit === p.burst;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setS({ ...s, defaultRateLimitRpm: p.rpm, burstLimit: p.burst })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Keyed requests / min" hint="Default per key. Max 300.">
            <Input type="number" min="1" max="300" value={s.defaultRateLimitRpm} onChange={num("defaultRateLimitRpm")} />
          </Field>
          <Field label="Burst allowance" hint="Extra requests tolerated in a short spike.">
            <Input type="number" min="1" value={s.burstLimit} onChange={num("burstLimit")} />
          </Field>
          <Field label="Public catalog / min" hint="Unauthenticated, per IP. Max 100.">
            <Input type="number" min="1" max="100" value={s.publicRateLimitRpm} onChange={num("publicRateLimitRpm")} />
          </Field>
          <Field label="Max active keys / user" hint="Max 50.">
            <Input type="number" min="1" max="50" value={s.maxKeysPerUser} onChange={num("maxKeysPerUser")} />
          </Field>
        </div>
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Globe className="size-3.5 shrink-0" />
          Each key gets {s.defaultRateLimitRpm} requests a minute (about {(s.defaultRateLimitRpm / 60).toFixed(1)}/sec). Individual keys can override this from the API keys tab.
        </p>
      </Panel>

      <div
        className={cn(
          "sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur transition-all",
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <Badge variant="warning" shape="pill">Unsaved changes</Badge>
        <div className="flex items-center gap-2">
          <button type="button" className="px-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setS(saved)}>
            Discard
          </button>
          <SubmitButton busy={busy} disabled={!dirty} onClick={save}>
            Save changes
          </SubmitButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmPause}
        onOpenChange={setConfirmPause}
        title="Pause the Platform API?"
        description="Every developer request is rejected until you resume it and save. Existing keys are kept."
        confirmLabel="Pause API"
        destructive
        onConfirm={() => setS((v) => ({ ...v, platformEnabled: false }))}
      />
    </div>
  );
}

function SwitchCard({ icon: Icon, title, hint, checked, onChange }: { icon: LucideIcon; title: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3.5 transition-colors", checked && "border-primary/30 bg-primary/5")}>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", checked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
