import { secureGet, secureRemove, secureSet, secureStoreStatus } from "@/mobile/native/secureStore";

/**
 * Supabase auth storage for the packaged Client and Worker apps.
 *
 * - Every read/write goes to the Keychain (iOS) / Keystore-backed storage (Android).
 * - Never writes WebView localStorage. Any token copy left there by an older
 *   build is moved into secure storage once (if available) and always deleted.
 * - Fails closed: if secure storage is unavailable, nothing is persisted and the
 *   user simply signs in again.
 */
export type AsyncAuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const SUPABASE_KEY = /^sb-.+-auth-token(-code-verifier)?$/;

function webStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Removes every Supabase token copy from WebView storage. */
export function purgeWebTokenCopies(): void {
  const ls = webStorage();
  if (!ls) return;
  const doomed: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && SUPABASE_KEY.test(k)) doomed.push(k);
  }
  doomed.forEach((k) => ls.removeItem(k));
}

export function createSecureAuthStorage(): AsyncAuthStorage {
  const migrated = new Set<string>();

  async function migrateOnce(key: string): Promise<void> {
    if (migrated.has(key)) return;
    migrated.add(key);
    const ls = webStorage();
    let legacy: string | null = null;
    try {
      legacy = ls?.getItem(key) ?? null;
    } catch {
      legacy = null;
    }
    if (legacy && (await secureStoreStatus()) === "ok" && !(await secureGet(key))) {
      await secureSet(key, legacy);
    }
    purgeWebTokenCopies();
  }

  return {
    async getItem(key) {
      await migrateOnce(key);
      return secureGet(key);
    },
    async setItem(key, value) {
      const ok = await secureSet(key, value);
      if (!ok) await secureRemove(key);
    },
    async removeItem(key) {
      await secureRemove(key);
      purgeWebTokenCopies();
    },
  };
}
