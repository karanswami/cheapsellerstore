"use client";

import { Wrench, ShieldAlert } from "lucide-react";

type AuthMaintenanceNoticeProps = {
  /** login = sign-in paused for customers; register = new accounts closed */
  mode: "login" | "register";
};

/**
 * Modern aesthetic maintenance card inside AuthDialog.
 */
export function AuthMaintenanceNotice({ mode }: AuthMaintenanceNoticeProps) {
  const isRegister = mode === "register";

  return (
    <div
      role="alert"
      className="mb-4 relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 backdrop-blur-md"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/35 bg-amber-500/20 text-amber-400">
          {isRegister ? (
            <ShieldAlert className="size-4" />
          ) : (
            <Wrench className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
              {isRegister ? "Registration Paused" : "System Maintenance"}
            </p>
          </div>
          <p className="mt-1 text-xs leading-snug text-amber-200/90">
            {isRegister
              ? "Account creation is temporarily paused while system upgrades are in progress. Please check back shortly."
              : "Customer sign-in is paused during maintenance. (Admin operators may sign in below)."}
          </p>
        </div>
      </div>
    </div>
  );
}
