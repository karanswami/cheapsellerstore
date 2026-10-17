"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Coins, Plus } from "lucide-react";
import { Field, SubmitButton } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingsSave, type AdminSettings } from "../settings/settings-kit";
import { EditorDialog, EditorFooter, InlineDelete, ListRow, SectionHead } from "./payments-ui";

const LOCKED = new Set(["USD"]);

type Cur = AdminSettings["depositCurrencies"][number];
type Mins = AdminSettings["depositMins"];

type Props = {
  list: Cur[];
  setList: (l: Cur[]) => void;
  mins: Mins;
  setMins: (m: Mins) => void;
  quick: Record<string, number[]>;
  setQuick: (q: Record<string, number[]>) => void;
  /** Currency code -> how many payment methods (auto + manual) use it. */
  usage: Record<string, number>;
};

export function CurrenciesTab({ list, setList, mins, setMins, quick, setQuick, usage }: Props) {
  const { save, busy } = useSettingsSave();
  const [editCode, setEditCode] = useState<string | null>(null);
  const editing = list.find((x) => x.code === editCode) ?? null;
  const [adding, setAdding] = useState(false);

  async function persist(nextList: Cur[], nextMins: Mins, nextQuick: Record<string, number[]>, msg: string) {
    const ok = await save(
      { depositCurrencies: nextList.map((x, i) => ({ ...x, code: x.code.toUpperCase(), sortOrder: i })), depositMins: nextMins, depositQuickAmounts: nextQuick },
      msg,
    );
    if (ok) {
      setList(nextList);
      setMins(nextMins);
      setQuick(nextQuick);
    }
    return ok;
  }

  return (
    <>
      <SectionHead
        title="Pay currencies"
        desc="Create a currency first — gateways and manual methods attach to it. Wallet credit is always USD."
        action={<Button size="sm" onClick={() => setAdding(true)}><Plus /> Add currency</Button>}
      />
      <div className="grid gap-3">
        {list.map((x) => {
          const inUse = (usage[x.code] ?? 0) > 0;
          return (
            <ListRow
              key={x.code}
              onEdit={() => setEditCode(x.code)}
              icon={Coins}
              title={`${x.name} · ${x.code}`}
              badges={
                <>
                  <Badge variant="default" shape="pill">{x.symbol || x.code}</Badge>
                  {x.code === "USD" ? <Badge variant="highlight" shape="pill">Base</Badge> : null}
                </>
              }
              meta={
                <>
                  <Badge variant="outline">1 USD = {x.code === "USD" ? 1 : x.rate} {x.code}</Badge>
                  {inUse ? <Badge variant="success">{usage[x.code]} method{usage[x.code] === 1 ? "" : "s"}</Badge> : <Badge variant="muted">Unused</Badge>}
                  <Badge variant="muted">Min user {mins.user[x.code] ?? "—"}</Badge>
                  <Badge variant="muted">Min seller {mins.reseller[x.code] ?? "—"}</Badge>
                </>
              }
            />
          );
        })}
      </div>

      <EditorDialog open={adding} onClose={() => setAdding(false)} title="New currency" icon={Coins} desc="Gateways and manual methods attach to a currency.">
        {adding ? (
          <CurrencyForm
            initial={{ code: "", name: "", symbol: "", rate: 1, sortOrder: list.length }}
            isNew
            locked={false}
            mins={mins}
            quick={quick}
            busy={busy}
            onClose={() => setAdding(false)}
            onSave={async (entry, nextMins, nextQuick) => {
              if (list.some((x) => x.code === entry.code)) return void toast.error(`${entry.code} already exists.`);
              if (await persist([...list, entry], nextMins, nextQuick, "Currency added.")) setAdding(false);
            }}
          />
        ) : null}
      </EditorDialog>

      <EditorDialog open={editing !== null} onClose={() => setEditCode(null)} title={editing ? `Edit ${editing.name}` : "Edit currency"} icon={Coins}>
        {editing ? (
          <CurrencyForm
            key={editing.code}
            initial={editing}
            locked={LOCKED.has(editing.code)}
            mins={mins}
            quick={quick}
            busy={busy}
            onClose={() => setEditCode(null)}
            onSave={async (entry, nextMins, nextQuick) => {
              await persist(list.map((y) => (y.code === editing.code ? entry : y)), nextMins, nextQuick, "Currency saved.");
            }}
            extra={
              <InlineDelete
                busy={busy}
                disabled={LOCKED.has(editing.code) || (usage[editing.code] ?? 0) > 0}
                title={LOCKED.has(editing.code) ? "Base currency" : (usage[editing.code] ?? 0) > 0 ? "In use by a payment method" : undefined}
                onConfirm={async () => {
                  const nextQuick = { ...quick };
                  delete nextQuick[editing.code];
                  if (await persist(list.filter((y) => y.code !== editing.code), mins, nextQuick, "Currency removed.")) setEditCode(null);
                }}
              />
            }
          />
        ) : null}
      </EditorDialog>
    </>
  );
}

