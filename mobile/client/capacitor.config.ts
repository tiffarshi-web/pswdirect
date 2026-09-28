import type { CapacitorConfig } from "@capacitor/cli";

/**
 * PSW Direct Client (family) native shell.
 *
 * Permanent identity: `ca.pswdirect.client`. Never reuse the Worker ID
 * (`ca.pswdirect.worker`). Web assets are bundled — there is no `server.url`,
 * so the app cannot be pointed at a preview host.
 */
const isBetaBuild = process.env.CLIENT_BUILD_TYPE === "beta" || process.env.CLIENT_BUILD_TYPE === "debug";

const config: CapacitorConfig = {
  appId: "ca.pswdirect.client",
  appName: "PSW Direct",
  webDir: "../../dist-client",
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: isBetaBuild,
    loggingBehavior: isBetaBuild ? "debug" : "none",
  },
  ios: {
    contentInset: "automatic",
  },
  server: {
    androidScheme: "https",
    cleartext: false,
    // Keep Stripe card verification (3-D Secure) inside the app so the payment
    // returns to the same screen instead of an external browser.
    allowNavigation: ["*.stripe.com", "*.stripe.network"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
