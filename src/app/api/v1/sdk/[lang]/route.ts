import {
  buildSdkFile,
  isSdkLang,
} from "@/lib/seller-api/sdk-packs";
import { NextResponse, type NextRequest } from "next/server";

type Ctx = { params: Promise<{ lang: string }> };

function appBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { lang } = await ctx.params;
  if (!isSdkLang(lang)) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Unknown SDK language. Use python|node|php|go|curl.",
        },
      },
      { status: 404 },
    );
  }

  const file = buildSdkFile(lang, appBaseUrl(req));
  return new NextResponse(file.body, {
    status: 200,
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
