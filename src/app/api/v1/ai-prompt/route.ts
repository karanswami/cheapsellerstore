import {
  AI_PROMPT_PACKS,
  buildAiPromptPack,
  type AiPromptPack,
} from "@/lib/seller-api/docs-catalog";
import {
  getApiDefaultRateLimitRpm,
  getApiPublicRateLimitRpm,
} from "@/lib/seller-api/settings";
import { NextResponse, type NextRequest } from "next/server";

function appBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return req.nextUrl.origin;
}

function isPack(value: string): value is AiPromptPack {
  return AI_PROMPT_PACKS.some((p) => p.id === value);
}

export async function GET(req: NextRequest) {
  const packParam = req.nextUrl.searchParams.get("pack") ?? "full";
  const langParam = req.nextUrl.searchParams.get("lang");
  const packRaw = langParam || packParam;
  if (!isPack(packRaw)) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message:
            "Unknown pack. Use pack=full|wire|python|node|php|go (or lang=).",
        },
      },
      { status: 404 },
    );
  }

  const [publicRpm, privateRpm] = await Promise.all([
    getApiPublicRateLimitRpm(),
    getApiDefaultRateLimitRpm(),
  ]);

  const apiKey = req.nextUrl.searchParams.get("key") ?? undefined;
  const body = buildAiPromptPack(packRaw, {
    baseUrl: appBaseUrl(req),
    publicRpm,
    privateRpm,
    apiKey: apiKey || undefined,
  });

  const filename = `drip-ai-prompt-${packRaw}.md`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=60",
    },
  });
}
