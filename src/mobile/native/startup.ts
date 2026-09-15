/**
 * Startup contract for the packaged Worker app.
 *
 * The Android beta could hang on a spinner forever because the whole shell was
 * blocked on `restoreSession()`, and `SplashScreen.hide()` only ran *after* it.
 * When the device had no usable network, the Supabase token refresh inside
 * `getSession()` never settled, so nothing ever rendered and nothing ever hid
 * the splash.
 *
 * Rules enforced here:
 *  - Every startup step is time-boxed. A step that does not settle is a
 *    failure, never an endless wait.
 *  - Startup reports a stage and a short, non-sensitive error code so a beta
 *    tester can read it aloud without leaking a token, address or health note.
 *  - Notifications, deep links and location never gate the first screen.
 */

export type StartupStage =
  | "booting"
  | "checking_build"
  | "restoring_session"
  | "ready"
  | "failed";

/** Short codes shown on the fallback screen. Never include private data. */
export type StartupErrorCode =
  | "STARTUP_TIMEOUT"
  | "SESSION_RESTORE_FAILED"
  | "BACKEND_CONFIG"
  | "OFFLINE"
  | "UNKNOWN";

/** Session restore is time-boxed well under the overall startup budget. */
export const SESSION_RESTORE_TIMEOUT_MS = 8000;
/** Hard ceiling: after this the app must be showing something actionable. */
export const STARTUP_TIMEOUT_MS = 12000;

export const TIMEOUT_SENTINEL = Symbol("worker-startup-timeout");

/**
 * Resolves with the sentinel instead of hanging. The underlying promise is left
 * to settle on its own; we simply stop waiting for it.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | typeof TIMEOUT_SENTINEL> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
        timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function timedOut<T>(value: T | typeof TIMEOUT_SENTINEL): value is typeof TIMEOUT_SENTINEL {
  return value === TIMEOUT_SENTINEL;
}

export interface StartupState {
  stage: StartupStage;
  errorCode?: StartupErrorCode;
}

/** Maps a failed step to the code the tester sees. */
export function startupErrorCode(
  stage: StartupStage,
  online: boolean,
  cause: "timeout" | "error" | "config",
): StartupErrorCode {
  if (cause === "config") return "BACKEND_CONFIG";
  if (!online) return "OFFLINE";
  if (cause === "timeout") return "STARTUP_TIMEOUT";
  if (stage === "restoring_session") return "SESSION_RESTORE_FAILED";
  return "UNKNOWN";
}

/** A spinner is only ever legitimate before the hard startup ceiling. */
export function mayShowSpinner(stage: StartupStage, elapsedMs: number): boolean {
  if (stage === "ready" || stage === "failed") return false;
  return elapsedMs < STARTUP_TIMEOUT_MS;
}

export interface StartupDiagnostics {
  stage: StartupStage;
  errorCode?: StartupErrorCode;
  appVersion: string;
  buildNumber: number;
  platform: string;
  online: boolean;
  /** Parsed from the user agent; absent on non-Android surfaces. */
  webViewVersion?: string;
  deviceModel?: string;
  androidVersion?: string;
}

const CHROME_VERSION = /Chrome\/([0-9]+(?:\.[0-9]+)*)/;
const ANDROID_VERSION = /Android\s+([0-9]+(?:\.[0-9]+)*)/;

export function parseWebViewVersion(userAgent: string | undefined): string | undefined {
  return userAgent ? (CHROME_VERSION.exec(userAgent)?.[1] ?? undefined) : undefined;
}

export function parseAndroidVersion(userAgent: string | undefined): string | undefined {
  return userAgent ? (ANDROID_VERSION.exec(userAgent)?.[1] ?? undefined) : undefined;
}

/**
 * Chromium 90 is the floor for the JavaScript and CSS the bundle emits. Every
 * current stable Android System WebView (including Samsung handsets on Android
 * 13-16) is far above it; WebView Canary is never required.
 */
export const MIN_SUPPORTED_WEBVIEW_MAJOR = 90;

export function isWebViewSupported(version: string | undefined): boolean {
  if (!version) return true; // unknown: never block the app on a guess
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);
  return Number.isNaN(major) ? true : major >= MIN_SUPPORTED_WEBVIEW_MAJOR;
}

/** Diagnostics are display-only strings; they must stay free of private data. */
const FORBIDDEN_DIAGNOSTIC_KEYS = [
  "token",
  "password",
  "address",
  "client",
  "health",
  "care",
  "amount",
  "payout",
  "email",
  "phone",
];

export function diagnosticsAreSafe(diagnostics: Record<string, unknown>): boolean {
  return Object.keys(diagnostics).every(
    (key) => !FORBIDDEN_DIAGNOSTIC_KEYS.some((bad) => key.toLowerCase().includes(bad)),
  );
}
