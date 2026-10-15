import {
  buildPublicProfilePath,
  normalizeProfileUsername,
} from "@/lib/profile";
import { redirect } from "next/navigation";

type LegacyPublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

/** Legacy `/app/users/[username]` → public `/{username}`. */
export default async function LegacyPublicProfileRedirect({
  params,
}: LegacyPublicProfilePageProps) {
  const { username } = await params;
  redirect(buildPublicProfilePath(normalizeProfileUsername(username)));
}
