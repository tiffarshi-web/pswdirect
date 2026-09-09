/**
 * Single source of truth for the Worker app version.
 *
 * Semantic marketing version drives both stores. The build number is the
 * Android `versionCode` and the iOS `CFBundleVersion`; it must only ever
 * increase, and every uploaded build needs a new one even when the marketing
 * version is unchanged.
 */
export const WORKER_APP_VERSION = "1.0.0";
export const WORKER_BUILD_NUMBER = 1;

export type WorkerEnvironment = "development" | "staging" | "production";

export function workerEnvironment(mode: string, explicit?: string): WorkerEnvironment {
  const value = (explicit ?? "").toLowerCase();
  if (value === "staging" || value === "production" || value === "development") return value;
  return mode === "production" ? "production" : "development";
}

/** Only production builds hide diagnostics; staging keeps them for testers. */
export function showsDiagnostics(environment: WorkerEnvironment): boolean {
  return environment !== "production";
}
