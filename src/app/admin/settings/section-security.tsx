"use client";

import { BellRing, Headset, KeyRound, ShieldAlert, UserCog, UserPlus } from "lucide-react";
import { Field } from "@/components/admin/kit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SecurityConfig } from "@/lib/security-config-shared";
import { EditDialog, SettingRow, SettingsGroup, useModalKey, useSettingsState, type AdminSettings } from "./settings-kit";

function Num({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint={hint}>
      <Input type="number" min="1" step="1" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function SecuritySection({ s }: { s: AdminSettings }) {
  const { v, apply } = useSettingsState({ securityConfig: s.securityConfig });
  const c = v.securityConfig;
  const m = useModalKey();
  const patch = (p: Partial<SecurityConfig>) => apply({ securityConfig: { ...c, ...p } });

  return (
    <>
      <SettingsGroup title="Security limits" description="Abuse limits and allow-lists. Defaults are safe; only loosen them if real users get blocked.">
        <SettingRow
          icon={KeyRound}
          title="Login attempts"
          description="Failed-login rate limits."
          value={`${c.loginPerIpPer10Min}/IP · ${c.loginPerAccountPer15Min}/account`}
          onEdit={() => m.open("login")}
        />
        <SettingRow
          icon={UserPlus}
          title="Sign-ups"
          description="New accounts allowed per IP."
          value={`${c.registerPerIpPerHour}/hour · ${c.registerPerIpPerDay}/day`}
          onEdit={() => m.open("register")}
        />
        <SettingRow icon={Headset} title="Support chat" description="Messages allowed per IP." value={`${c.supportChatPerMinute}/min`} onEdit={() => m.open("chat")} />
        <SettingRow icon={UserCog} title="Admin impersonation" description="How long an impersonation session lasts." value={`${c.impersonationHours} h`} onEdit={() => m.open("imp")} />
        <SettingRow
          icon={BellRing}
          title="Push-service hosts"
          description="Only https endpoints on these hosts can receive notifications."
          value={`${c.pushEndpointHosts.length} host${c.pushEndpointHosts.length === 1 ? "" : "s"}`}
          onEdit={() => m.open("hosts")}
        />
      </SettingsGroup>
      <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <ShieldAlert className="size-3.5" /> Changes apply immediately.
      </p>

      <EditDialog
        {...m.bind("login")}
        title="Login attempts"
        initial={{ ip: String(c.loginPerIpPer10Min), acc: String(c.loginPerAccountPer15Min) }}
        onSave={(d) => patch({ loginPerIpPer10Min: Number(d.ip), loginPerAccountPer15Min: Number(d.acc) })}
      >
        {(d, set) => (
          <>
            <Num label="Attempts per IP (10 min)" value={d.ip} onChange={(x) => set("ip", x)} />
            <Num label="Attempts per account + IP (15 min)" value={d.acc} onChange={(x) => set("acc", x)} />
          </>
        )}
      </EditDialog>

      <EditDialog
        {...m.bind("register")}
        title="Sign-ups"
        initial={{ hour: String(c.registerPerIpPerHour), day: String(c.registerPerIpPerDay) }}
        onSave={(d) => patch({ registerPerIpPerHour: Number(d.hour), registerPerIpPerDay: Number(d.day) })}
      >
        {(d, set) => (
          <>
            <Num label="Sign-ups per IP (hour)" value={d.hour} onChange={(x) => set("hour", x)} />
            <Num label="Sign-ups per IP (day)" value={d.day} onChange={(x) => set("day", x)} />
          </>
        )}
      </EditDialog>

      <EditDialog {...m.bind("chat")} title="Support chat" initial={{ n: String(c.supportChatPerMinute) }} onSave={(d) => patch({ supportChatPerMinute: Number(d.n) })}>
        {(d, set) => <Num label="Messages per IP (minute)" value={d.n} onChange={(x) => set("n", x)} />}
      </EditDialog>

      <EditDialog {...m.bind("imp")} title="Admin impersonation" initial={{ n: String(c.impersonationHours) }} onSave={(d) => patch({ impersonationHours: Number(d.n) })}>
        {(d, set) => <Num label="Session window (hours)" hint="Max 72." value={d.n} onChange={(x) => set("n", x)} />}
      </EditDialog>

      <EditDialog
        {...m.bind("hosts")}
        title="Push-service hosts"
        initial={{ hosts: c.pushEndpointHosts.join("\n") }}
        onSave={(d) => patch({ pushEndpointHosts: d.hosts.split(/[\s,]+/).map((h) => h.trim()).filter(Boolean) })}
      >
        {(d, set) => (
          <Field label="Allowed hosts" hint="One per line. A leading dot (.push.apple.com) allows all sub-domains.">
            <Textarea rows={8} value={d.hosts} onChange={(e) => set("hosts", e.target.value)} className="font-mono text-xs" />
          </Field>
        )}
      </EditDialog>
    </>
  );
}
