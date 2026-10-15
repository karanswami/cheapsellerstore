import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { attachProof } from "@/lib/deposits";
import { z } from "zod";

const schema = z.object({
  proofImage: z.string().trim().min(1).max(500),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "proofImage is required.", 400);
  }

  const result = await attachProof(id, user.id, parsed.data.proofImage);
  if (!result.ok) return jsonError(result.code, result.message, 400);

  return jsonOk({ deposit: result.deposit });
}
