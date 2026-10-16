/**
 * Alberta provider registration evidence — validation + submission.
 *
 * Evidence is entered by an admin after a MANUAL check of the regulator's
 * public register or documents. There is no automatic registry lookup.
 *
 * Submission is two audited steps:
 *  1. admin_record_provider_registration_evidence — stores body, number,
 *     permit, expiry, evidence reference and stamps who checked it.
 *  2. admin_set_provincial_authorization — marks the record verified and
 *     job-eligible, passing the SAME registration number and expiry (that RPC
 *     overwrites both). The database guard (guard_ab_provider_authorization)
 *     refuses step 2 if the evidence is missing, wrong or expired.
 */
import { supabase } from "@/integrations/supabase/client";

export type AlbertaProviderType = "HCA" | "LPN" | "RN";

export interface AlbertaEvidenceInput {
  providerType: string;
  registrationBody: string;
  registrationNumber: string;
  permitNumber: string;
  expiresAt: string; // YYYY-MM-DD
  evidenceReference: string;
  verificationNote: string;
}

export type AlbertaEvidenceErrors = Partial<Record<keyof AlbertaEvidenceInput, string>>;

/** Body names are what the admin confirms they checked; HCA must be CLHA. */
export const ALBERTA_REGULATORY_BODIES: Record<AlbertaProviderType, string[]> = {
  HCA: ["CLHA"],
  LPN: ["CLPNA"],
  RN: ["CRNA"],
};

export const isAlbertaProviderType = (t: string | null | undefined): t is AlbertaProviderType =>
  !!t && ["HCA", "LPN", "RN"].includes(t.toUpperCase());

export const permitRequired = (providerType: string) => providerType.toUpperCase() === "HCA";

const todayLocal = (now: Date) => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const validateAlbertaEvidence = (
  input: AlbertaEvidenceInput,
  now: Date = new Date(),
): AlbertaEvidenceErrors => {
  const e: AlbertaEvidenceErrors = {};
  const type = input.providerType.toUpperCase();
  if (!isAlbertaProviderType(type)) {
    e.providerType = "Only HCA, LPN or RN can be authorized in Alberta.";
    return e;
  }
  const body = input.registrationBody.trim().toUpperCase();
  if (!body) e.registrationBody = "Choose the regulatory body you checked.";
  else if (!ALBERTA_REGULATORY_BODIES[type].includes(body))
    e.registrationBody = `${type} registration must be with ${ALBERTA_REGULATORY_BODIES[type].join(" / ")}.`;

  const reg = input.registrationNumber.trim();
  if (!reg) e.registrationNumber = "Registration number is required.";
  else if (reg.length > 50) e.registrationNumber = "Registration number is too long.";

  const permit = input.permitNumber.trim();
  if (permitRequired(type) && !permit) e.permitNumber = "HCAs need a CLHA practice permit number.";
  else if (permit.length > 50) e.permitNumber = "Permit number is too long.";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt)) e.expiresAt = "Expiry date is required.";
  else if (input.expiresAt <= todayLocal(now)) e.expiresAt = "Expiry must be in the future.";

  const ref = input.evidenceReference.trim();
  if (ref.length < 3) e.evidenceReference = "Say where you checked it (e.g. register search, document).";
  else if (ref.length > 500) e.evidenceReference = "Evidence reference is too long.";

  const note = input.verificationNote.trim();
  if (note.length < 10) e.verificationNote = "Add a verification note (at least 10 characters).";
  else if (note.length > 1000) e.verificationNote = "Note is too long.";
  return e;
};

const FRIENDLY: Record<string, string> = {
  not_authorized: "Only administrators can record registration evidence.",
  reason_required: "A verification note is required.",
  unknown_authorization: "This authorization record no longer exists. Refresh and try again.",
  ab_registration_number_required: "Registration number is required.",
  ab_current_permit_expiry_required: "A current (future) expiry date is required.",
  ab_registration_evidence_required: "Evidence reference was not saved; verification refused.",
  ab_hca_requires_clha_registration_and_practice_permit: "HCAs need CLHA registration and a practice permit number.",
  ab_nurse_requires_alberta_registration_body: "LPN/RN need their Alberta regulatory body.",
  ab_unsupported_provider_type: "Only HCA, LPN or RN can be authorized in Alberta.",
};

export const friendlyEvidenceError = (message: string | undefined | null): string => {
  const m = message ?? "";
  const key = Object.keys(FRIENDLY).find((k) => m.includes(k));
  return key ? FRIENDLY[key] : "Could not save registration evidence. Nothing was approved.";
};

export interface AlbertaAuthorizationRef {
  id: string;
  psw_profile_id: string;
  provider_type: string;
}

export type SubmitResult =
  | { ok: true; stage: "verified" }
  | { ok: false; stage: "validation"; errors: AlbertaEvidenceErrors }
  | { ok: false; stage: "evidence" | "verify"; message: string };

export const submitAlbertaEvidence = async (
  auth: AlbertaAuthorizationRef,
  input: AlbertaEvidenceInput,
  client = supabase,
): Promise<SubmitResult> => {
  const errors = validateAlbertaEvidence({ ...input, providerType: auth.provider_type });
  if (Object.keys(errors).length) return { ok: false, stage: "validation", errors };

  const note = input.verificationNote.trim();
  const { error: evErr } = await client.rpc("admin_record_provider_registration_evidence", {
    p_authorization_id: auth.id,
    p_registration_body: input.registrationBody.trim().toUpperCase(),
    p_registration_number: input.registrationNumber.trim(),
    p_permit_number: input.permitNumber.trim(),
    p_expires_at: input.expiresAt,
    p_evidence_reference: input.evidenceReference.trim(),
    p_reason: note,
  });
  if (evErr) return { ok: false, stage: "evidence", message: friendlyEvidenceError(evErr.message) };

  const { error: vErr } = await client.rpc("admin_set_provincial_authorization", {
    p_psw_profile_id: auth.psw_profile_id,
    p_province: "AB",
    p_provider_type: auth.provider_type.toUpperCase(),
    p_verification_status: "verified",
    p_registration_number: input.registrationNumber.trim(),
    p_expires_at: input.expiresAt,
    p_restrictions: null as unknown as string,
    p_job_eligible: true,
    p_reason: `Alberta registration verified manually: ${note}`,
  });
  if (vErr) return { ok: false, stage: "verify", message: friendlyEvidenceError(vErr.message) };
  return { ok: true, stage: "verified" };
};
