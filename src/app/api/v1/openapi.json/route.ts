import { buildOpenApiDocument } from "@/lib/seller-api/openapi";
import { NextResponse, type NextRequest } from "next/server";

function appBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const doc = buildOpenApiDocument(appBaseUrl(req));
  return NextResponse.json(doc, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Disposition": 'attachment; filename="drip-platform-api.openapi.json"',
    },
  });
}
