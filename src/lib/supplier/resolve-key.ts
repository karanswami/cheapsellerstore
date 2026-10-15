import { claimKey } from "@/lib/keys";
import { prisma } from "@/lib/prisma";
import { KeyStatus } from "@prisma/client";
import { isSupplierEligible } from "@/lib/supplier/config";
import {
  generateSupplierKeys,
  markSupplierLogFallback,
} from "@/lib/supplier/client";

import {
  getSupplierStockInfoMap,
  setCachedSupplierBalance,
} from "@/lib/supplier/catalog-cache";

export type ResolveKeyInput = {
  durationId: string;
  supplierProductId?: number | null;
  orderId: string;
  idempotencyKey: string;
  userId?: string | null;
  androidId?: string;
};

/**
 * Hybrid key resolve: supplier generate (when enabled + mapped) → local AVAILABLE.
 * Returns a Key row already marked SOLD and linked to orderId, or null.
 */
export async function resolveKeyForDuration(input: ResolveKeyInput) {
  const supplierProductId = input.supplierProductId ?? null;
  const eligible = await isSupplierEligible(supplierProductId);

  if (eligible && supplierProductId != null) {
    const stockInfoMap = await getSupplierStockInfoMap();
    const supplierInfo = stockInfoMap.get(supplierProductId);

    // If item is known to be out of stock on supplier (or supplier balance is insufficient), fall back to local keys directly
    if (supplierInfo && !supplierInfo.inStock) {
      return claimKey(input.durationId, input.orderId);
    }
    const gen = await generateSupplierKeys(
      {
        productId: supplierProductId,
        quantity: 1,
        idempotencyKey: input.idempotencyKey,
        androidId: input.androidId,
      },
      {
        orderId: input.orderId,
        durationId: input.durationId,
        userId: input.userId ?? null,
      },
    );

    if (gen.ok) {
      if (gen.data.new_balance) {
        void setCachedSupplierBalance({ balance: gen.data.new_balance, currency: "USD" }).catch(() => undefined);
      }
      // keys already normalized to full_value (see normalizeSupplierKeyCodes)
      const code = (gen.data.keys ?? []).find((k) => k.trim())?.trim();
      if (code) {
        try {
          const key = await prisma.key.create({
            data: {
              code,
              status: KeyStatus.SOLD,
              soldAt: new Date(),
              orderId: input.orderId,
              durationId: input.durationId,
            },
          });
          return key;
        } catch {
          // Unique collision or DB error — fall through to local inventory
        }
      }
    } else if (gen.errorCode === "insufficient_balance" || gen.httpStatus === 402) {
      void setCachedSupplierBalance({ balance: "0.00", currency: "USD" }).catch(() => undefined);
    }

    await markSupplierLogFallback({
      orderId: input.orderId,
      durationId: input.durationId,
      idempotencyKey: input.idempotencyKey,
    });
  }

  return claimKey(input.durationId, input.orderId);
}
