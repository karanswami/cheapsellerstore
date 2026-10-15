import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

/**
 * Recreate the client when HMR kept a pre-schema instance
 * (e.g. before ProductReview / SupportRoute existed).
 */
function getPrismaClient() {
  const existing = globalForPrisma.prisma;
  const ok =
    existing != null &&
    typeof (existing as { productReview?: { findMany?: unknown } })
      .productReview?.findMany === "function" &&
    typeof (existing as { supportRoute?: { findMany?: unknown } }).supportRoute
      ?.findMany === "function" &&
    typeof (existing as { supportTicket?: { findMany?: unknown } })
      .supportTicket?.findMany === "function";

  if (ok) return existing!;

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
