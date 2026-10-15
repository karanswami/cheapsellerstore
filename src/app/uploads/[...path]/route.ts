import { readPublicUpload } from "@/lib/public-uploads";

export const runtime = "nodejs";

type Params = { params: Promise<{ path: string[] }> };

/**
 * Serve runtime uploads under `/uploads/*`.
 * `next start` only exposes `public/` files that existed at boot; files written
 * after start (product/banner/site/icon/deposit/support/sound files) would 404
 * without this route.
 */
export async function GET(_request: Request, { params }: Params) {
  const { path: segments } = await params;
  const file = await readPublicUpload(segments ?? []);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
