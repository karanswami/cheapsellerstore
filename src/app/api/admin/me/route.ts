import { jsonOk } from "@/lib/api";
import { isAdminAuthenticated } from "@/lib/auth/admin";

export async function GET() {
  return jsonOk({ authenticated: await isAdminAuthenticated() });
}
