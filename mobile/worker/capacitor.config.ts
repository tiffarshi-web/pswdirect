import type { CapacitorConfig } from "@capacitor/cli";

/**
 * PSW Direct Caregiver (Worker) native shell.
 *
 * Identity is permanent: `ca.pswdirect.worker` is already registered with
 * Firebase, so it must not change. Web assets are bundled into the app — there
 * is deliberately no `server.url`, so the beta cannot be pointed at a preview
 * or development host, and the app starts without a network round trip.
 */

/** Only an explicit beta build opts into WebView inspection. */
const isBetaBuild = process.env.WORKER_BUILD_TYPE === "beta" || process.env.WORKER_BUILD_TYPE === "debug";

const config: CapacitorConfig = {
  appId: "ca.pswdirect.worker",
  appName: "PSW Direct Caregiver",
  webDir: "../../dist-worker",
  android: {
    // Serves bundled assets over https://localhost so the WebView treats the
    // app as a secure origin (required for geolocation and the camera).
    // Stable Android System WebView only — WebView Canary is never required.
    allowMixedContent: false,
    captureInput: true,
    // Release builds are never inspectable over USB.
    webContentsDebuggingEnabled: isBetaBuild,
    loggingBehavior: isBetaBuild ? "debug" : "none",
  },
  server: {
    androidScheme: "https",
    // No cleartext: every request the app makes is HTTPS.
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      // The web layer dismisses the splash itself as soon as it can paint, but
      // this ceiling guarantees it is gone even if the web layer never loads.
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
