"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Chips, Field, ToggleRow } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_SELLER_PERKS, SELLER_FIELDS, type SellerFieldMode, type SellerProgramConfig } from "@/types/seller-program";
import { SettingsCard, useSettingsSave, type AdminSettings } from "./settings-kit";

export function SellersSection({ s }: { s: AdminSettings }) {
  return (
    <>
      <Applications s={s} />
      <ApplyPage s={s} />
      <FormFields s={s} />
      <Accounts s={s} />
    </>
  );
}

/** Saves one slice of the JSON config, keeping the rest of what was loaded. */
function useConfigSave(s: AdminSettings) {
  const { save, busy } = useSettingsSave();
  return {
    busy,
    saveConfig: (patch: Partial<SellerProgramConfig>, extra: Record<string, unknown> = {}) =>
      save({ ...extra, sellerProgram: { ...s.sellerProgram, ...patch } }).then((ok) => {
        if (ok) Object.assign(s.sellerProgram, patch);
        return ok;
      }),
  };
}

function Applications({ s }: { s: AdminSettings }) {
  const { saveConfig, busy } = useConfigSave(s);
  const [enabled, setEnabled] = useState(s.resellerProgramEnabled);
  const [auto, setAuto] = useState(s.resellerAutoApprove);
  const [applyMin, setApplyMin] = useState(String(s.resellerApplyMinBalance));
  const [cooldown, setCooldown] = useState(String(s.sellerProgram.reapplyCooldownDays));
  const [closed, setClosed] = useState(s.sellerProgram.closedMessage);

  return (
    <SettingsCard
      title="Applications"
      description="Whether users can apply to become a seller, and how requests are handled."
      busy={busy}
      onSave={() =>
        saveConfig(
          { closedMessage: closed, reapplyCooldownDays: Math.max(0, Math.round(Number(cooldown) || 0)) },
          { resellerProgramEnabled: enabled, resellerAutoApprove: auto, resellerApplyMinBalance: Number(applyMin) },
        )
      }
    >
      <ToggleRow
        label="Applications open"
        hint={enabled ? "The Become a Seller form is live." : "Users see the closed message below instead of the form."}
        checked={enabled}
        onChange={setEnabled}
      />
      <ToggleRow label="Auto-approve applications" hint="Upgrade applicants to Seller instantly, skipping manual review." checked={auto} onChange={setAuto} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Min wallet balance to apply (USD)" hint="Whole dollars. 0 = anyone can apply.">
          <Input type="number" min="0" step="1" value={applyMin} onChange={(e) => setApplyMin(e.target.value)} />
        </Field>
        <Field label="Re-apply wait after rejection (days)" hint="0 = they can apply again right away.">
          <Input type="number" min="0" max="365" step="1" value={cooldown} onChange={(e) => setCooldown(e.target.value)} />
        </Field>
      </div>
      <Field label="Closed message" hint="Shown on the page while applications are closed.">
        <Textarea rows={2} maxLength={300} value={closed} onChange={(e) => setClosed(e.target.value)} />
      </Field>
    </SettingsCard>
  );
}

function ApplyPage({ s }: { s: AdminSettings }) {
  const { saveConfig, busy } = useConfigSave(s);
  const [headline, setHeadline] = useState(s.sellerProgram.headline);
  const [perks, setPerks] = useState<string[]>(s.sellerProgram.perks);

  const set = (i: number, v: string) => setPerks((p) => p.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: -1 | 1) =>
    setPerks((p) => {
      const n = [...p];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  return (
    <SettingsCard
      title="Become a Seller page"
      description="The headline and the “What you get” list customers see before applying."
      busy={busy}
      onSave={() => saveConfig({ headline, perks: perks.map((p) => p.trim()).filter(Boolean) })}
    >
      <Field label="Headline">
        <Input maxLength={80} value={headline} onChange={(e) => setHeadline(e.target.value)} />
      </Field>
      <Field label={`Perks (${perks.length}/${MAX_SELLER_PERKS})`}>
        <div className="grid gap-2">
          {perks.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input maxLength={120} value={p} onChange={(e) => set(i, e.target.value)} placeholder="e.g. Wholesale pricing on the full catalog" />
              <Button type="button" size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <ArrowUp />
              </Button>
              <Button type="button" size="icon" variant="ghost" disabled={i === perks.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <ArrowDown />
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => setPerks((x) => x.filter((_, j) => j !== i))} aria-label="Remove">
                <X />
              </Button>
            </div>
          ))}
          {perks.length < MAX_SELLER_PERKS ? (
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setPerks((x) => [...x, ""])}>
              <Plus /> Add perk
            </Button>
          ) : null}
        </div>
      </Field>
    </SettingsCard>
  );
}

const MODE_OPTIONS: { v: SellerFieldMode; label: string }[] = [
  { v: "required", label: "Required" },
  { v: "optional", label: "Optional" },
  { v: "hidden", label: "Hidden" },
];

function FormFields({ s }: { s: AdminSettings }) {
  const { saveConfig, busy } = useConfigSave(s);
  const [fields, setFields] = useState(s.sellerProgram.fields);

  return (
    <SettingsCard
      title="Application form"
      description="Name, phone, country, Telegram and “why join” are always required. Choose what else to ask."
      busy={busy}
      onSave={() => saveConfig({ fields })}
    >
      <div className="divide-y rounded-lg border">
        {SELLER_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="text-sm font-medium">{f.label}</p>
            <Chips value={fields[f.key]} onChange={(v) => setFields((p) => ({ ...p, [f.key]: v }))} options={MODE_OPTIONS} />
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function Pct({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint={hint}>
      <Input type="number" min="0" max="100" step="1" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Accounts({ s }: { s: AdminSettings }) {
  const { save, busy } = useSettingsSave();
  const [createMin, setCreateMin] = useState(String(s.resellerCreateMinFunding));
  const [sellerPct, setSellerPct] = useState(String(s.sellerPurchasePercent));
  const [resellerPct, setResellerPct] = useState(String(s.resellerPurchasePercent));

  return (
    <SettingsCard
      title="Seller accounts"
      description="Rules for existing sellers and the resellers they create."
      busy={busy}
      onSave={() =>
        save({
          resellerCreateMinFunding: Number(createMin),
          sellerPurchasePercent: Number(sellerPct),
          resellerPurchasePercent: Number(resellerPct),
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Min funding to create a reseller (USD)" hint="Whole dollars a seller must load into a new reseller.">
          <Input type="number" min="0" step="1" value={createMin} onChange={(e) => setCreateMin(e.target.value)} />
        </Field>
        <Pct
          label="Referral commission: seller buys (%)"
          hint={s.referralCommissionEnabled ? "Paid to the referrer when a referred seller buys." : "Only used when referral commission is on (Commerce)."}
          value={sellerPct}
          onChange={setSellerPct}
        />
        <Pct label="Referral commission: reseller buys (%)" value={resellerPct} onChange={setResellerPct} />
      </div>
    </SettingsCard>
  );
}
