import "server-only";
import { randomBytes } from "node:crypto";
import type { Deposit } from "@prisma/client";
import { getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import { isDepositQrImageUrl } from "@/lib/public-uploads";
import { getDepositMethodsConfig } from "@/lib/deposit-methods";
import { runWithGateway } from "@/lib/gateway-context";
import {
  GATEWAY_CRED_KEYS,
  GATEWAY_PROVIDERS,
  PROVIDER_META,
  type GatewayProvider,
} from "@/lib/gateway-providers";

export type AutoGateway = {
  id: string;
  provider: GatewayProvider;
  name: string;
  currency: string;
  /** Off = hidden from customers. */
  enabled: boolean;
  /** Visible but not selectable; `maintenanceNote` explains why. */
  maintenance: boolean;
  maintenanceNote: string;
  /** Static pay QR (Binance / eSewa). */
  qrUrl: string;
  /** Provider keys for this gateway only. Blank = fall back to the shared keys in Settings/env. */
  creds: Record<string, string>;
  sortOrder: number;
};

export type PublicGateway = {
  id: string;
  name: string;
  provider: GatewayProvider;
  currency: string;
  maintenance: boolean;
  note: string;
};

function newId() {
  return `gw_${randomBytes(4).toString("hex")}`;
}

function cleanStr(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function normalizeGateways(raw: unknown): AutoGateway[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: AutoGateway[] = [];
  raw.forEach((item, i) => {
    const e = (item ?? {}) as Partial<AutoGateway>;
    if (!e.provider || !GATEWAY_PROVIDERS.includes(e.provider)) return;
    const meta = PROVIDER_META[e.provider];
    let id = cleanStr(e.id, 40) || newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    const cur = cleanStr(e.currency, 8).toUpperCase();
    const currency = meta.lockedCurrency ?? (/^[A-Z]{2,8}$/.test(cur) ? cur : meta.defaultCurrency);
    const qr = cleanStr(e.qrUrl, 500);
    const creds: Record<string, string> = {};
    for (const f of meta.fields) {
      const v = cleanStr(e.creds?.[f.key], 500);
      if (v && GATEWAY_CRED_KEYS.has(f.key)) creds[f.key] = v;
    }
    out.push({
      id,
      provider: e.provider,
      name: cleanStr(e.name, 60) || meta.label,
      currency,
      enabled: e.enabled !== false,
      maintenance: e.maintenance === true,
      maintenanceNote: cleanStr(e.maintenanceNote, 200),
      qrUrl: meta.qr && qr && isDepositQrImageUrl(qr) ? qr : "",
      creds,
      sortOrder: i,
    });
  });
  return out;
}

/** Gateways derived from the old fixed 4-rail config, used until the admin first saves. */
async function legacyGateways(): Promise<AutoGateway[]> {
  const legacy = await getDepositMethodsConfig();
  return GATEWAY_PROVIDERS.map((provider, i) => ({
    id: provider,
    provider,
    name: PROVIDER_META[provider].label,
    currency: legacy[provider].currency,
    enabled: legacy[provider].enabled,
    maintenance: false,
    maintenanceNote: "",
    qrUrl: legacy[provider].qrUrl,
    creds: {},
    sortOrder: i,
  }));
}

export async function getAutoGateways(): Promise<AutoGateway[]> {
  const raw = await getSettingText(SETTING_KEYS.autoGateways, "");
  if (!raw.trim()) return legacyGateways();
  try {
    return normalizeGateways(JSON.parse(raw));
  } catch {
    return legacyGateways();
  }
}

export async function saveAutoGateways(list: AutoGateway[]): Promise<AutoGateway[]> {
  const normalized = normalizeGateways(list);
  await upsertSetting({ key: SETTING_KEYS.autoGateways, textValue: JSON.stringify(normalized) });
  return normalized;
}

export async function getGatewayById(id: string): Promise<AutoGateway | undefined> {
  return (await getAutoGateways()).find((g) => g.id === id);
}

export function toPublicGateways(list: AutoGateway[]): PublicGateway[] {
  return list
    .filter((g) => g.enabled)
    .map((g) => ({
      id: g.id,
      name: g.name,
      provider: g.provider,
      currency: g.currency,
      maintenance: g.maintenance,
      note: g.maintenanceNote,
    }));
}

/** Run provider calls with this gateway's keys / QR in scope. */
export function runInGateway<T>(gateway: AutoGateway | undefined, fn: () => Promise<T>): Promise<T> {
  if (!gateway) return fn();
  return runWithGateway({ creds: gateway.creds, qrUrl: gateway.qrUrl }, fn);
}

/** Gateway that created a deposit; pre-gateway deposits map to the first gateway of their rail. */
export async function gatewayForDeposit(deposit: Pick<Deposit, "method" | "gatewayKey">) {
  const list = await getAutoGateways();
  if (deposit.gatewayKey) {
    const hit = list.find((g) => g.id === deposit.gatewayKey);
    if (hit) return hit;
  }
  return list.find((g) => g.provider === deposit.method);
}

export async function runForDeposit<T>(
  deposit: Pick<Deposit, "method" | "gatewayKey">,
  fn: () => Promise<T>,
): Promise<T> {
  return runInGateway(await gatewayForDeposit(deposit), fn);
}

/**
 * Webhook signature check across every gateway of a provider (each can have its own secret),
 * then the shared keys.
 */
export async function verifyAcrossGateways(
  provider: GatewayProvider,
  check: () => Promise<boolean>,
): Promise<boolean> {
  const list = (await getAutoGateways()).filter((g) => g.provider === provider && Object.keys(g.creds).length > 0);
  for (const g of list) {
    if (await runInGateway(g, check)) return true;
  }
  return check();
}
