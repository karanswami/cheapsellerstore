import "server-only";

import { prisma } from "@/lib/prisma";

/** First product number is 1, first duration (SKU) number is 500. */
const BASE = { product: 0, duration: 499 } as const;

/**
 * Atomically claims the next catalog number. Counters only move forward,
 * so a number is never handed out twice, even after a delete.
 */
export async function nextCatalogNumber(kind: keyof typeof BASE): Promise<number> {
  const res = (await prisma.$runCommandRaw({
    findAndModify: "Counter",
    query: { _id: kind },
    update: [{ $set: { seq: { $add: [{ $ifNull: ["$seq", BASE[kind]] }, 1] } } }],
    upsert: true,
    new: true,
  })) as { value?: { seq?: number } };
  const seq = res.value?.seq;
  if (typeof seq !== "number") throw new Error("COUNTER_FAILED");
  return seq;
}
