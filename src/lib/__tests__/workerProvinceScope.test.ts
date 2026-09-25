import { describe, it, expect } from "vitest";
import {
  workerVisibleInProvince,
  workerEligibleInProvince,
  workerAuthorizationsFor,
  authorizationStatusLabel,
  isAuthorizationRowActive,
  type WorkerAuthorizationIndex,
  type WorkerAuthorizationRow,
} from "@/lib/workerProvinceScope";

const row = (over: Partial<WorkerAuthorizationRow>): WorkerAuthorizationRow => ({
  psw_profile_id: "w1",
  province: "ON",
  provider_type: "PSW",
  verification_status: "verified",
  job_eligible: true,
  expires_at: null,
  ...over,
});

const buildIndex = (rows: WorkerAuthorizationRow[]): WorkerAuthorizationIndex => {
  const index: WorkerAuthorizationIndex = {
    provincesByWorker: new Map(),
    eligibleByProvince: new Map(),
    rowsByWorker: new Map(),
  };
  for (const r of rows) {
    if (!index.provincesByWorker.has(r.psw_profile_id)) index.provincesByWorker.set(r.psw_profile_id, new Set());
    index.provincesByWorker.get(r.psw_profile_id)!.add(r.province);
    if (!index.rowsByWorker.has(r.psw_profile_id)) index.rowsByWorker.set(r.psw_profile_id, []);
    index.rowsByWorker.get(r.psw_profile_id)!.push(r);
    if (isAuthorizationRowActive(r)) {
      if (!index.eligibleByProvince.has(r.province)) index.eligibleByProvince.set(r.province, new Set());
      index.eligibleByProvince.get(r.province)!.add(r.psw_profile_id);
    }
  }
  return index;
};

describe("worker province scope — review visibility (broad)", () => {
  it("shows a worker in their own profile province", () => {
    expect(workerVisibleInProvince({ id: "w1", province: "ON" }, "ON", buildIndex([]))).toBe(true);
  });

  it("shows a worker in a province where they hold a pending authorization", () => {
    const index = buildIndex([row({ province: "AB", provider_type: "HCA", verification_status: "pending", job_eligible: false })]);
    expect(workerVisibleInProvince({ id: "w1", province: "ON" }, "AB", index)).toBe(true);
  });

  it("hides a worker from a province they have no record in", () => {
    expect(workerVisibleInProvince({ id: "w1", province: "ON" }, "AB", buildIndex([]))).toBe(false);
  });
});

describe("worker province scope — job eligibility (strict)", () => {
  it("does NOT grant eligibility from a matching profile province alone", () => {
    // Profile says ON, but there is no verified authorization anywhere.
    expect(workerEligibleInProvince("w1", "ON", buildIndex([]))).toBe(false);
  });

  it("grants eligibility only with a verified, job-eligible authorization", () => {
    const index = buildIndex([row({})]);
    expect(workerEligibleInProvince("w1", "ON", index)).toBe(true);
  });

  it("rejects an Ontario-only worker for Alberta", () => {
    const index = buildIndex([row({})]);
    expect(workerEligibleInProvince("w1", "AB", index)).toBe(false);
  });

  it("rejects a verified-but-not-job-eligible authorization", () => {
    const index = buildIndex([row({ job_eligible: false })]);
    expect(workerEligibleInProvince("w1", "ON", index)).toBe(false);
  });

  it("rejects an expired authorization", () => {
    const index = buildIndex([row({ expires_at: "2020-01-01" })]);
    expect(workerEligibleInProvince("w1", "ON", index)).toBe(false);
  });

  it("supports a worker authorized in two provinces independently", () => {
    const index = buildIndex([
      row({}),
      row({ province: "AB", provider_type: "HCA", verification_status: "pending", job_eligible: false }),
    ]);
    expect(workerEligibleInProvince("w1", "ON", index)).toBe(true);
    expect(workerEligibleInProvince("w1", "AB", index)).toBe(false);
    expect(workerVisibleInProvince({ id: "w1", province: "ON" }, "AB", index)).toBe(true);
    expect(workerAuthorizationsFor("w1", index)).toHaveLength(2);
  });
});

describe("authorization status labels", () => {
  it("labels each review state separately per province", () => {
    expect(authorizationStatusLabel(row({}))).toBe("Verified");
    expect(authorizationStatusLabel(row({ verification_status: "pending", job_eligible: false }))).toBe("Awaiting verification");
    expect(authorizationStatusLabel(row({ job_eligible: false }))).toBe("Verified (not job-eligible)");
    expect(authorizationStatusLabel(row({ expires_at: "2020-01-01" }))).toBe("Expired");
    expect(authorizationStatusLabel(row({ verification_status: "rejected", job_eligible: false }))).toBe("Rejected");
  });
});