function CurrencyForm({ initial, isNew, locked, mins, quick, busy, onSave, onClose, extra }: {
  initial: Cur;
  isNew?: boolean;
  locked: boolean;
  mins: Mins;
  quick: Record<string, number[]>;
  busy: boolean;
  onSave: (entry: Cur, mins: Mins, quick: Record<string, number[]>) => Promise<void>;
  onClose: () => void;
  extra?: React.ReactNode;
}) {
  const [c, setC] = useState<Cur>(initial);
  const [minU, setMinU] = useState(String(mins.user[initial.code] ?? ""));
  const [minR, setMinR] = useState(String(mins.reseller[initial.code] ?? ""));
  const [qk, setQk] = useState((quick[initial.code] ?? []).join(", "));
  const dirty = isNew || JSON.stringify([c, minU, minR, qk]) !== JSON.stringify([initial, String(mins.user[initial.code] ?? ""), String(mins.reseller[initial.code] ?? ""), (quick[initial.code] ?? []).join(", ")]);

  async function submit() {
    const code = c.code.trim().toUpperCase();
    if (!code || !c.name.trim()) return void toast.error("Code and name are required.");
    const nextMins = {
      user: { ...mins.user, [code]: Number(minU) || 0 },
      reseller: { ...mins.reseller, [code]: Number(minR) || 0 },
    };
    const nextQuick = { ...quick };
    const nums = qk.split(",").map((x) => Number(x.trim())).filter((n) => n > 0).slice(0, 4);
    if (nums.length) nextQuick[code] = nums;
    else delete nextQuick[code];
    await onSave({ ...c, code }, nextMins, nextQuick);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Code"><Input value={c.code} disabled={locked || !isNew} maxLength={8} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase() })} /></Field>
        <Field label="Symbol"><Input value={c.symbol} maxLength={8} onChange={(e) => setC({ ...c, symbol: e.target.value })} /></Field>
        <Field label="Amount = 1 USD" hint={c.code ? `How many ${c.code} you get for 1 USD.` : undefined}>
          <Input type="number" min="0" step="any" value={c.rate} disabled={c.code === "USD"} onChange={(e) => setC({ ...c, rate: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Name"><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Min deposit (users)"><Input type="number" min="0" value={minU} onChange={(e) => setMinU(e.target.value)} /></Field>
        <Field label="Min deposit (sellers)"><Input type="number" min="0" value={minR} onChange={(e) => setMinR(e.target.value)} /></Field>
        <Field label="Quick amounts" hint="Up to 4, comma separated."><Input value={qk} onChange={(e) => setQk(e.target.value)} placeholder="5, 10, 25, 50" /></Field>
      </div>
      {isNew ? (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={busy} onClick={onClose}>Cancel</Button>
          <SubmitButton size="sm" busy={busy} onClick={submit}>Add currency</SubmitButton>
        </div>
      ) : (
        <EditorFooter busy={busy} dirty={dirty} onSave={submit} onCancel={onClose} extra={extra} />
      )}
    </>
  );
}
