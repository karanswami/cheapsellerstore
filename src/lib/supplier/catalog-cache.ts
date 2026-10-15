import { getSettingText, upsertSetting, SETTING_KEYS } from "@/lib/settings";
import {
  normalizeSupplierCatalog,
  type SupplierCatalogItem,
} from "@/lib/supplier/client";

type CachePayload = {
  items: SupplierCatalogItem[];
  fetchedAt: string;
};

export type SupplierBalanceCachePayload = {
  balance: number;
  rawBalance: string;
  currency: string;
  fetchedAt: string;
};

export const SUPPLIER_CATALOG_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const SUPPLIER_BALANCE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let memoryCache: CachePayload | null = null;
let inFlightFetch: Promise<CachePayload | null> | null = null;

let memoryBalanceCache: SupplierBalanceCachePayload | null = null;
let inFlightBalanceFetch: Promise<SupplierBalanceCachePayload | null> | null = null;

export type SupplierStockInfo = {
  inStock: boolean;
  stockCount: number | null;
  insufficientBalance?: boolean;
};

/**
 * Fetch fresh balance from supplier API and update memory + AppSetting cache.
 */
export async function refreshSupplierBalanceCache(): Promise<SupplierBalanceCachePayload | null> {
  if (inFlightBalanceFetch) return inFlightBalanceFetch;

  inFlightBalanceFetch = (async () => {
    try {
      const { isSupplierApiEnabled, isSupplierConfigured } = await import(
        "@/lib/supplier/config"
      );
      const [configured, enabled] = await Promise.all([
        isSupplierConfigured(),
        isSupplierApiEnabled(),
      ]);
      if (!configured || !enabled) return memoryBalanceCache;

      const { getSupplierBalance } = await import("@/lib/supplier/client");
      const result = await getSupplierBalance();
      if (result.ok && result.data) {
        return await setCachedSupplierBalance(result.data);
      }
      return memoryBalanceCache;
    } catch {
      return memoryBalanceCache;
    } finally {
      inFlightBalanceFetch = null;
    }
  })();

  return inFlightBalanceFetch;
}

export async function getCachedSupplierBalance(opts?: {
  forceFresh?: boolean;
}): Promise<SupplierBalanceCachePayload | null> {
  let cache = memoryBalanceCache;
  if (!cache) {
    const raw = (
      await getSettingText(SETTING_KEYS.supplierBalanceCache, "")
    ).trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SupplierBalanceCachePayload;
        if (parsed && typeof parsed.balance === "number" && parsed.fetchedAt) {
          cache = parsed;
          memoryBalanceCache = cache;
        }
      } catch {
        // ignore parse error
      }
    }
  }

  const isStale =
    !cache ||
    Date.now() - new Date(cache.fetchedAt).getTime() >
      SUPPLIER_BALANCE_CACHE_TTL_MS;

  if ((isStale || opts?.forceFresh) && !inFlightBalanceFetch) {
    if (!cache) {
      const fresh = await refreshSupplierBalanceCache();
      if (fresh) return fresh;
    } else {
      void refreshSupplierBalanceCache().catch(() => undefined);
    }
  }

  return cache;
}

export async function setCachedSupplierBalance(balance: {
  balance: string | number;
  currency?: string;
}): Promise<SupplierBalanceCachePayload> {
  const num =
    typeof balance.balance === "number"
      ? balance.balance
      : Number.parseFloat(String(balance.balance).trim()) || 0;
  const payload: SupplierBalanceCachePayload = {
    balance: Number.isFinite(num) ? num : 0,
    rawBalance: String(balance.balance ?? "0"),
    currency: balance.currency ?? "USD",
    fetchedAt: new Date().toISOString(),
  };
  memoryBalanceCache = payload;
  await upsertSetting({
    key: SETTING_KEYS.supplierBalanceCache,
    textValue: JSON.stringify(payload),
  });
  return payload;
}

/**
 * Fetch fresh catalog from supplier API and update memory + AppSetting cache.
 * Deduplicates in-flight calls so multiple parallel callers share one HTTP request.
 */
