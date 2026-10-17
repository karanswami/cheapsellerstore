"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleDashed, Landmark, Plus } from "lucide-react";
import { Field, ImageUpload, SubmitButton } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSettingsSave, type ManualMethod } from "../settings/settings-kit";
import { EditorDialog, EditorFooter, InlineDelete, ListRow, SectionHead, StatusSwitch } from "./payments-ui";

type Props = { list: ManualMethod[]; setList: (l: ManualMethod[]) => void; codes: string[] };

export function ManualTab({ list, setList, codes }: Props) {
  const { save, busy } = useSettingsSave();
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const editing = editIdx !== null ? list[editIdx] ?? null : null;
  const [adding, setAdding] = useState(false);

  async function persist(next: ManualMethod[], msg: string) {
    const ok = await save({ manualDepositMethods: next.map((x, i) => ({ ...x, sortOrder: i })) }, msg);
    if (ok) setList(next);
    return ok;
  }

  return (
    <>
      <SectionHead
        title="Manual payment methods"
        desc="Bank, wallet or crypto accounts customers pay into and upload a screenshot for. You approve each one."
        action={<Button size="sm" onClick={() => setAdding(true)}><Plus /> Add method</Button>}
      />
      <div className="grid gap-3">
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No manual methods yet.</p>
        ) : null}

        {list.map((x, i) => (
          <ListRow
            key={x.id ?? i}
            onEdit={() => setEditIdx(i)}
            icon={Landmark}
            title={x.name || "Untitled"}
            dim={!x.enabled}
            badges={
              x.enabled ? (
                <Badge variant="success" shape="pill"><CheckCircle2 /> Live</Badge>
              ) : (
                <Badge variant="muted" shape="pill"><CircleDashed /> Off</Badge>
              )
            }
            meta={
              <>
                <Badge variant="default" shape="pill">{x.currency}</Badge>
                <Badge variant={x.accountNumber ? "outline" : "warning"}>{x.accountNumber ? "Account set" : "No account"}</Badge>
                {x.qrUrl ? <Badge variant="highlight">QR</Badge> : null}
                {x.instructions ? <Badge variant="muted">Instructions</Badge> : null}
              </>
            }
            actions={
              <StatusSwitch
                withMaintenance={false}
                value={x.enabled ? "live" : "off"}
                disabled={busy}
                onChange={(s) => persist(list.map((y, j) => (j === i ? { ...y, enabled: s === "live" } : y)), s === "live" ? "Method enabled." : "Method disabled.")}
              />
            }
          />
        ))}
      </div>

      <EditorDialog open={adding} onClose={() => setAdding(false)} title="New manual method" icon={Landmark} desc="An account customers pay into, then upload a screenshot for you to approve.">
        {adding ? (
          <ManualForm
            initial={{ name: "", currency: codes[0] ?? "USD", enabled: true, sortOrder: list.length }}
            isNew
            codes={codes}
            busy={busy}
            onClose={() => setAdding(false)}
            onSave={async (m) => {
              if (await persist([...list, m], "Method added.")) setAdding(false);
            }}
          />
        ) : null}
      </EditorDialog>

      <EditorDialog open={editing !== null} onClose={() => setEditIdx(null)} title={`Edit ${editing?.name || "method"}`} icon={Landmark}>
        {editing ? (
          <ManualForm
            key={editIdx}
            initial={editing}
            codes={codes}
            busy={busy}
            onClose={() => setEditIdx(null)}
            onSave={async (m) => void (await persist(list.map((y, j) => (j === editIdx ? m : y)), "Method saved."))}
            extra={
              <InlineDelete
                busy={busy}
                onConfirm={async () => {
                  if (await persist(list.filter((_, j) => j !== editIdx), "Method removed.")) setEditIdx(null);
                }}
              />
            }
          />
        ) : null}
      </EditorDialog>
    </>
  );
}

function ManualForm({ initial, isNew, codes, busy, onSave, onClose, extra }: {
  initial: ManualMethod;
  isNew?: boolean;
  codes: string[];
  busy: boolean;
  onSave: (m: ManualMethod) => Promise<void>;
  onClose: () => void;
  extra?: React.ReactNode;
}) {
  const [m, setM] = useState<ManualMethod>(initial);
  const dirty = isNew || JSON.stringify(m) !== JSON.stringify(initial);

  async function submit() {
    if (!m.name.trim()) return void toast.error("Method name is required.");
    await onSave(m);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Method name"><Input value={m.name} maxLength={80} onChange={(e) => setM({ ...m, name: e.target.value })} /></Field>
        <Field label="Currency">
          <Select value={m.currency} onValueChange={(v) => setM({ ...m, currency: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {codes.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Account / address"><Input value={m.accountNumber ?? ""} maxLength={500} onChange={(e) => setM({ ...m, accountNumber: e.target.value })} /></Field>
      <Field label="Instructions"><Textarea value={m.instructions ?? ""} rows={3} maxLength={1000} onChange={(e) => setM({ ...m, instructions: e.target.value })} /></Field>
      <ImageUpload label="QR code" hint="Customers scan this to pay." value={m.qrUrl || null} onChange={(u) => setM({ ...m, qrUrl: u ?? "" })} endpoint="/api/admin/settings/deposit-qr" />
      {isNew ? (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={busy} onClick={onClose}>Cancel</Button>
          <SubmitButton size="sm" busy={busy} onClick={submit}>Add method</SubmitButton>
        </div>
      ) : (
        <EditorFooter busy={busy} dirty={dirty} onSave={submit} onCancel={onClose} extra={extra} />
      )}
    </>
  );
}
