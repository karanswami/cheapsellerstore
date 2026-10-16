import type { Metadata } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getSiteConfig } from "@/lib/site-config";
import "./globals.css";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return {
    title: `${config.siteName} — ${config.siteTagline}`,
    description: config.siteSeoDescription,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} dark`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
