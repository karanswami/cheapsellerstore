"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Gauge, Power, ShieldCheck } from "lucide-react";
import { Field, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/app-ui";
import { cn } from "@/lib/utils";

type Roles = { user: boolean; seller: boolean; reseller: boolean; admin: boolean };
type Settings = {
  platformEnabled: boolean;
  allowedRoles: Roles;
  defaultRateLimitRpm: number;
  burstLimit: number;
  maxKeysPerUser: number;
  sandboxEnabled: boolean;
};

const ROLES = ["user", "seller", "reseller", "admin"] as const;
type NumKey = "defaultRateLimitRpm" | "burstLimit" | "maxKeysPerUser";

export function SettingsTab() {
  const { data } = useAdminQuery<Settings>("/api/admin/seller-api/settings");
  return data ? <SettingsForm initial={data} /> : <TableSkeleton rows={4} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const [saved, setSaved] = useState(initial);
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  async function save() {
    setBusy(true);
    try {
      const { platformEnabled, allowedRoles, defaultRateLimitRpm, burstLimit, maxKeysPerUser, sandboxEnabled } = s;
      const next = await adminFetch<Settings>("/api/admin/seller-api/settings", {
        method: "PATCH",
        json: { platformEnabled, allowedRoles, defaultRateLimitRpm, burstLimit, maxKeysPerUser, sandboxEnabled },
      });
      setSaved(next);
      setS(next);
      toast.success("API settings saved.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const num = (k: NumKey) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Access"
          icon={Power}
          action={<Badge variant={s.platformEnabled ? "success" : "destructive"}>{s.platformEnabled ? "Live" : "Paused"}</Badge>}
          className="space-y-3"
        >
          <ToggleRow label="Platform API" hint="Master switch for every /api/v1 endpoint." checked={s.platformEnabled} onChange={(v) => setS({ ...s, platformEnabled: v })} />
          <ToggleRow label="Sandbox keys" hint="Let developers create test keys with demo data." checked={s.sandboxEnabled} onChange={(v) => setS({ ...s, sandboxEnabled: v })} />
        </Panel>

        <Panel title="Who can create keys" icon={ShieldCheck}>
          <p className="mb-3 text-sm text-muted-foreground">Only selected roles can generate and use API keys.</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const on = s.allowedRoles[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setS({ ...s, allowedRoles: { ...s.allowedRoles, [r]: !on } })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
                    on ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {on ? <Check className="size-3.5" /> : null} {r}
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Limits" icon={Gauge}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Rate limit (req/min)" hint="Per key. Max 300.">
            <Input type="number" min="1" max="300" value={s.defaultRateLimitRpm} onChange={num("defaultRateLimitRpm")} />
          </Field>
          <Field label="Burst limit" hint="Requests allowed in a short spike.">
            <Input type="number" min="1" value={s.burstLimit} onChange={num("burstLimit")} />
          </Field>
          <Field label="Max keys per user" hint="Active keys. Max 50.">
            <Input type="number" min="1" max="50" value={s.maxKeysPerUser} onChange={num("maxKeysPerUser")} />
          </Field>
        </div>
      </Panel>

      <div className="flex items-center gap-3">
        <SubmitButton busy={busy} disabled={!dirty} onClick={save}>
          Save changes
        </SubmitButton>
        {dirty ? (
          <>
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setS(saved)}>
              Discard
            </button>
            <Badge variant="warning">Unsaved changes</Badge>
          </>
        ) : null}
      </div>
    </div>
  );
}
