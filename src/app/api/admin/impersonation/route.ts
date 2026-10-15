import { jsonError, jsonOk } from "@/lib/api";
import { exitImpersonation, getImpersonationState } from "@/lib/auth/impersonation";

export async function GET() {
  const state = await getImpersonationState();
  if (!state) return jsonOk({ impersonating: false as const });
  return jsonOk({
    impersonating: true as const,
    targetUsername: state.targetUsername,
    targetId: state.targetId,
  });
}

export async function POST() {
  const state = await getImpersonationState();
  if (!state) {
    return jsonError("NOT_IMPERSONATING", "Not impersonating.", 400);
  }
  await exitImpersonation();
  return jsonOk({ ok: true });
}
