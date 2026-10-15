import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid JSON payload.", 400);
  }

  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid payload.", 400);
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: parsed.data.endpoint },
    });
    return jsonOk({ success: true });
  } catch {
    return jsonOk({ success: true });
  }
}
