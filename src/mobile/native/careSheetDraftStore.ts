import { Preferences } from "@capacitor/preferences";

/**
 * Offline-safe care-sheet drafts.
 *
 * Stored in the app's private Capacitor Preferences store (iOS Keychain-backed
 * UserDefaults / Android private SharedPreferences), never in shared storage.
 * Only the worker's own answers are kept — no client address, phone number,
 * diagnosis list, or other record the server already holds.
 */

const PREFIX = "psw.caresheet.draft.";
const INDEX_KEY = "psw.caresheet.draft.index";

export interface CareSheetDraft {
  bookingId: string;
  /** Free-form answers captured by the care-sheet form. */
  answers: Record<string, unknown>;
  updatedAt: string;
  /** True until the server has confirmed the submission. */
  unsynced: boolean;
}

const DISALLOWED_FIELDS = [
  "client_address",
  "patient_address",
  "service_address",
  "client_phone",
  "patient_phone",
  "postal_code",
  "health_card",
  "health_card_number",
];

/** Strips fields we must not persist to the device. */
export function sanitizeAnswers(answers: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (DISALLOWED_FIELDS.includes(key.toLowerCase())) continue;
    clean[key] = value;
  }
  return clean;
}

export async function saveDraft(bookingId: string, answers: Record<string, unknown>): Promise<CareSheetDraft> {
  const draft: CareSheetDraft = {
    bookingId,
    answers: sanitizeAnswers(answers),
    updatedAt: new Date().toISOString(),
    unsynced: true,
  };
  await Preferences.set({ key: PREFIX + bookingId, value: JSON.stringify(draft) });
  await addToIndex(bookingId);
  return draft;
}

export async function loadDraft(bookingId: string): Promise<CareSheetDraft | null> {
  const { value } = await Preferences.get({ key: PREFIX + bookingId });
  if (!value) return null;
  try {
    return JSON.parse(value) as CareSheetDraft;
  } catch {
    await clearDraft(bookingId);
    return null;
  }
}

export async function markSynced(bookingId: string): Promise<void> {
  // A confirmed submission means the local copy is no longer needed at all.
  await clearDraft(bookingId);
}

export async function clearDraft(bookingId: string): Promise<void> {
  await Preferences.remove({ key: PREFIX + bookingId });
  const ids = (await unsyncedDraftIds()).filter((id) => id !== bookingId);
  await Preferences.set({ key: INDEX_KEY, value: JSON.stringify(ids) });
}

export async function unsyncedDraftIds(): Promise<string[]> {
  const { value } = await Preferences.get({ key: INDEX_KEY });
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

async function addToIndex(bookingId: string): Promise<void> {
  const ids = await unsyncedDraftIds();
  if (!ids.includes(bookingId)) {
    ids.push(bookingId);
    await Preferences.set({ key: INDEX_KEY, value: JSON.stringify(ids) });
  }
}

/** Removes every locally stored draft. Called on sign-out and account deletion. */
export async function clearAllDrafts(): Promise<void> {
  for (const id of await unsyncedDraftIds()) {
    await Preferences.remove({ key: PREFIX + id });
  }
  await Preferences.remove({ key: INDEX_KEY });
}
