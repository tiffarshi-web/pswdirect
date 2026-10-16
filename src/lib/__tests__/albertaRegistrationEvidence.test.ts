import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  validateAlbertaEvidence,
  submitAlbertaEvidence,
  friendlyEvidenceError,
  type AlbertaEvidenceInput,
} from "@/lib/albertaRegistrationEvidence";

const NOW = new Date(2026, 9, 16);
const hca: AlbertaEvidenceInput = {
  providerType: "HCA",
  registrationBody: "CLHA",
  registrationNumber: "HCA-123",
  permitNumber: "P-9",
  expiresAt: "2027-03-31",
  evidenceReference: "CLHA public register search",
  verificationNote: "Checked register, name and permit match.",
};

describe("Alberta registration evidence validation", () => {
  it("accepts complete HCA evidence", () => {
    expect(validateAlbertaEvidence(hca, NOW)).toEqual({});
  });
  it("HCA requires CLHA and a practice permit", () => {
    expect(validateAlbertaEvidence({ ...hca, permitNumber: "" }, NOW).permitNumber).toBeDefined();
    expect(validateAlbertaEvidence({ ...hca, registrationBody: "CRNA" }, NOW).registrationBody).toBeDefined();
  });
  it("LPN/RN need their own body; permit optional", () => {
    expect(validateAlbertaEvidence({ ...hca, providerType: "LPN", registrationBody: "CLPNA", permitNumber: "" }, NOW)).toEqual({});
    expect(validateAlbertaEvidence({ ...hca, providerType: "RN", registrationBody: "CRNA", permitNumber: "" }, NOW)).toEqual({});
    expect(validateAlbertaEvidence({ ...hca, providerType: "RN", registrationBody: "CLHA" }, NOW).registrationBody).toBeDefined();
  });
  it("expiry must be strictly in the future", () => {
    expect(validateAlbertaEvidence({ ...hca, expiresAt: "2026-10-16" }, NOW).expiresAt).toBeDefined();
    expect(validateAlbertaEvidence({ ...hca, expiresAt: "2026-10-01" }, NOW).expiresAt).toBeDefined();
    expect(validateAlbertaEvidence({ ...hca, expiresAt: "" }, NOW).expiresAt).toBeDefined();
  });
  it("requires registration number, evidence source and verification note", () => {
    const e = validateAlbertaEvidence({ ...hca, registrationNumber: " ", evidenceReference: "", verificationNote: "ok" }, NOW);
    expect(Object.keys(e).sort()).toEqual(["evidenceReference", "registrationNumber", "verificationNote"]);
  });
  it("PSW and unknown types cannot be authorized in Alberta", () => {
    expect(validateAlbertaEvidence({ ...hca, providerType: "PSW" }, NOW).providerType).toBeDefined();
  });
});

describe("Alberta evidence submission", () => {
  const auth = { id: "a1", psw_profile_id: "p1", provider_type: "HCA" };

  it("records evidence then verifies with the same number and expiry", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const res = await submitAlbertaEvidence(auth, { ...hca, expiresAt: "2099-01-01" }, { rpc } as never);
    expect(res.ok).toBe(true);
    expect(rpc.mock.calls[0][0]).toBe("admin_record_provider_registration_evidence");
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_authorization_id: "a1", p_registration_body: "CLHA", p_permit_number: "P-9" });
    expect(rpc.mock.calls[1][0]).toBe("admin_set_provincial_authorization");
    expect(rpc.mock.calls[1][1]).toMatchObject({
      p_province: "AB", p_verification_status: "verified", p_job_eligible: true,
      p_registration_number: "HCA-123", p_expires_at: "2099-01-01",
    });
  });

  it("never calls the backend when validation fails", async () => {
    const rpc = vi.fn();
    const res = await submitAlbertaEvidence(auth, { ...hca, permitNumber: "" }, { rpc } as never);
    expect(res.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not verify when evidence recording fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: "not_authorized" } });
    const res = await submitAlbertaEvidence(auth, { ...hca, expiresAt: "2099-01-01" }, { rpc } as never);
    expect(res).toMatchObject({ ok: false, stage: "evidence" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("maps database guard errors to plain messages", () => {
    expect(friendlyEvidenceError("ab_hca_requires_clha_registration_and_practice_permit")).toMatch(/CLHA/);
    expect(friendlyEvidenceError("weird")).toMatch(/Nothing was approved/);
  });
});

describe("Ontario approval unchanged", () => {
  it("Ontario approval still grants verified job-eligible authorization directly", () => {
    const src = readFileSync("src/components/admin/PendingPSWSection.tsx", "utf8");
    expect(src).toContain('const needsEvidence = authProvince !== "ON";');
    expect(src).toContain('p_verification_status: needsEvidence ? "pending" : "verified"');
  });
  it("client push keeps PSW wording for Ontario", () => {
    const src = readFileSync("supabase/functions/send-client-push/index.ts", "utf8");
    expect(src).toContain('booking.service_province === "AB" ? "caregiver" : "PSW"');
  });
});