export async function refreshSupplierCatalogCache(): Promise<CachePayload | null> {
  if (inFlightFetch) return inFlightFetch;

  inFlightFetch = (async () => {
    try {
      const { isSupplierApiEnabled, isSupplierConfigured } = await import(
        "@/lib/supplier/config"
      );
      const [configured, enabled] = await Promise.all([
        isSupplierConfigured(),
        isSupplierApiEnabled(),
      ]);
      if (!configured || !enabled) return memoryCache;

      // Concurrently refresh balance as well
      void refreshSupplierBalanceCache().catch(() => undefined);

      const { getSupplierCatalog } = await import("@/lib/supplier/client");
      const result = await getSupplierCatalog();
      if (result.ok && Array.isArray(result.data)) {
        return await setCachedSupplierCatalog(result.data);
      }
      return memoryCache;
    } catch {
      return memoryCache;
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}

export async function getCachedSupplierCatalog(opts?: {
  forceFresh?: boolean;
}): Promise<CachePayload | null> {
  let cache = memoryCache;
  if (!cache) {
    const raw = (await getSettingText(SETTING_KEYS.supplierCatalogCache, "")).trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          items?: unknown;
          fetchedAt?: string;
          products?: unknown;
          groups?: unknown;
        };
        if (parsed) {
          const items = normalizeSupplierCatalog(
            Array.isArray(parsed.items) && parsed.items.length > 0
              ? parsed.items
              : parsed,
          );
          if (items.length > 0 || parsed.fetchedAt) {
            cache = {
              items,
              fetchedAt: parsed.fetchedAt ?? new Date(0).toISOString(),
            };
            memoryCache = cache;
          }
        }
      } catch {
        // ignore parse error
      }
    }
  }

  const isStale =
    !cache ||
    Date.now() - new Date(cache.fetchedAt).getTime() >
      SUPPLIER_CATALOG_CACHE_TTL_MS;

  if ((isStale || opts?.forceFresh) && !inFlightFetch) {
    if (!cache) {
      const fresh = await refreshSupplierCatalogCache();
      if (fresh) return fresh;
    } else {
      void refreshSupplierCatalogCache().catch(() => undefined);
    }
  }

  return cache;
}

export async function setCachedSupplierCatalog(
  items: SupplierCatalogItem[],
): Promise<CachePayload> {
  const payload: CachePayload = {
    items,
    fetchedAt: new Date().toISOString(),
  };
  memoryCache = payload;
  await upsertSetting({
    key: SETTING_KEYS.supplierCatalogCache,
    textValue: JSON.stringify(payload),
  });
  return payload;
}

/** Map of supplier product id → detailed stock info (inStock + optional stockCount). */
export async function getSupplierStockInfoMap(): Promise<
  Map<number, SupplierStockInfo>
> {
  const [cache, balanceCache] = await Promise.all([
    getCachedSupplierCatalog(),
    getCachedSupplierBalance(),
  ]);
  const map = new Map<number, SupplierStockInfo>();
  if (!cache) return map;

  const currentBalance = balanceCache?.balance ?? null;

  for (const item of cache.items) {
    const itemPrice = Number.parseFloat(item.price) || 0;
    // When balance is known, if balance is 0 or less than item price, user cannot buy from supplier -> out of stock
    const hasEnoughBalance =
      currentBalance !== null ? currentBalance > 0 && currentBalance >= itemPrice : true;

    const inStock = item.in_stock !== false && hasEnoughBalance;
    const stockCount =
      !hasEnoughBalance
        ? 0
        : typeof item.stock_count === "number" &&
          Number.isFinite(item.stock_count)
        ? item.stock_count
        : null;

    map.set(item.id, {
      inStock,
      stockCount,
      insufficientBalance: !hasEnoughBalance,
    });
  }
  return map;
}

/** Map of supplier product id → in_stock from cache (missing → unknown). */
export async function getSupplierInStockMap(): Promise<Map<number, boolean>> {
  const stockInfo = await getSupplierStockInfoMap();
  const map = new Map<number, boolean>();
  for (const [id, info] of stockInfo) {
    map.set(id, info.inStock);
  }
  return map;
}
