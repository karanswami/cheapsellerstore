import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { saveSiteUpload, siteUploadLimits } from "@/lib/public-uploads";

export const runtime = "nodejs";

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "type" in value &&
    typeof (value as File).arrayBuffer === "function" &&
    Number((value as File).size) > 0
  );
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("INVALID_FORM", "Invalid upload payload.", 400);
  }

  const file = form.get("file");
  if (!isUploadFile(file)) {
    return jsonError("VALIDATION", "Choose an image to upload.", 400);
  }

  const { allowed, maxBytes } = siteUploadLimits();
  if (!allowed.includes(file.type)) {
    return jsonError(
      "VALIDATION",
      "Use a JPG, PNG, WebP, or ICO image.",
      400,
    );
  }
  if (file.size > maxBytes) {
    return jsonError("VALIDATION", "Image must be 4 MB or smaller.", 400);
  }

  try {
    const saved = await saveSiteUpload(file);
    return jsonOk({ upload: saved });
  } catch (err) {
    console.error("[site-config upload]", err);
    return jsonError(
      "UPLOAD_FAILED",
      err instanceof Error ? err.message : "Could not save image.",
      500,
    );
  }
}
