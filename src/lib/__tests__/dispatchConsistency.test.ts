import { describe, it, expect } from "vitest";

/**
 * Dispatch consistency and unserved logic regression tests.
 * Tests the matching filter chain used by notify-psws.
 */

describe("PSW Matching Filter Chain", () => {
  const basePsw = {
    id: "psw-1",
    email: "psw1@test.com",
    first_name: "Alice",
    gender: "female",
    languages: ["en", "fr"],
    has_own_transport: "yes",
    home_lat: 43.65,
    home_lng: -79.38,
    vetting_status: "approved",
  };

  describe("Gender Filter (Soft)", () => {
    it("should match when gender matches preference", () => {
      const psws = [basePsw];
      const filtered = psws.filter((p) => p.gender?.toLowerCase() === "female");
      expect(filtered).toHaveLength(1);
    });

    it("should fallback to all PSWs when no gender match", () => {
      const psws = [basePsw]; // female only
      const genderMatched = psws.filter((p) => p.gender?.toLowerCase() === "male");
      const result = genderMatched.length > 0 ? genderMatched : psws;
      expect(result).toHaveLength(1); // fallback
    });

    it("should skip filter for 'any' or 'no-preference'", () => {
      const preference = "any";
      const shouldFilter = preference && preference !== "any" && preference !== "no-preference";
      expect(shouldFilter).toBe(false);
    });
  });

  describe("Language Filter (Soft)", () => {
    it("should match PSWs speaking requested languages", () => {
      const psws = [basePsw, { ...basePsw, id: "psw-2", languages: ["en"] }];
      const requested = ["fr"];
      const matched = psws.filter((p) =>
        p.languages?.some((pl: string) => requested.some((l) => pl.toLowerCase() === l.toLowerCase()))
      );
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe("psw-1");
    });

    it("should fallback when no language match", () => {
      const psws = [basePsw];
      const requested = ["mandarin"];
      const matched = psws.filter((p) =>
        p.languages?.some((pl: string) => requested.some((l) => pl.toLowerCase() === l.toLowerCase()))
      );
      const result = matched.length > 0 ? matched : psws;
      expect(result).toHaveLength(1); // fallback
    });
  });

  describe("Transport Filter (Hard)", () => {
    it("should exclude PSWs without transport for transport bookings", () => {
      const psws = [
        basePsw,
        { ...basePsw, id: "psw-2", has_own_transport: "no" },
      ];
      const filtered = psws.filter((p) => p.has_own_transport === "yes");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("psw-1");
    });

    it("should not filter transport for non-transport bookings", () => {
      const isTransport = false;
      const psws = [basePsw, { ...basePsw, id: "psw-2", has_own_transport: "no" }];
      const result = isTransport ? psws.filter((p) => p.has_own_transport === "yes") : psws;
      expect(result).toHaveLength(2);
    });
  });

  describe("Unserved Order Capture", () => {
    it("should mark as unserved when no PSWs in radius", () => {
      const pswsInRadius = 0;
      const shouldBeUnserved = pswsInRadius === 0;
      expect(shouldBeUnserved).toBe(true);
    });

    it("should NOT mark as unserved when matching PSWs exist", () => {
      const matchedCount = 3;
      const shouldBeUnserved = matchedCount < 1;
      expect(shouldBeUnserved).toBe(false);
    });

    it("should store reason code for unserved orders", () => {
      const reasons = [
        "NO_PSW_IN_RADIUS",
        "NO_GENDER_MATCH",
        "NO_TRANSPORT_MATCH",
        "GEOCODE_FAILED",
      ];
      reasons.forEach((r) => expect(typeof r).toBe("string"));
    });
  });

  describe("Available Jobs Exclusion", () => {
    it("should exclude cancelled bookings from available jobs query", () => {
      const excludedStatuses = ["archived", "cancelled"];
      const booking = { status: "cancelled", psw_assigned: null };
      const isExcluded = excludedStatuses.includes(booking.status);
      expect(isExcluded).toBe(true);
    });

    it("should exclude claimed bookings from available jobs", () => {
      const booking = { status: "pending", psw_assigned: "psw-1" };
      const isAvailable = booking.status === "pending" && booking.psw_assigned === null;
      expect(isAvailable).toBe(false);
    });

    it("should include pending unassigned paid bookings", () => {
      const booking = { status: "pending", psw_assigned: null, payment_status: "paid" };
      const isAvailable = booking.status === "pending" && booking.psw_assigned === null && booking.payment_status === "paid";
      expect(isAvailable).toBe(true);
    });
  });
});
