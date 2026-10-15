import { AuthProvider } from "@/components/auth/auth-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { ContentProtection } from "@/components/layout/content-protection";
import { ContentProtectionNoscript } from "@/components/layout/content-protection-noscript";
import {
  InstallAppBanner,
  InstallAppHelpDialog,
} from "@/components/layout/install-app-ui";
import { InteractionFeedbackProvider } from "@/components/layout/interaction-feedback-provider";
import { LiveWaveBackground } from "@/components/layout/live-wave-background";
import { MaintenanceGate } from "@/components/layout/maintenance-gate";
import { NativeAppBootstrap } from "@/components/layout/native-app-bootstrap";
import { NativeOfflineBanner } from "@/components/layout/native-offline-banner";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { PwaProvider } from "@/components/layout/pwa-provider";
import { SiteChrome } from "@/components/layout/site-chrome";
import { WebPushPrompt } from "@/components/layout/web-push-prompt";
import { SiteConfigProvider } from "@/components/theme/site-config-provider";
import { SiteIconsProvider } from "@/components/theme/site-icons-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getSiteConfig, siteConfigThemeCss } from "@/lib/site-config";
import { getFeedbackSoundConfig } from "@/lib/feedback-sounds";
import "@/lib/fontawesome";
import { isPublicProfilePath } from "@/lib/profile";
import { getSiteIcons } from "@/lib/site-icons";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#10b981",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const title = config.siteTagline.trim()
    ? `${config.siteName} | ${config.siteTagline}`
    : config.siteName;
  const icons = config.faviconUrl || config.logoUrl || undefined;
  const og = config.ogImageUrl || config.logoUrl || undefined;

  return {
    title,
    description:
      config.siteSeoDescription.trim() ||
      "Premium digital products delivered instantly.",
    applicationName: config.siteName,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: config.siteName,
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: icons
        ? [{ url: icons }, { url: "/pwa/icon-192.png", sizes: "192x192" }]
        : [
            { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
      apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
      title,
      description:
        config.siteSeoDescription.trim() ||
        "Premium digital products delivered instantly.",
      images: og ? [{ url: og }] : undefined,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [siteConfig, siteIcons, feedbackPack, headersList] = await Promise.all([
    getSiteConfig(),
    getSiteIcons(),
    getFeedbackSoundConfig(),
    headers(),
  ]);
  const isBioSubdomain = headersList.get("x-drip-is-bio") === "1";
  const reqPathname = headersList.get("x-drip-pathname") || "";
  const isBioInitial = isBioSubdomain || isPublicProfilePath(reqPathname);
  const themeCss = siteConfigThemeCss(siteConfig);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body
        className="relative flex min-h-full flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <ContentProtectionNoscript />
        <style
          id="drip-site-theme"
          dangerouslySetInnerHTML={{ __html: themeCss }}
        />
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ContentProtection />
          <SiteConfigProvider config={siteConfig}>
            <SiteIconsProvider icons={siteIcons}>
              <PwaProvider>
                <InteractionFeedbackProvider feedbackPack={feedbackPack}>
                  <NativeAppBootstrap />
                  <LiveWaveBackground isBioInitial={isBioInitial} />
                  <AuthProvider>
                    <CartProvider>
                      <MaintenanceGate banner={<InstallAppBanner />}>
                        <SiteChrome isBioInitial={isBioInitial}>{children}</SiteChrome>
                      </MaintenanceGate>
                      <NativeOfflineBanner />
                      <OfflineBanner />
                      <InstallAppHelpDialog />
                      <WebPushPrompt />
                      <Toaster />
                    </CartProvider>
                  </AuthProvider>
                </InteractionFeedbackProvider>
              </PwaProvider>
            </SiteIconsProvider>
          </SiteConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
