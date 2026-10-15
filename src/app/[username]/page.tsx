import { PublicProfileView } from "@/components/app/public-profile-view";
import { getSessionUserId } from "@/lib/auth/customer";
import {
  isReservedProfileUsername,
  normalizeProfileUsername,
} from "@/lib/profile";
import { getPublicProfileByUsername } from "@/lib/public-profile";
import { notFound } from "next/navigation";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username: raw } = await params;
  const username = normalizeProfileUsername(raw);

  if (!username || isReservedProfileUsername(username)) {
    notFound();
  }
  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    notFound();
  }

  const currentUserId = await getSessionUserId();
  const profile = await getPublicProfileByUsername(username, currentUserId);

  if (!profile) {
    notFound();
  }

  return (
    <PublicProfileView
      user={profile.user}
      orderCount={profile.orderCount}
      totalSpent={profile.totalSpent}
      averageRating={profile.averageRating}
      featuredProducts={profile.featuredProducts}
      isOwner={profile.isOwner}
      isPrivate={profile.isPrivate}
      referralCode={profile.referralCode}
      isAuthenticated={Boolean(currentUserId)}
    />
  );
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { username: raw } = await params;
  const username = normalizeProfileUsername(raw);

  if (
    !username ||
    isReservedProfileUsername(username) ||
    !/^[a-z0-9_]{3,32}$/.test(username)
  ) {
    return { title: "User Not Found" };
  }

  const profile = await getPublicProfileByUsername(username, null);

  if (!profile || profile.isPrivate) {
    return {
      title: `@${username}`,
      description: "Personal Creator Hub & Digital Storefront",
    };
  }

  const { user } = profile;
  const displayName = user.name.trim() || user.username;
  const headline = user.bioTagline?.trim() || user.bio?.trim() || "Official Creator Hub & Instant Digital Storefront";
  const title = user.bioTagline?.trim()
    ? `${displayName} | ${user.bioTagline.trim()}`
    : `${displayName} (@${user.username})`;

  return {
    title,
    description: headline,
    openGraph: {
      title: `${displayName} (@${user.username})`,
      description: headline,
      images: user.avatarUrl || user.bioBannerUrl ? [user.avatarUrl || user.bioBannerUrl!] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} (@${user.username})`,
      description: headline,
      images: user.bioBannerUrl ? [user.bioBannerUrl] : user.avatarUrl ? [user.avatarUrl] : undefined,
    },
  };
}

