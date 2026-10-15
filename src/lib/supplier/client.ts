import { prisma } from "@/lib/prisma";
import {
  getSupplierApiBaseUrl,
  getSupplierApiKey,
} from "@/lib/supplier/config";

export type SupplierEndpoint = "balance" | "catalog" | "generate" | "history";

export type SupplierCatalogItem = {
  id: number;
  name: string;
  price: string;
  in_stock: boolean;
  group_name?: string;
  validity_days?: number | null;
  stock_count?: number | null;
  list_price?: string | null;
  requires_android_id?: boolean;
};

/** Raw product row from flat / grouped / full catalog formats. */
type SupplierCatalogRawProduct = {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  price_raw?: unknown;
  in_stock?: unknown;
  group_name?: unknown;
  validity_days?: unknown;
  stock_count?: unknown;
  list_price?: unknown;
  requires_android_id?: unknown;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asDisplayPrice(value: unknown, fallback?: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  const n = asFiniteNumber(value) ?? asFiniteNumber(fallback);
  if (n == null) return "0";
  return String(n);
}

function normalizeCatalogProduct(
  raw: SupplierCatalogRawProduct,
): SupplierCatalogItem | null {
  const id = asFiniteNumber(raw.id);
  if (id == null) return null;
  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : `Product #${id}`;
  return {
    id,
    name,
    price: asDisplayPrice(raw.price, raw.price_raw),
    in_stock: raw.in_stock !== false,
    group_name:
      typeof raw.group_name === "string" && raw.group_name.trim()
        ? raw.group_name.trim()
        : undefined,
    validity_days: asFiniteNumber(raw.validity_days),
    stock_count: asFiniteNumber(raw.stock_count),
    list_price:
      typeof raw.list_price === "string" && raw.list_price.trim()
        ? raw.list_price.trim()
        : asFiniteNumber(raw.list_price) != null
          ? String(asFiniteNumber(raw.list_price))
          : null,
    requires_android_id: raw.requires_android_id === true,
  };
}

/**
 * Supplier catalog.php may return:
 * - flat array of products
 * - `{ products: [...] }` / `{ groups: [{ products }] }` (full/grouped format)
 */
export function normalizeSupplierCatalog(data: unknown): SupplierCatalogItem[] {
  const out: SupplierCatalogItem[] = [];
  const seen = new Set<number>();

  const pushMany = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const row of list) {
      if (!row || typeof row !== "object") continue;
      const item = normalizeCatalogProduct(row as SupplierCatalogRawProduct);
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  };

  if (Array.isArray(data)) {
    pushMany(data);
    return out;
  }

  if (!data || typeof data !== "object") return out;
  const obj = data as {
    products?: unknown;
    groups?: unknown;
    items?: unknown;
  };

  // Prefer groups first (richer group_name / validity), then flat lists.
  if (Array.isArray(obj.groups)) {
    for (const group of obj.groups) {
      if (!group || typeof group !== "object") continue;
      const g = group as { products?: unknown; group_name?: unknown };
      if (!Array.isArray(g.products)) continue;
      const groupName =
        typeof g.group_name === "string" && g.group_name.trim()
          ? g.group_name.trim()
          : undefined;
      for (const row of g.products) {
        if (!row || typeof row !== "object") continue;
        const merged = {
          ...(row as SupplierCatalogRawProduct),
          group_name:
            (row as SupplierCatalogRawProduct).group_name ?? groupName,
        };
        const item = normalizeCatalogProduct(merged);
        if (!item || seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
      }
    }
  }

  // Also support Variants grouped by "normal" and "android_id_required" (e.g. from upstream structure)
  if (Array.isArray(obj.products)) {
    for (const p of obj.products) {
      if (!p || typeof p !== "object") continue;
      const productObj = p as { variants?: { normal?: unknown; android_id_required?: unknown }, group_name?: unknown };
      if (productObj.variants) {
        const gn = typeof productObj.group_name === "string" ? productObj.group_name : undefined;
        if (Array.isArray(productObj.variants.normal)) {
          for (const v of productObj.variants.normal) {
            const merged = { ...(v as SupplierCatalogRawProduct), group_name: (v as any).group_name ?? gn };
            const item = normalizeCatalogProduct(merged);
            if (!item || seen.has(item.id)) continue;
            seen.add(item.id);
            out.push(item);
          }
        }
        if (Array.isArray(productObj.variants.android_id_required)) {
          for (const v of productObj.variants.android_id_required) {
            const merged = { ...(v as SupplierCatalogRawProduct), group_name: (v as any).group_name ?? gn };
            const item = normalizeCatalogProduct(merged);
            if (!item || seen.has(item.id)) continue;
            seen.add(item.id);
            out.push(item);
          }
        }
      } else {
        pushMany([p]); // it's just a flat product object
      }
    }
  }

  pushMany(obj.items);

  return out;
}

export type SupplierBalance = {
  balance: string;
  currency: string;
  lifetime_keys: number;
};

/** Raw key row from generate.php — object form or legacy plain string. */
export type SupplierGeneratedKeyRaw = {
  key?: unknown;
  password?: unknown;
  full_value?: unknown;
};

export type SupplierGenerateResult = {
  delivered: number;
  amount_charged: string;
  new_balance: string;
  /** Display codes for the buyer — prefers supplier `full_value`. */
  keys: string[];
};

/**
 * Prefer `full_value` (what the customer should see / copy).
 * Falls back to `key` (+ password if present) or a legacy plain string.
 */
export function normalizeSupplierKeyCode(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as SupplierGeneratedKeyRaw;
  if (typeof obj.full_value === "string" && obj.full_value.trim()) {
    return obj.full_value.trim();
  }
  const key =
    typeof obj.key === "string" && obj.key.trim() ? obj.key.trim() : "";
  const password =
    typeof obj.password === "string" && obj.password.trim()
      ? obj.password.trim()
      : "";
  if (key && password) return `${key}:${password}`;
  if (key) return key;
  return null;
}

export function normalizeSupplierKeyCodes(rawKeys: unknown): string[] {
  if (!Array.isArray(rawKeys)) return [];
  const out: string[] = [];
  for (const row of rawKeys) {
    const code = normalizeSupplierKeyCode(row);
    if (code) out.push(code);
  }
  return out;
}

export type SupplierHistoryItem = {
  key: string;
  product: string;
  price: string;
};

export type SupplierCallMeta = {
  orderId?: string | null;
  durationId?: string | null;
  userId?: string | null;
  productId?: number | null;
  quantity?: number | null;
  idempotencyKey?: string | null;
  usedFallback?: boolean;
};

type SupplierErrorBody = {
  ok: false;
  error?: { code?: string; message?: string };
};

type LogWrite = {
  endpoint: SupplierEndpoint;
  method: string;
  httpStatus: number;
  ok: boolean;
  requestJson: string;
  responseJson: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  meta?: SupplierCallMeta;
};

/** Keep only the last 1 day (24 hours) of supplier API logs. */
export const SUPPLIER_API_LOG_RETENTION_DAYS = 1;

export function supplierApiLogCutoff(now = new Date()): Date {
  return new Date(
    now.getTime() - SUPPLIER_API_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

/** Delete supplier logs older than 1 day. Safe to call from cron / background. */
export async function purgeExpiredSupplierApiLogs(): Promise<{ deleted: number }> {
  const result = await prisma.supplierApiLog.deleteMany({
    where: { createdAt: { lt: supplierApiLogCutoff() } },
  });
  return { deleted: result.count };
}

async function writeLog(input: LogWrite) {
  const meta = input.meta ?? {};
  try {
    await prisma.supplierApiLog.create({
      data: {
        endpoint: input.endpoint,
        method: input.method,
        httpStatus: input.httpStatus,
        ok: input.ok,
        productId: meta.productId ?? null,
        quantity: meta.quantity ?? null,
        idempotencyKey: meta.idempotencyKey ?? null,
        orderId: meta.orderId ?? null,
        durationId: meta.durationId ?? null,
        userId: meta.userId ?? null,
        requestJson: input.requestJson,
        responseJson: input.responseJson,
        usedFallback: meta.usedFallback ?? false,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    });

    if (Math.random() < 0.05) {
      await purgeExpiredSupplierApiLogs().catch(() => undefined);
    }
  } catch {
    // Logging must never break fulfill
  }
}

export async function markSupplierLogFallback(opts: {
  orderId?: string | null;
  durationId?: string | null;
  idempotencyKey?: string | null;
}) {
  try {
    const where =
      opts.idempotencyKey != null
        ? { idempotencyKey: opts.idempotencyKey }
        : opts.orderId && opts.durationId
          ? { orderId: opts.orderId, durationId: opts.durationId }
          : null;
    if (!where) return;
    const latest = await prisma.supplierApiLog.findFirst({
      where: { ...where, endpoint: "generate" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!latest) return;
    await prisma.supplierApiLog.update({
      where: { id: latest.id },
      data: { usedFallback: true },
    });
  } catch {
    // ignore
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function supplierFetch<T>(opts: {
  endpoint: SupplierEndpoint;
  path: string;
  method: "GET" | "POST";
  body?: unknown;
  meta?: SupplierCallMeta;
  retry429?: boolean;
}): Promise<
  | { ok: true; data: T; httpStatus: number }
  | {
      ok: false;
      httpStatus: number;
      errorCode: string;
      errorMessage: string;
      raw: string;
    }
> {
  const [apiKey, baseUrl] = await Promise.all([
    getSupplierApiKey(),
    getSupplierApiBaseUrl(),
  ]);
  if (!apiKey) {
    const msg = "Supplier API key is not configured.";
    await writeLog({
      endpoint: opts.endpoint,
      method: opts.method,
      httpStatus: 0,
      ok: false,
      requestJson: JSON.stringify(opts.body ?? {}),
      responseJson: JSON.stringify({ error: msg }),
      errorCode: "not_configured",
      errorMessage: msg,
      meta: opts.meta,
    });
    return {
      ok: false,
      httpStatus: 0,
      errorCode: "not_configured",
      errorMessage: msg,
      raw: "",
    };
  }

  const url = `${baseUrl}/${opts.path.replace(/^\//, "")}`;
  const requestJson = JSON.stringify(
    opts.method === "POST" ? (opts.body ?? {}) : {},
  );

  let attempt = 0;
  while (attempt < 2) {
    attempt += 1;
    let httpStatus = 0;
    let raw = "";
    try {
      const res = await fetch(url, {
        method: opts.method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: opts.method === "POST" ? requestJson : undefined,
        cache: "no-store",
      });
      httpStatus = res.status;
      raw = await res.text();

      if (httpStatus === 429 && (opts.retry429 !== false) && attempt < 2) {
        await sleep(600);
        continue;
      }

      let parsed: unknown = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }

      const envelope = parsed as
        | { ok?: boolean; data?: T; error?: { code?: string; message?: string } }
        | null;

      if (res.ok && envelope && envelope.ok === true && envelope.data !== undefined) {
        await writeLog({
          endpoint: opts.endpoint,
          method: opts.method,
          httpStatus,
          ok: true,
          requestJson,
          responseJson: raw || JSON.stringify(envelope),
          meta: opts.meta,
        });
        return { ok: true, data: envelope.data, httpStatus };
      }

      const errBody = envelope as SupplierErrorBody | null;
      const errorCode =
        errBody?.error?.code ??
        (httpStatus === 401
          ? "invalid_token"
          : httpStatus === 402
            ? "insufficient_balance"
            : httpStatus === 404
              ? "product_not_found"
              : httpStatus === 429
                ? "rate_limit"
                : "supplier_error");
      const errorMessage =
        errBody?.error?.message ??
        (raw.slice(0, 400) || `Supplier HTTP ${httpStatus}`);

      await writeLog({
        endpoint: opts.endpoint,
        method: opts.method,
        httpStatus,
        ok: false,
        requestJson,
        responseJson: raw || JSON.stringify({ error: errorMessage }),
        errorCode,
        errorMessage,
        meta: opts.meta,
      });

      return {
        ok: false,
        httpStatus,
        errorCode,
        errorMessage,
        raw,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Supplier network error";
      await writeLog({
        endpoint: opts.endpoint,
        method: opts.method,
        httpStatus,
        ok: false,
        requestJson,
        responseJson: JSON.stringify({ error: errorMessage }),
        errorCode: "network_error",
        errorMessage,
        meta: opts.meta,
      });
      return {
        ok: false,
        httpStatus,
        errorCode: "network_error",
        errorMessage,
        raw,
      };
    }
  }

  return {
    ok: false,
    httpStatus: 429,
    errorCode: "rate_limit",
    errorMessage: "Rate limit exceeded",
    raw: "",
  };
}

export async function getSupplierBalance(meta?: SupplierCallMeta) {
  return supplierFetch<SupplierBalance>({
    endpoint: "balance",
    path: "balance.php",
    method: "GET",
    meta,
  });
}

export async function getSupplierCatalog(meta?: SupplierCallMeta) {
  const result = await supplierFetch<unknown>({
    endpoint: "catalog",
    path: "catalog.php",
    method: "GET",
    meta,
  });
  if (!result.ok) return result;
  return {
    ok: true as const,
    data: normalizeSupplierCatalog(result.data),
    httpStatus: result.httpStatus,
  };
}

export async function generateSupplierKeys(
  input: {
    productId: number;
    quantity: number;
    idempotencyKey: string;
    androidId?: string;
  },
  meta?: Omit<
    SupplierCallMeta,
    "productId" | "quantity" | "idempotencyKey"
  >,
) {
  const result = await supplierFetch<{
    delivered?: unknown;
    amount_charged?: unknown;
    new_balance?: unknown;
    keys?: unknown;
  }>({
    endpoint: "generate",
    path: "generate.php",
    method: "POST",
    body: {
      product_id: input.productId,
      quantity: input.quantity,
      idempotency_key: input.idempotencyKey,
      ...(input.androidId ? { android_id: input.androidId } : {}),
    },
    meta: {
      ...meta,
      productId: input.productId,
      quantity: input.quantity,
      idempotencyKey: input.idempotencyKey,
    },
  });
  if (!result.ok) return result;

  const data: SupplierGenerateResult = {
    delivered: asFiniteNumber(result.data.delivered) ?? 0,
    amount_charged:
      typeof result.data.amount_charged === "string"
        ? result.data.amount_charged
        : String(result.data.amount_charged ?? "0"),
    new_balance:
      typeof result.data.new_balance === "string"
        ? result.data.new_balance
        : String(result.data.new_balance ?? "0"),
    keys: normalizeSupplierKeyCodes(result.data.keys),
  };

  return { ok: true as const, data, httpStatus: result.httpStatus };
}

export async function getSupplierHistory(meta?: SupplierCallMeta) {
  return supplierFetch<SupplierHistoryItem[]>({
    endpoint: "history",
    path: "history.php",
    method: "GET",
    meta,
  });
}
