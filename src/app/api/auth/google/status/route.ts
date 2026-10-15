import { jsonOk } from "@/lib/api";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { isMaintenanceMode } from "@/lib/maintenance";

/** Public flag so the login dialog can show/hide the Google button. */
export async function GET() {
  if (await isMaintenanceMode()) {
    return jsonOk({ enabled: false });
  }
  return jsonOk({ enabled: await isGoogleAuthConfigured() });
}
