"use client";

import { Coins, Percent, Wrench } from "lucide-react";
import { Field } from "@/components/admin/kit";
import { Input } from "@/components/ui/input";
import { EditDialog, SettingRow, SettingsGroup, useModalKey, useSettingsState, type AdminSettings } from "./settings-kit";

export function CommerceSection({ s }: { s: AdminSettings }) {
  const { v, apply, flip, busy } = useSettingsState({
    referralCommissionEnabled: s.referralCommissionEnabled,
    referralPercent: s.referralPercent,
    developerProfitSharePercent: s.developerProfitSharePercent,
  });
  const m = useModalKey();

  return (
    <>
      <SettingsGroup title="Referrals" description="Referral spins work either way; commission is optional.">
        <SettingRow
          icon={Coins}
          title="Pay referral commission"
          description={v.referralCommissionEnabled ? "Referrers earn a share of purchases plus wheel spins." : "Off — referrers only earn wheel spins."}
          checked={v.referralCommissionEnabled}
          switchDisabled={busy}
          onCheckedChange={(on) => flip("referralCommissionEnabled", on)}
        />
        {v.referralCommissionEnabled ? (
          <SettingRow
            icon={Percent}
            title="Commission rate"
            description="% of every purchase a referred user makes. Seller / reseller rates are in the Sellers tab."
            value={`${v.referralPercent}%`}
            onEdit={() => m.open("referral")}
          />
        ) : null}
      </SettingsGroup>

      <SettingsGroup title="Profit sharing" description="Used by statistics and the Finance settlements.">
        <SettingRow
          icon={Wrench}
          title="Developer share of profit"
          value={`${v.developerProfitSharePercent}%`}
          onEdit={() => m.open("dev")}
        />
      </SettingsGroup>

      <EditDialog
        {...m.bind("referral")}
        title="Commission rate"
        initial={{ pct: String(v.referralPercent) }}
        onSave={(d) => apply({ referralPercent: Number(d.pct) })}
      >
        {(d, set) => (
          <Field label="User purchases (%)">
            <Input type="number" min="0" max="100" step="0.1" value={d.pct} onChange={(e) => set("pct", e.target.value)} />
          </Field>
        )}
      </EditDialog>

      <EditDialog
        {...m.bind("dev")}
        title="Developer profit share"
        initial={{ pct: String(v.developerProfitSharePercent) }}
        onSave={(d) => apply({ developerProfitSharePercent: Number(d.pct) })}
      >
        {(d, set) => (
          <Field label="Developer share of profit (%)">
            <Input type="number" min="0" max="100" step="0.1" value={d.pct} onChange={(e) => set("pct", e.target.value)} />
          </Field>
        )}
      </EditDialog>
    </>
  );
}
