"use client";

import {
  AuthDialog,
  type AuthMode,
} from "@/components/auth/auth-dialog";
import { formatMoney } from "@/lib/currencies";
import {
  DEFAULT_PAGES_ENABLED,
  type PagesEnabledConfig,
} from "@/lib/pages-enabled-shared";
import { normalizeReferralCode } from "@/lib/referral-utils";
import { homePathForRole } from "@/lib/roles";
import type { CustomerSidebarBadges } from "@/lib/sidebar-stats";
import type { SafeUser } from "@/types/user";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

/** Live wallet / session fields while logged in. */
const LIVE_SYNC_MS = 5_000;

export const DEFAULT_CUSTOMER_SIDEBAR_BADGES: CustomerSidebarBadges = {
  pendingDeposits: 0,
  activeReports: 0,
  unreadNotifications: 0,
};

type AuthContextValue = {
  user: SafeUser | null;
  loading: boolean;
  /** Store page kill-switches (gift codes default off). */
  pagesEnabled: PagesEnabledConfig;
  sidebarBadges: CustomerSidebarBadges;
  refresh: () => Promise<void>;
  setUser: (user: SafeUser | null) => void;
  logout: () => Promise<void>;
  openAuth: (mode?: AuthMode, next?: string) => void;
  closeAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isSafeNextPath(path: string | null): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagesEnabled, setPagesEnabled] = useState<PagesEnabledConfig>(
    DEFAULT_PAGES_ENABLED,
  );
  const [sidebarBadges, setSidebarBadges] = useState<CustomerSidebarBadges>(
    DEFAULT_CUSTOMER_SIDEBAR_BADGES,
  );
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState("");
  const prevBalanceRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const loggingOutRef = useRef(false);
  /** True only after /api/auth/me returned a user at least once this tab. */
  const serverSyncedRef = useRef(false);
  /** Bumped to drop stale in-flight /me responses (e.g. null racing after login). */
  const syncEpochRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const applyUser = useCallback(
    (
      next: SafeUser | null,
      meta?: { reason?: "banned" | "maintenance" },
    ) => {
    if (!next) {
      setSidebarBadges(DEFAULT_CUSTOMER_SIDEBAR_BADGES);
      if (loggingOutRef.current) {
        serverSyncedRef.current = false;
        prevBalanceRef.current = null;
        setUser(null);
        return;
      }
      // Ignore guest nulls and nulls that race in before the first successful /me
      // (classic: mount /me returns null right after login setUser).
      if (!serverSyncedRef.current) {
        return;
      }
      serverSyncedRef.current = false;
      prevBalanceRef.current = null;
      setUser(null);

      if (meta?.reason === "banned") {
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/banned")
        ) {
          router.replace("/banned");
        }
        return;
      }

      // Maintenance force-logout — stay on landing; do not treat as session-expired.
      if (meta?.reason === "maintenance") {
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/" &&
          !window.location.pathname.startsWith("/maintenance")
        ) {
          router.replace("/");
        }
        return;
      }

      // Prior synced session ended (JWT expired / cleared) — dedicated screen.
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/session-expired") &&
        !window.location.pathname.startsWith("/banned")
      ) {
        router.replace("/session-expired");
      }
      return;
    }

    if (next.banned) {
      serverSyncedRef.current = false;
      prevBalanceRef.current = null;
      setUser(null);
      void fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/banned")
      ) {
        router.replace("/banned");
      }
      return;
    }

    const prevBal = prevBalanceRef.current;
    if (prevBal !== null && next.walletBalance > prevBal) {
      toast.success("Balance updated", {
        description: formatMoney(next.walletBalance),
        id: "wallet-live",
      });
    }
    prevBalanceRef.current = next.walletBalance;
    serverSyncedRef.current = true;
    setUser(next);
  },
  [router],
);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const epoch = syncEpochRef.current;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const kill = window.setTimeout(() => ac.abort(), 20_000);
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        signal: ac.signal,
        cache: "no-store",
      });
      if (epoch !== syncEpochRef.current) return;
      // Transient 5xx / compile spikes — keep the existing client session.
      if (!res.ok) return;
      let json: {
        data?: {
          user: SafeUser | null;
          reason?: "banned" | "maintenance";
          pagesEnabled?: PagesEnabledConfig;
          sidebarBadges?: CustomerSidebarBadges;
        };
      };
      try {
        json = (await res.json()) as {
          data?: {
            user: SafeUser | null;
            reason?: "banned" | "maintenance";
            pagesEnabled?: PagesEnabledConfig;
            sidebarBadges?: CustomerSidebarBadges;
          };
        };
      } catch {
        return;
      }
      if (epoch !== syncEpochRef.current) return;
      if (!json || typeof json.data === "undefined") return;
      if (json.data.pagesEnabled) {
        setPagesEnabled({
          ...DEFAULT_PAGES_ENABLED,
          ...json.data.pagesEnabled,
        });
      }
      if (json.data.sidebarBadges) {
        setSidebarBadges(json.data.sidebarBadges);
      }
      applyUser(json.data.user ?? null, {
        reason: json.data.reason,
      });
    } catch {
      // Network / abort — do not treat as logout.
    } finally {
      window.clearTimeout(kill);
      if (epoch === syncEpochRef.current) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [applyUser]);

  useEffect(() => {
    void refresh();
    // Hard unblock splash/auth UI if the first refresh races with Strict Mode.
    const t = window.setTimeout(() => setLoading(false), 8_500);
    return () => window.clearTimeout(t);
  }, [refresh]);

  // Poll session (wallet, role, caps, ban) every 5s + when tab becomes active.
  useEffect(() => {
    if (!user?.id) return;

    const tick = () => {
      if (document.hidden) return;
      void refresh();
    };

    const onVisible = () => {
      if (!document.hidden) void refresh();
    };

    const id = window.setInterval(tick, LIVE_SYNC_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [user?.id, refresh]);

  const openAuth = useCallback((mode: AuthMode = "login", next?: string) => {
    setNextPath(isSafeNextPath(next ?? null) ? next! : null);
    setAuthMode(mode);
  }, []);

  const closeAuth = useCallback(() => {
    setAuthMode(null);
  }, []);

  useEffect(() => {
    // Wait for /api/auth/me so we don't open login for an already-signed-in session.
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const refCode = normalizeReferralCode(
      params.get("ref") || params.get("referral") || "",
    );
    if (refCode) setReferralCodeFromUrl(refCode);

    let auth = params.get("auth");
    // Invite links may be `/?ref=CODE` without auth — open register for guests.
    if (!auth && refCode && !user) {
      auth = "register";
    }

    if (
      auth !== "login" &&
      auth !== "register" &&
      auth !== "forgot" &&
      auth !== "2fa"
    ) {
      return;
    }

    const next = params.get("next");
    params.delete("auth");
    params.delete("next");
    // Keep google_error for the login form; keep ref so refresh still prefills.
    const qs = params.toString();
    const cleanUrl = qs ? `${pathname}?${qs}` : pathname;

    if (user) {
      setAuthMode(null);
      setNextPath(null);
      router.replace(cleanUrl, { scroll: false });
      return;
    }

    setAuthMode(auth);
    if (isSafeNextPath(next)) setNextPath(next);
    router.replace(cleanUrl, { scroll: false });
  }, [pathname, router, user, loading]);

  const setUserSafe = useCallback(
    (next: SafeUser | null) => {
      // Invalidate in-flight /me so a stale null cannot wipe a fresh login.
      syncEpochRef.current += 1;
      abortRef.current?.abort();
      inFlightRef.current = false;

      if (next) {
        prevBalanceRef.current = next.walletBalance;
        // Keep serverSynced false until a post-login /me confirms the cookie.
        serverSyncedRef.current = false;
        setUser(next);
        void refresh();
      } else {
        serverSyncedRef.current = false;
        prevBalanceRef.current = null;
        setUser(null);
      }
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    loggingOutRef.current = true;
    syncEpochRef.current += 1;
    abortRef.current?.abort();
    inFlightRef.current = false;
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      serverSyncedRef.current = false;
      prevBalanceRef.current = null;
      setSidebarBadges(DEFAULT_CUSTOMER_SIDEBAR_BADGES);
      setUser(null);
      toast.success("Signed out");
    } finally {
      loggingOutRef.current = false;
    }
  }, []);

  const handleSuccess = useCallback(
    (loggedIn?: SafeUser | null) => {
      const roleHome = loggedIn ? homePathForRole(loggedIn.role) : "/app";
      let destination =
        nextPath && !(loggedIn?.role === "ADMIN" && nextPath.startsWith("/app"))
          ? nextPath
          : roleHome;
      // Non-admins cannot establish a session during maintenance (API-enforced).
      if (
        loggedIn &&
        loggedIn.role !== "ADMIN" &&
        (pathname === "/" || pathname.startsWith("/maintenance"))
      ) {
        destination = "/";
      }
      setAuthMode(null);
      setNextPath(null);
      // Navigate away from /?auth=login first — never router.refresh() while still
      // on that URL (middleware used to wipe the fresh session cookie on refresh).
      router.replace(destination);
    },
    [nextPath, pathname, router],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        pagesEnabled,
        sidebarBadges,
        refresh,
        setUser: setUserSafe,
        logout,
        openAuth,
        closeAuth,
      }}
    >
      {children}
      <AuthDialog
        mode={authMode}
        onModeChange={setAuthMode}
        onClose={closeAuth}
        onSuccess={handleSuccess}
        initialReferralCode={referralCodeFromUrl}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
