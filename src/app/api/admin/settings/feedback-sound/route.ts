import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  feedbackSoundUploadLimits,
  saveFeedbackSoundUpload,
} from "@/lib/public-uploads";

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
    return jsonError("VALIDATION", "Choose an audio file to upload.", 400);
  }

  const { allowed, maxBytes } = feedbackSoundUploadLimits();
  if (!allowed.includes(file.type)) {
    return jsonError(
      "VALIDATION",
      "Use an MP3, WAV, OGG, WebM, M4A, or AAC audio file.",
      400,
    );
  }
  if (file.size > maxBytes) {
    return jsonError("VALIDATION", "Audio must be 1 MB or smaller.", 400);
  }

  try {
    const saved = await saveFeedbackSoundUpload(file);
    return jsonOk({ upload: saved });
  } catch (err) {
    console.error("[feedback-sound upload]", err);
    return jsonError(
      "UPLOAD_FAILED",
      err instanceof Error ? err.message : "Could not save audio.",
      500,
    );
  }
}
