import {
  ANDROID_APK_FILENAME,
  ANDROID_APK_VERSION,
  ANDROID_APK_VERSIONED_FILENAME,
} from "@/lib/android-apk";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  ANDROID_APK_FILENAME,
  ANDROID_APK_VERSIONED_FILENAME,
  "app-latest.apk",
]);

type Params = { params: Promise<{ file: string }> };

/**
 * Serve the store-named release APK from /releases (not public/).
 * Files in public/downloads were static-served by Next and Cloudflare-cached for hours,
 * so icon/splash updates never reached phones.
 */
export async function GET(_request: Request, { params }: Params) {
  const { file } = await params;
  if (!ALLOWED.has(file)) {
    return new Response("Not found", { status: 404 });
  }

  const apkPath = path.join(process.cwd(), "releases", ANDROID_APK_FILENAME);

  let buffer: Buffer;
  try {
    buffer = await readFile(apkPath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const downloadName =
    file === ANDROID_APK_VERSIONED_FILENAME
      ? ANDROID_APK_VERSIONED_FILENAME
      : ANDROID_APK_FILENAME;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      "CDN-Cache-Control": "no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-APK-Version": ANDROID_APK_VERSION,
    },
  });
}
