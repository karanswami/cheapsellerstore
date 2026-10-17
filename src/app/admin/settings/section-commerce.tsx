"use client";

import { useState } from "react";
import { Field, ToggleRow } from "@/components/admin/kit";
import { Input } from "@/components/ui/input";
import { SettingsCard, useSettingsSave, type AdminSettings } from "./settings-kit";

export function CommerceSection({ s }: { s: AdminSettings }) {
  return (
    <>
      <Rewards s={s} />
      <Shares s={s} />
    </>
  );
}

function Pct({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint={hint}>
      <Input type="number" min="0" max="100" step="0.1" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Rewards({ s }: { s: AdminSettings }) {
  const { save, busy } = useSettingsSave();
  const [on, setOn] = useState(s.referralCommissionEnabled);
  const [referral, setReferral] = useState(String(s.referralPercent));
  return (
    <SettingsCard
      title="Referral commission"
      description="Optional % of every purchase a referred friend makes, paid to the referrer's wallet. Referral spins work either way."
      busy={busy}
      onSave={() => save({ referralCommissionEnabled: on, referralPercent: Number(referral) })}
    >
      <ToggleRow label="Pay referral commission" hint="Off = referrers only earn wheel spins." checked={on} onChange={setOn} />
      {on ? (
        <div className="max-w-xs">
          <Pct label="User purchases (%)" hint="Seller / reseller rates are in the Sellers tab." value={referral} onChange={setReferral} />
        </div>
      ) : null}
    </SettingsCard>
  );
}

function Shares({ s }: { s: AdminSettings }) {
  const { save, busy } = useSettingsSave();
  const [dev, setDev] = useState(String(s.developerProfitSharePercent));
  const [special, setSpecial] = useState(String(s.specialStockDeveloperSharePercent));
  return (
    <SettingsCard
      title="Profit sharing"
      description="Used by statistics and the Finance settlements."
      busy={busy}
      onSave={() => save({ developerProfitSharePercent: Number(dev), specialStockDeveloperSharePercent: Number(special) })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Pct label="Developer share of profit (%)" value={dev} onChange={setDev} />
        <Pct label="Developer share, special stock (%)" value={special} onChange={setSpecial} />
      </div>
    </SettingsCard>
  );
}
