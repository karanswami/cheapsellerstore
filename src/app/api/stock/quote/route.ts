import { jsonError, jsonOk } from "@/lib/api";
import { releaseOrphanedSoldKeys } from "@/lib/keys";
import { getEffectiveStockByDuration } from "@/lib/supplier/stock";
import { z } from "zod";

const schema = z.object({
  durationIds: z.array(z.string().min(1)).min(1).max(50),
});

let lastOrphanRepairAt = 0;
const ORPHAN_REPAIR_TTL_MS = 5 * 60 * 1000;

/** Live sellable stock (local AVAILABLE + supplier-eligible virtual) for cart / product durations. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid duration ids.", 400);
  }

  // Periodic repair for stock leaked by older failed checkouts.
  const now = Date.now();
  if (now - lastOrphanRepairAt > ORPHAN_REPAIR_TTL_MS) {
    lastOrphanRepairAt = now;
    await releaseOrphanedSoldKeys().catch(() => undefined);
  }

  const ids = [...new Set(parsed.data.durationIds)];
  const counts = await getEffectiveStockByDuration(ids);
  const lines = ids.map((durationId) => ({
    durationId,
    available: counts.get(durationId) ?? 0,
  }));

  return jsonOk({ lines });
}
