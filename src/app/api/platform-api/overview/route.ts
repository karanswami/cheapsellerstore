import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { getPlatformApiHubSnapshot } from "@/lib/seller-api/keys";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);

  const { overview } = await getPlatformApiHubSnapshot(user);
  return jsonOk(overview);
}
