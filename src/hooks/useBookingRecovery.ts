// Lightweight in-progress booking recovery.
// Safely persists booking form state in localStorage so an accidental refresh
// during the payment step does not wipe everything the user typed.
//
// IMPORTANT:
// - Never persists payment / Stripe secrets / passwords.
// - Strips sensitive fields before saving.
// - Cleared on successful payment OR explicit user cancel.
// - Versioned key prevents stale-shape restores after schema changes.

import { useEffect, useRef } from "react";

const STORAGE_KEY = "psw_booking_recovery_v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 2; // 2 hours

// Fields we explicitly do NOT persist
const SENSITIVE_FIELDS = new Set(["createPassword", "confirmPassword"]);

interface RecoveryEnvelope<T> {
  savedAt: number;
  data: T;
}

const sanitize = <T extends Record<string, unknown>>(data: T): T => {
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.has(k)) continue;
    clone[k] = v;
  }
  return clone as T;
};

export const loadBookingRecovery = <T = unknown>(): T | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const env = JSON.parse(raw) as RecoveryEnvelope<T>;
    if (!env || typeof env.savedAt !== "number") return null;
    if (Date.now() - env.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return env.data ?? null;
  } catch {
    return null;
  }
};

export const clearBookingRecovery = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};

/**
 * Persist booking form data to localStorage on every change while `enabled` is true.
 * Pass `enabled=false` once the booking is fully completed (or canceled) — recovery is then cleared.
 */
export const useBookingRecovery = <T extends Record<string, unknown>>(
  data: T,
  enabled: boolean = true
): void => {
  const lastSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      clearBookingRecovery();
      lastSerializedRef.current = null;
      return;
    }
    try {
      const sanitized = sanitize(data);
      const payload: RecoveryEnvelope<T> = { savedAt: Date.now(), data: sanitized };
      const serialized = JSON.stringify(payload);
      if (serialized === lastSerializedRef.current) return;
      lastSerializedRef.current = serialized;
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      /* quota / serialize errors are non-fatal */
    }
  }, [data, enabled]);
};
