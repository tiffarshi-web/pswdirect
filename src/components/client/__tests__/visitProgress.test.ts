import { describe, it, expect } from "vitest";
import { deriveVisitStages } from "../VisitProgressTimeline";

const base: any = { status: "pending", psw_assigned: null, service_province: "ON" };
const done = (b: any) => deriveVisitStages(b).filter((s) => s.done).map((s) => s.key);

describe("client visit progress follows worker lifecycle", () => {
  it("booked → accepted → check-in → sign-out → care sheet", () => {
    expect(done(base)).toEqual(["confirmed"]);
    const accepted = { ...base, status: "active", psw_assigned: "x", psw_first_name: "Sam" };
    expect(done(accepted)).toEqual(["confirmed", "searching", "assigned"]);
    const inVisit = { ...accepted, checked_in_at: "t", status: "in-progress" };
    expect(done(inVisit)).toContain("checked_in");
    const finished = { ...inVisit, signed_out_at: "t", status: "completed" };
    expect(done(finished)).toContain("completed");
    expect(done(finished)).not.toContain("report");
    expect(done({ ...finished, care_sheet_submitted_at: "t" })).toContain("report");
  });
  it("uses PSW in Ontario and HCA in Alberta", () => {
    expect(deriveVisitStages(base)[1].label).toContain("PSW");
    expect(deriveVisitStages({ ...base, service_province: "AB" })[1].label).toContain("HCA");
  });
  it("cancelled shows only cancelled", () => {
    expect(done({ ...base, status: "cancelled" })).toEqual(["cancelled"]);
  });
});
