import { jsonOk } from "@/lib/api";
import { isMaintenanceMode } from "@/lib/maintenance";
import {
  MAINTENANCE_COOKIE,
  maintenanceCookieOptions,
} from "@/lib/maintenance-cookie";
import { NextResponse } from "next/server";

/** Public status probe for the maintenance screen poll (+ syncs edge cookie). */
export async function GET() {
  const maintenance = await isMaintenanceMode();
  const res = NextResponse.json({ data: { maintenance } });
  res.cookies.set(
    MAINTENANCE_COOKIE,
    maintenance ? "1" : "",
    maintenanceCookieOptions(maintenance),
  );
  return res;
}
