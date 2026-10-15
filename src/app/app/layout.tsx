import { AppShell } from "@/components/app/app-shell";
import { ConsoleQuickStats } from "@/components/layout/console-profile";
import {
  clearCustomerSessionCookie,
  getCurrentUser,
  getSessionUserId,
} from "@/lib/auth/customer";
import { isGiftCodesEnabled } from "@/lib/pages-enabled";
import { prisma } from "@/lib/prisma";
import { getCustomerSidebarStats } from "@/lib/sidebar-stats";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function SidebarStats({ userId }: { userId: string }) {
  const stats = await getCustomerSidebarStats(userId);
  return (
    <ConsoleQuickStats
      orders={stats.orders}
      keys={stats.keys}
      deposits={stats.deposits}
    />
  );
}

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
      statsSlot={
        <Suspense
          fallback={<ConsoleQuickStats orders={0} keys={0} deposits={0} />}
        >
          <SidebarStats userId={user.id} />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
