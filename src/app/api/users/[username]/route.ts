import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserId } from "@/lib/auth/customer";
import { getPublicProfileByUsername } from "@/lib/public-profile";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const currentUserId = await getSessionUserId();

  try {
    const profile = await getPublicProfileByUsername(username, currentUserId);
    if (!profile) {
      return jsonError("USER_NOT_FOUND", "User not found.", 404);
    }
    return jsonOk(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return jsonError("INTERNAL_ERROR", "Could not fetch user profile.", 500);
  }
}
