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
let probe: Promise<SecureStoreStatus> | null = null;

/** Leave room for session recovery and a visible retry within the UI deadline. */
export const SECURE_STORAGE_TIMEOUT_MS = 2000;

class SecureStorageTimeout extends Error {}

async function storageDeadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SecureStorageTimeout()), SECURE_STORAGE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Probes the secure store once per app run. */
export async function secureStoreStatus(): Promise<SecureStoreStatus> {
  if (status) return status;
  if (!isNativeApp()) {
    status = "unavailable";
    return status;
  }
  // Supabase starts reading storage during module import. A UI-only timeout
  // cannot release that initialization promise or the auth calls waiting on it.
  probe ??= (async () => {
    try {
      await storageDeadline(SecureStorage.get("psw.worker.probe"));
      status = "ok";
    } catch {
      status = "unavailable";
    }
    return status;
  })();
  return probe;
}

export async function secureGet(key: string): Promise<string | null> {
  if ((await secureStoreStatus()) !== "ok") return null;
  try {
    const value = await storageDeadline(SecureStorage.get(key));
    return typeof value === "string" ? value : null;
  } catch (error) {
    if (error instanceof SecureStorageTimeout) status = "unavailable";
    return null;
  }
}

/** Returns false when the value could not be stored securely. */
export async function secureSet(key: string, value: string): Promise<boolean> {
  if ((await secureStoreStatus()) !== "ok") return false;
  const write = Promise.resolve().then(() => SecureStorage.set(key, value));
  try {
    await storageDeadline(write);
    return true;
  } catch (error) {
    if (error instanceof SecureStorageTimeout) {
      status = "unavailable";
      // A timed-out native call cannot be cancelled. Remove its value if it
      // eventually completes, so a late write cannot resurrect a signed-out session.
      void write.then(() => secureRemove(key), () => undefined);
    }
    return false;
  }
}

export async function secureRemove(key: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await storageDeadline(SecureStorage.remove(key));
  } catch {
    /* nothing stored, or the store is unavailable */
  }
}

/** Test seam: lets specs reset the cached probe result. */
export function __resetSecureStoreStatus(next: SecureStoreStatus | null = null) {
  status = next;
  probe = null;
}
