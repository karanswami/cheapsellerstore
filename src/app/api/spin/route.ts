import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { SpinError, getSpinState, performSpin } from "@/lib/spin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);
  return jsonOk(await getSpinState(user.id));
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);
  try {
    return jsonOk(await performSpin(user.id));
  } catch (e) {
    if (e instanceof SpinError) return jsonError(e.code, e.message, e.code === "NO_SPINS" ? 409 : 400);
    return jsonError("FAILED", "Spin failed. Please try again.", 500);
  }
}
