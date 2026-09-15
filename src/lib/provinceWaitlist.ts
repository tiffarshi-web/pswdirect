/**
 * Alberta (and any future province) "Coming Soon" waiting list.
 *
 * The waiting list is a contact list only — it must never collect health or
 * medical information. The fields below are the complete, allowed set, and
 * the free-text field is screened before it is stored.
 */

export const WAITLIST_ALLOWED_FIELDS = [
  "full_name",
  "email",
  "phone",
  "province",
  "city",
  "postal_code",
  "notes",
] as const;

export type WaitlistField = (typeof WAITLIST_ALLOWED_FIELDS)[number];

/** Words that signal health/medical content in the optional free-text note. */
const HEALTH_TERMS = [
  "diagnos",
  "dementia",
  "alzheimer",
  "cancer",
  "stroke",
  "diabet",
  "medication",
  "prescription",
  "wound",
  "catheter",
  "palliative",
  "hospice",
  "incontinen",
  "disease",
  "illness",
  "symptom",
  "surgery",
  "injury",
  "mental health",
  "psychiatric",
];

export const containsHealthDetails = (text?: string | null): boolean => {
  const value = (text || "").toLowerCase();
  if (!value.trim()) return false;
  return HEALTH_TERMS.some((term) => value.includes(term));
};

/**
 * Returns the note to store: trimmed text, or null when it is empty or looks
 * like health information (which is dropped rather than saved).
 */
export const sanitizeWaitlistNote = (text?: string | null): string | null => {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  if (containsHealthDetails(trimmed)) return null;
  return trimmed.slice(0, 500);
};

export interface WaitlistEntryInput {
  fullName: string;
  email: string;
  phone?: string | null;
  province?: string | null;
  city?: string | null;
  postalCode?: string | null;
  notes?: string | null;
}

/** Builds the exact row stored on the waiting list — contact details only. */
export const buildWaitlistRow = (input: WaitlistEntryInput) => ({
  full_name: input.fullName.trim(),
  email: input.email.trim().toLowerCase(),
  phone: input.phone?.trim() || null,
  province: input.province || null,
  city: input.city || null,
  postal_code: input.postalCode || null,
  notes: sanitizeWaitlistNote(input.notes),
});
