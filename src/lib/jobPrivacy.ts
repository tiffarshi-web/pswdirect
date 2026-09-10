// Client-side privacy guard for caregiver job cards.
//
// The server is authoritative: public.psw_available_jobs and
// public.psw_safe_booking_view already mask client identity and the exact
// service address until a caregiver has accepted the shift. This module is a
// second, local guard so a cached or unexpected payload can never render exact
// client information on an open job.

export interface CaregiverJobFields {
  clientName?: string | null;
  clientFirstName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  patientAddress?: string | null;
  unitNumber?: string | null;
  buzzerCode?: string | null;
  entryPoint?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  specialNotes?: string | null;
  [key: string]: unknown;
}

/** Fields that only ever belong to the caregiver assigned to the shift. */
export const POST_ACCEPTANCE_ONLY_FIELDS = [
  "clientName",
  "clientFirstName",
  "clientPhone",
  "clientEmail",
  "unitNumber",
  "buzzerCode",
  "entryPoint",
] as const;

/** A street address looks exact when it starts with a civic number. */
export const looksLikeExactAddress = (value: string | null | undefined): boolean =>
  !!value && /^\s*\d+[a-zA-Z]?\s+\S/.test(value);

/** Approximate wording used when an exact address slips through. */
export const approximateArea = (postalCode?: string | null): string => {
  const fsa = (postalCode || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3);
  return fsa ? `${fsa} area` : "Service area shown after you accept";
};

/**
 * Strip everything a caregiver must not see before accepting a shift.
 * `isAssigned` must be true only when this caregiver is the assigned worker.
 */
export const redactJobForCaregiver = <T extends object>(
  job: T,
  opts: { isAssigned: boolean; postalCode?: string | null },
): T => {
  if (opts.isAssigned) return job;
  const safe: CaregiverJobFields = { ...job };
  for (const field of POST_ACCEPTANCE_ONLY_FIELDS) safe[field] = undefined;
  for (const field of ["patientAddress", "pickupAddress", "dropoffAddress"] as const) {
    if (looksLikeExactAddress(safe[field] as string | null | undefined)) {
      safe[field] = approximateArea(opts.postalCode);
    }
  }
  return safe as T;
};
