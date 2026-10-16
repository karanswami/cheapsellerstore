"use client";

import { useState } from "react";
import { Field, ToggleRow } from "@/components/admin/kit";
import { Input } from "@/components/ui/input";
import { SettingsCard, useSettingsSave, type AdminSettings } from "./settings-kit";

export function CommerceSection({ s }: { s: AdminSettings }) {
  return (
    <>
      <Rewards s={s} />
      <Resellers s={s} />
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
          <Pct label="User purchases (%)" hint="Seller / reseller rates are in Seller program." value={referral} onChange={setReferral} />
        </div>
      ) : null}
    </SettingsCard>
  );
}

function Resellers({ s }: { s: AdminSettings }) {
  const { save, busy } = useSettingsSave();
  const [enabled, setEnabled] = useState(s.resellerProgramEnabled);
  const [auto, setAuto] = useState(s.resellerAutoApprove);
  const [applyMin, setApplyMin] = useState(String(s.resellerApplyMinBalance));
  const [createMin, setCreateMin] = useState(String(s.resellerCreateMinFunding));
  const [sellerPct, setSellerPct] = useState(String(s.sellerPurchasePercent));
  const [resellerPct, setResellerPct] = useState(String(s.resellerPurchasePercent));

  return (
    <SettingsCard
      title="Seller program"
      description="Who can become a seller and what wholesale accounts pay."
      busy={busy}
      onSave={() =>
        save({
          resellerProgramEnabled: enabled,
          resellerAutoApprove: auto,
          resellerApplyMinBalance: Number(applyMin),
          resellerCreateMinFunding: Number(createMin),
          sellerPurchasePercent: Number(sellerPct),
          resellerPurchasePercent: Number(resellerPct),
        })
      }
    >
      <ToggleRow label="Applications open" hint="Users can apply to become a seller." checked={enabled} onChange={setEnabled} />
      <ToggleRow label="Auto-approve applications" hint="Skip manual review." checked={auto} onChange={setAuto} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Min wallet balance to apply (USD)">
          <Input type="number" min="0" step="0.01" value={applyMin} onChange={(e) => setApplyMin(e.target.value)} />
        </Field>
        <Field label="Min funding to create a reseller (USD)">
          <Input type="number" min="0" step="0.01" value={createMin} onChange={(e) => setCreateMin(e.target.value)} />
        </Field>
        <Pct label="Seller pays (% of retail)" hint="Wholesale purchase price for sellers." value={sellerPct} onChange={setSellerPct} />
        <Pct label="Reseller pays (% of retail)" value={resellerPct} onChange={setResellerPct} />
      </div>
    </SettingsCard>
  );
}

function Shares({ s }: { s: AdminSettings }) {
  const { save, busy } = useSettingsSave();
  const [dev, setDev] = useState(String(s.developerProfitSharePercent));
  const [special, setSpecial] = useState(String(s.specialStockDeveloperSharePercent));
  const [buy, setBuy] = useState(String(s.supplierBuyPricePercent));
  return (
    <SettingsCard
      title="Profit sharing"
      description="Used by statistics and the Finance settlements."
      busy={busy}
      onSave={() => save({ developerProfitSharePercent: Number(dev), specialStockDeveloperSharePercent: Number(special), supplierBuyPricePercent: Number(buy) })}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Pct label="Developer share of profit (%)" value={dev} onChange={setDev} />
        <Pct label="Developer share, special stock (%)" value={special} onChange={setSpecial} />
        <Pct label="Supplier cost (% of supplier price)" hint="Estimated cost basis for supplier keys." value={buy} onChange={setBuy} />
      </div>
    </SettingsCard>
  );
}
