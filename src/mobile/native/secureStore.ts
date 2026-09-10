import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { isNativeApp } from "./platform";

/**
 * Hardware-backed secure storage for the packaged Worker app.
 *
 * Dependency: `@aparajita/capacitor-secure-storage` v8 (Capacitor 7 compatible,
 * actively maintained). iOS uses the system Keychain; Android uses
 * EncryptedSharedPreferences with a key held in the Android Keystore.
 *
 * Rules enforced here:
 *  - Native builds NEVER fall back to unencrypted storage. If the secure store
 *    is unavailable, the read returns null and the write reports failure, so the
 *    caller signs the worker in again rather than writing a plaintext token.
 *  - Values are never logged.
 */

export type SecureStoreStatus = "ok" | "unavailable";

let status: SecureStoreStatus | null = null;

/** Probes the secure store once per app run. */
export async function secureStoreStatus(): Promise<SecureStoreStatus> {
  if (status) return status;
  if (!isNativeApp()) {
    status = "unavailable";
    return status;
  }
  try {
    await SecureStorage.get("psw.worker.probe");
    status = "ok";
  } catch {
    status = "unavailable";
  }
  return status;
}

export async function secureGet(key: string): Promise<string | null> {
  if ((await secureStoreStatus()) !== "ok") return null;
  try {
    const value = await SecureStorage.get(key);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

/** Returns false when the value could not be stored securely. */
export async function secureSet(key: string, value: string): Promise<boolean> {
  if ((await secureStoreStatus()) !== "ok") return false;
  try {
    await SecureStorage.set(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function secureRemove(key: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await SecureStorage.remove(key);
  } catch {
    /* nothing stored, or the store is unavailable */
  }
}

/** Test seam: lets specs reset the cached probe result. */
export function __resetSecureStoreStatus(next: SecureStoreStatus | null = null) {
  status = next;
}
