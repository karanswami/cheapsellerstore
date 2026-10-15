import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserId, toSafeUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { avatarUploadLimits, saveAvatarUpload } from "@/lib/uploads";

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
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to upload a photo.", 401);
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

  const { allowed, maxBytes } = avatarUploadLimits();
  if (!allowed.includes(file.type)) {
    return jsonError(
      "VALIDATION",
      "Use a JPG, PNG, WebP, or GIF image.",
      400,
    );
  }
  if (file.size > maxBytes) {
    return jsonError("VALIDATION", "Image must be 2 MB or smaller.", 400);
  }

  try {
    const saved = await saveAvatarUpload(file);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: saved.url },
    });
    return jsonOk({ url: saved.url, user: toSafeUser(user) });
  } catch (err) {
    console.error("[avatar upload]", err);
    return jsonError(
      "UPLOAD_FAILED",
      err instanceof Error ? err.message : "Could not save photo.",
      500,
    );
  }
}
