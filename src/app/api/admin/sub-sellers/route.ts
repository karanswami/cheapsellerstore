import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { createReseller } from "@/lib/resellers";
import { getResellerCreateMinFundingUsd } from "@/lib/settings";
import { z } from "zod";

const schema = z.object({
  username: z.string().trim().min(3).max(32),
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(128),
  name: z.string().trim().max(80).optional(),
  initialUsd: z.number().min(0),
});

/** Admin creates a reseller attached to the admin (referredById = admin). */
export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin login required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid.", 400);
  }

  const minUsd = await getResellerCreateMinFundingUsd();
  if (parsed.data.initialUsd < minUsd) {
    return jsonError(
      "MIN_BALANCE",
      `Initial funding must be at least $${minUsd}.`,
      400,
    );
  }

  try {
    const user = await createReseller({
      creatorId: admin.id,
      adminFunded: true,
      username: parsed.data.username,
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      initialUsd: parsed.data.initialUsd,
    });
    return jsonOk({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    const messages: Record<string, string> = {
      USERNAME_OR_EMAIL_TAKEN: "Username or email already taken.",
      INVALID_USERNAME: "Username must be 3–32 chars (a-z, 0-9, _).",
      INVALID_EMAIL: "Invalid email.",
      WEAK_PASSWORD: "Password must be at least 6 characters.",
      MIN_BALANCE: `Initial funding must be at least $${minUsd}.`,
      INSUFFICIENT_BALANCE: "Insufficient balance.",
    };
    return jsonError(code, messages[code] ?? "Failed to create reseller.", 400);
  }
}
