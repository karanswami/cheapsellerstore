import { AppShell } from "@/components/app/app-shell";
import {
  clearCustomerSessionCookie,
  getCurrentUser,
  getSessionUserId,
} from "@/lib/auth/customer";
import { isGiftCodesEnabled } from "@/lib/pages-enabled";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    const userId = await getSessionUserId();
    if (userId) {
      const raw = await prisma.user.findUnique({
        where: { id: userId },
        select: { banned: true },
      });
      if (raw?.banned) {
        await clearCustomerSessionCookie();
        redirect("/banned");
      }
    }
    // Drop orphan/invalid JWT so /?auth=login → / → /app cannot loop.
    await clearCustomerSessionCookie();
    redirect("/?auth=login&next=/app");
  }

  const giftCodesEnabled = await isGiftCodesEnabled();

  return (
    <AppShell
      user={user}
      giftCodesEnabled={giftCodesEnabled}
    >
      {children}
    </AppShell>
  );
}
