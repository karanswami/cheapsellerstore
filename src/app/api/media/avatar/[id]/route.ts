import { getSessionUserId } from "@/lib/auth/customer";
import { parseAvatarMediaId, readEncryptedAvatar } from "@/lib/uploads";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: raw } = await params;
  const parsed = parseAvatarMediaId(raw);
  if (!parsed) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { buffer, mime } = await readEncryptedAvatar(parsed.id, parsed.ext);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[avatar media]", err);
    return new Response("Not found", { status: 404 });
  }
}
