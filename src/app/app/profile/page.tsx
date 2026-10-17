import { headers } from "next/headers";
import { KeyRound, LogIn, MonitorSmartphone, ShieldAlert, Smartphone, Tablet, type LucideIcon } from "lucide-react";
import { IconTile, SectionHeader, Surface, type Tone } from "@/components/app-kit";
import { getRecentSecurityEvents, type SecurityEvent } from "@/lib/account-security";
import { getCurrentUser } from "@/lib/auth/customer";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { getUserActivitySummary } from "@/lib/history";
import { cn } from "@/lib/utils";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = (await getCurrentUser())!;
  const h = await headers();
  const client = {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null,
    userAgent: h.get("user-agent")?.trim() || null,
  };
  const [summary, events, googleEnabled] = await Promise.all([
    getUserActivitySummary(user.id),
    getRecentSecurityEvents(user.id, client),
    isGoogleAuthConfigured().catch(() => false),
  ]);

  return (
    <ProfileClient
      user={user}
      stats={{ orders: summary.orders, spent: summary.spent }}
      googleEnabled={googleEnabled}
      activity={<SecurityActivity events={events} />}
    />
  );
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const DEVICE_ICON: Record<SecurityEvent["device"], LucideIcon> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: MonitorSmartphone,
  app: Smartphone,
};

function describe(e: SecurityEvent): { title: string; icon: LucideIcon; tone: Tone; alert?: boolean } {
  switch (e.action) {
    case "LOGIN_FAILED":
      return { title: "Failed sign-in attempt", icon: ShieldAlert, tone: "rose", alert: true };
    case "PASSWORD_CHANGE":
      return { title: "Password changed", icon: KeyRound, tone: "amber" };
    case "PASSWORD_RESET":
      return { title: "Password reset by email", icon: KeyRound, tone: "amber" };
    default: {
      const how = e.method === "google" ? " with Google" : "";
      return { title: `Signed in${how}`, icon: e.current ? LogIn : DEVICE_ICON[e.device], tone: e.current ? "emerald" : "sky" };
    }
  }
}

/** Server-rendered (relative times): sign-ins and security changes from the last 7 days. */
function SecurityActivity({ events }: { events: SecurityEvent[] }) {
  return (
    <section aria-label="Recent activity">
      <SectionHeader title="Recent activity" icon={LogIn} />
      <Surface className="p-1.5">
        {events.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No sign-ins in the last 7 days.</p>
        ) : (
          <ul>
            {events.map((e) => {
              const d = describe(e);
              return (
                <li key={e.id} className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5">
                  <IconTile icon={d.icon} tone={d.tone} className="size-10 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("flex items-center gap-2 text-sm font-semibold", d.alert && "text-rose-300")}>
                      <span className="truncate">{d.title}</span>
                      {e.current ? (
                        <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                          This device
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.client}
                      {e.ip ? ` · ${e.ip}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(e.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t border-white/[0.06] px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
          Activity is kept for 7 days. Something you don&apos;t recognise? Change your password right away.
        </p>
      </Surface>
    </section>
  );
}
