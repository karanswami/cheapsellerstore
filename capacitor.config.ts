import type { CapacitorConfig } from "@capacitor/cli";

const PROD_URL =
  process.env.CAPACITOR_SERVER_URL ?? "https://cheapseller.store";

const config: CapacitorConfig = {
  appId: "dev.dripclientofficial.app",
  appName: "CHEAP SELLER",
  webDir: "www",
  server: {
    url: PROD_URL,
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.CAPACITOR_DEBUG === "true",
    appendUserAgent: "DripNativeApp/1.0",
    // Official Capacitor Android 15 fix — WebView.setPadding is unreliable;
    // this applies real layout margins for status/nav/cutout bars.
    adjustMarginsForEdgeToEdge: "force",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 1500,
      launchFadeOutDuration: 300,
      backgroundColor: "#0c0c0e",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER",
      showSpinner: false,
      splashFullScreen: true,
    },
    StatusBar: {
      // DARK = light icons on dark UI (Capacitor naming)
      style: "DARK",
      backgroundColor: "#0c0c0e",
      // Transparent status bar over the dark margin gap above the WebView.
      overlaysWebView: true,
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
