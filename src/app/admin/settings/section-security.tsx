"use client";

import { useState } from "react";
import { Field } from "@/components/admin/kit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SettingsCard, useSettingsSave, type AdminSettings } from "./settings-kit";

function Num({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint={hint}>
      <Input type="number" min="1" step="1" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function SecuritySection({ s }: { s: AdminSettings }) {
  const c = s.securityConfig;
  const { save, busy } = useSettingsSave();
  const [loginIp, setLoginIp] = useState(String(c.loginPerIpPer10Min));
  const [loginAcc, setLoginAcc] = useState(String(c.loginPerAccountPer15Min));
  const [regHour, setRegHour] = useState(String(c.registerPerIpPerHour));
  const [regDay, setRegDay] = useState(String(c.registerPerIpPerDay));
  const [chat, setChat] = useState(String(c.supportChatPerMinute));
  const [imp, setImp] = useState(String(c.impersonationHours));
  const [hosts, setHosts] = useState(c.pushEndpointHosts.join("\n"));

  return (
    <SettingsCard
      title="Security limits"
      description="Abuse limits and allow-lists. Defaults are safe; only loosen them if real users get blocked."
      busy={busy}
      onSave={() =>
        save({
          securityConfig: {
            loginPerIpPer10Min: Number(loginIp),
            loginPerAccountPer15Min: Number(loginAcc),
            registerPerIpPerHour: Number(regHour),
            registerPerIpPerDay: Number(regDay),
            supportChatPerMinute: Number(chat),
            impersonationHours: Number(imp),
            pushEndpointHosts: hosts.split(/[\s,]+/).map((h) => h.trim()).filter(Boolean),
          },
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Num label="Login attempts per IP (10 min)" value={loginIp} onChange={setLoginIp} />
        <Num label="Login attempts per account + IP (15 min)" value={loginAcc} onChange={setLoginAcc} />
        <Num label="Sign-ups per IP (hour)" value={regHour} onChange={setRegHour} />
        <Num label="Sign-ups per IP (day)" value={regDay} onChange={setRegDay} />
        <Num label="Support chat messages per IP (minute)" value={chat} onChange={setChat} />
        <Num label="Admin impersonation window (hours)" hint="Max 72." value={imp} onChange={setImp} />
      </div>
      <Field label="Allowed push-service hosts" hint="One per line. A leading dot (.push.apple.com) allows all sub-domains. Only https endpoints on these hosts can receive notifications.">
        <Textarea rows={6} value={hosts} onChange={(e) => setHosts(e.target.value)} />
      </Field>
    </SettingsCard>
  );
}
