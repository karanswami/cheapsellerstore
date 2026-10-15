import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { cancelDeposit } from "@/lib/deposits";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);

  const { id } = await params;
  const result = await cancelDeposit(id, user.id);
  if (!result.ok) return jsonError(result.code, result.message, 400);

  return jsonOk({ deposit: result.deposit });
}
