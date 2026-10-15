"use client";

import { usePwaInstall } from "@/components/layout/pwa-provider";
import { useSiteConfig } from "@/components/theme/site-config-provider";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";
import {
  ANDROID_APK_FILENAME,
  ANDROID_APK_HREF,
  downloadAndroidApk,
  isAndroidUserAgent,
} from "@/lib/android-apk";
import { isStandaloneBioRoute } from "@/lib/profile";
import { isSystemStatusPath } from "@/lib/system-status-paths";
import { Download, Share, Smartphone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function InstallAppHelpDialog() {
  const { helpOpen, setHelpOpen, isIos, canPromptInstall, promptInstall } =
    usePwaInstall();
  const site = useSiteConfig();
  const pathname = usePathname();
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(isAndroidUserAgent());
  }, []);

  if (isStandaloneBioRoute(pathname)) return null;

  return (
    <DialogShell
      open={helpOpen}
      onOpenChange={setHelpOpen}
      size="sm"
      icon={<Smartphone className="size-5" aria-hidden />}
      title={isAndroid ? `Download ${site.siteName}` : `Install ${site.siteName}`}
      description={
        isAndroid
          ? "Get the official Android app (APK) named after this store."
          : "Add this store to your home screen and open it like an app."
      }
      footer={
        <>
          <Button variant="outline" onClick={() => setHelpOpen(false)}>
            Close
          </Button>
          {isAndroid ? (
            <Button asChild>
              <a
                href={ANDROID_APK_HREF}
                download={ANDROID_APK_FILENAME}
                onClick={() => {
                  toast.success("Download started");
                  setHelpOpen(false);
                }}
              >
                <Download data-icon="inline-start" />
                Download APK
              </a>
            </Button>
          ) : canPromptInstall ? (
            <Button
              onClick={async () => {
                const result = await promptInstall();
                if (result === "accepted") {
                  setHelpOpen(false);
                  toast.success("App installed");
                }
              }}
            >
              <Download data-icon="inline-start" />
              Install now
            </Button>
          ) : null}
        </>
      }
    >
      {isAndroid ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Download{" "}
            <span className="font-medium text-foreground">
              {ANDROID_APK_FILENAME}
            </span>
            , open the file, and allow install from this browser if prompted.
          </p>
          <p>
            After install, open{" "}
            <span className="font-medium text-foreground">{site.siteName}</span>{" "}
            from your home screen or app drawer.
          </p>
        </div>
      ) : isIos ? (
        <ol className="list-decimal space-y-3 pl-4 text-sm text-muted-foreground">
          <li>
            Tap the{" "}
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              Share <Share className="size-3.5" aria-hidden />
            </span>{" "}
            button in Safari.
          </li>
          <li>
            Scroll and choose{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>
            .
          </li>
          <li>
            Tap{" "}
            <span className="font-medium text-foreground">Add</span> to install{" "}
            {site.siteName}.
          </li>
        </ol>
      ) : (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Use your browser menu and choose{" "}
            <span className="font-medium text-foreground">Install app</span> or{" "}
            <span className="font-medium text-foreground">
              Add to Home screen
            </span>
            .
          </p>
          <p>
            Chrome / Edge: menu (⋮) → Install. On Android phones, use{" "}
            <span className="font-medium text-foreground">Download APK</span>{" "}
            instead for the native app.
          </p>
        </div>
      )}
    </DialogShell>
  );
}

export function InstallAppBanner() {
  const { showBanner, promptInstall, dismissBanner, canPromptInstall, isIos } =
    usePwaInstall();
  const site = useSiteConfig();
  const pathname = usePathname();
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(isAndroidUserAgent());
  }, []);

  if (!showBanner || isSystemStatusPath(pathname) || isStandaloneBioRoute(pathname)) return null;

  return (
    <div
      role="region"
      aria-label={isAndroid ? "Download Android app" : "Install app"}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:p-4 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-primary/25 bg-card/95 p-3 shadow-[var(--glow-soft)] backdrop-blur-md ring-1 ring-foreground/10">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Smartphone className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">
            {isAndroid ? `Get ${site.siteName}` : `Install ${site.siteName}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAndroid
              ? "Download the official Android APK"
              : isIos && !canPromptInstall
                ? "Add to your home screen for quick access"
                : "Open like an app from your home screen"}
          </p>
        </div>
        {isAndroid ? (
          <Button size="sm" className="shrink-0" asChild>
            <a
              href={ANDROID_APK_HREF}
              download={ANDROID_APK_FILENAME}
              onClick={() => {
                dismissBanner();
                toast.success("Download started");
              }}
            >
              Download
            </a>
          </Button>
        ) : (
          <Button
            size="sm"
            className="shrink-0"
            onClick={async () => {
              const result = await promptInstall();
              if (result === "accepted") {
                dismissBanner();
                toast.success("App installed");
              }
            }}
          >
            Install
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Dismiss"
          onClick={dismissBanner}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function useInstallAppAction() {
  const { canInstall, isInstalled, promptInstall, openHelp } = usePwaInstall();
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(isAndroidUserAgent());
  }, []);

  async function install() {
    if (isAndroid) {
      downloadAndroidApk();
      toast.success("Download started");
      return "accepted" as const;
    }
    const result = await promptInstall();
    if (result === "accepted") toast.success("App installed");
    return result;
  }

  return {
    canInstall: canInstall && !isInstalled,
    isInstalled,
    isAndroid,
    install,
    openHelp,
    apkHref: ANDROID_APK_HREF,
  };
}
