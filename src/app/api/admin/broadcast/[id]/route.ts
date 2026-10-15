import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { setBroadcastActive } from "@/lib/broadcasts";
import { z } from "zod";

const schema = z.object({
  active: z.boolean(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid payload.", 400);

  const result = await setBroadcastActive(id, parsed.data.active);
  if (!result.ok) return jsonError(result.code, result.message, 404);
  return jsonOk({ broadcast: result.broadcast });
}
